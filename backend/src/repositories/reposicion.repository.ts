import { query, queryOne } from '../config/database.js';
import { BaseRepository, type FindOptions } from './base.repository.js';
import { toCamelCase, type PaginatedResult } from '../types/index.js';
import type { Reposicion, ReposicionConRelaciones, UpdateReposicionDto } from '@hofra/shared';

export class ReposicionRepository extends BaseRepository<Reposicion> {
  constructor() {
    super('reposiciones', 'fecha_reposicion');
  }

  async create(data: {
    articuloId: string;
    proveedorId: string;
    cantidad: number;
    observaciones?: string | null;
    fechaReposicion?: Date;
    costoReposicion?: number | null;
    valorDolarOficial?: number | null;
    fechaVencimiento?: Date | null;
    lotePartida?: string | null;
    linkCompra?: string | null;
    lugarCompra?: string | null;
    createdBy?: string;
  }): Promise<Reposicion> {
    const costoReposicionDolares =
      data.costoReposicion && data.valorDolarOficial
        ? parseFloat((data.costoReposicion / data.valorDolarOficial).toFixed(2))
        : null;

    const row = await queryOne<Record<string, unknown>>(
      `INSERT INTO reposiciones (
        articulo_id, proveedor_id, cantidad, observaciones, fecha_reposicion,
        costo_reposicion, valor_dolar_oficial, costo_reposicion_dolares,
        fecha_vencimiento, lote_partida, link_compra, lugar_compra, created_by
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [
        data.articuloId,
        data.proveedorId,
        data.cantidad,
        data.observaciones || null,
        data.fechaReposicion || new Date(),
        data.costoReposicion || null,
        data.valorDolarOficial || null,
        costoReposicionDolares,
        data.fechaVencimiento || null,
        data.lotePartida || null,
        data.linkCompra || null,
        data.lugarCompra || null,
        data.createdBy || null,
      ]
    );

    if (!row) throw new Error('Failed to create reposicion');

    return toCamelCase<Reposicion>(row);
  }

  async update(id: string, data: UpdateReposicionDto, updatedBy?: string): Promise<Reposicion> {
    // Recalcular costo en dolares si cambian los valores
    let costoReposicionDolares: number | null = null;

    if (data.costoReposicion !== undefined || data.valorDolarOficial !== undefined) {
      // Obtener valores actuales si no se proporcionan
      const current = await this.findById(id);
      const costo = data.costoReposicion ?? current?.costoReposicion;
      const dolar = data.valorDolarOficial ?? current?.valorDolarOficial;

      if (costo && dolar) {
        costoReposicionDolares = parseFloat((costo / dolar).toFixed(2));
      }
    }

    const setClauses: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (data.proveedorId !== undefined) {
      setClauses.push(`proveedor_id = $${paramIndex++}`);
      values.push(data.proveedorId);
    }
    if (data.costoReposicion !== undefined) {
      setClauses.push(`costo_reposicion = $${paramIndex++}`);
      values.push(data.costoReposicion);
    }
    if (data.valorDolarOficial !== undefined) {
      setClauses.push(`valor_dolar_oficial = $${paramIndex++}`);
      values.push(data.valorDolarOficial);
    }
    if (costoReposicionDolares !== null) {
      setClauses.push(`costo_reposicion_dolares = $${paramIndex++}`);
      values.push(costoReposicionDolares);
    }
    if (data.observaciones !== undefined) {
      setClauses.push(`observaciones = $${paramIndex++}`);
      values.push(data.observaciones);
    }
    if (data.fechaVencimiento !== undefined) {
      setClauses.push(`fecha_vencimiento = $${paramIndex++}`);
      values.push(data.fechaVencimiento);
    }
    if (data.lotePartida !== undefined) {
      setClauses.push(`lote_partida = $${paramIndex++}`);
      values.push(data.lotePartida);
    }
    if (data.linkCompra !== undefined) {
      setClauses.push(`link_compra = $${paramIndex++}`);
      values.push(data.linkCompra);
    }
    if (data.lugarCompra !== undefined) {
      setClauses.push(`lugar_compra = $${paramIndex++}`);
      values.push(data.lugarCompra);
    }

    setClauses.push(`updated_at = NOW()`);
    if (updatedBy) {
      setClauses.push(`updated_by = $${paramIndex++}`);
      values.push(updatedBy);
    }

    values.push(id);

    const row = await queryOne<Record<string, unknown>>(
      `UPDATE reposiciones SET ${setClauses.join(', ')}
       WHERE id = $${paramIndex} AND deleted_at IS NULL
       RETURNING *`,
      values
    );

    if (!row) throw new Error('Reposicion not found');

    return toCamelCase<Reposicion>(row);
  }

  async cancel(id: string, updatedBy?: string): Promise<Reposicion> {
    // Al cancelar, reseteamos stock_disponible a 0
    const row = await queryOne<Record<string, unknown>>(
      `UPDATE reposiciones
       SET estado = 'cancelada', stock_disponible = 0, updated_at = NOW(), updated_by = $2
       WHERE id = $1 AND deleted_at IS NULL AND estado != 'cancelada'
       RETURNING *`,
      [id, updatedBy || null]
    );

    if (!row) throw new Error('Reposicion not found or already cancelled');

    return toCamelCase<Reposicion>(row);
  }

  async confirm(id: string, updatedBy?: string): Promise<Reposicion> {
    // Al confirmar, inicializamos stock_disponible = cantidad
    const row = await queryOne<Record<string, unknown>>(
      `UPDATE reposiciones
       SET estado = 'confirmada', stock_disponible = cantidad, updated_at = NOW(), updated_by = $2
       WHERE id = $1 AND deleted_at IS NULL AND estado = 'en_curso'
       RETURNING *`,
      [id, updatedBy || null]
    );

    if (!row) throw new Error('Reposicion not found or not in en_curso state');

    return toCamelCase<Reposicion>(row);
  }

  async findByIdWithRelations(id: string): Promise<ReposicionConRelaciones | null> {
    const row = await queryOne<Record<string, unknown>>(
      `SELECT r.*,
              a.id as articulo_id, a.codigo as articulo_codigo, a.nombre as articulo_nombre,
              a.stock as articulo_stock, a.stock_minimo as articulo_stock_minimo,
              a.unidad as articulo_unidad, a.imagen_url as articulo_imagen_url,
              p.id as prov_id, p.razon_social as proveedor_razon_social,
              p.nombre_fantasia as proveedor_nombre_fantasia, p.cuit as proveedor_cuit
       FROM reposiciones r
       INNER JOIN articulos a ON a.id = r.articulo_id
       INNER JOIN proveedores p ON p.id = r.proveedor_id
       WHERE r.id = $1 AND r.deleted_at IS NULL`,
      [id]
    );

    if (!row) return null;

    return this.mapToReposicionConRelaciones(row);
  }

  async findAllWithRelations(options: FindOptions & { busqueda?: string } = {}): Promise<PaginatedResult<ReposicionConRelaciones>> {
    const { page = 1, limit = 20, sortOrder = 'desc', busqueda } = options;
    const offset = (page - 1) * limit;

    let whereClause = 'r.deleted_at IS NULL';
    const params: unknown[] = [];
    let paramIndex = 1;

    if (busqueda) {
      const searchTerm = `%${busqueda}%`;
      whereClause += ` AND (
        a.codigo ILIKE $${paramIndex} OR
        a.nombre ILIKE $${paramIndex} OR
        a.descripcion ILIKE $${paramIndex}
      )`;
      params.push(searchTerm);
      paramIndex++;
    }

    params.push(limit, offset);

    const [rows, countResult] = await Promise.all([
      query<Record<string, unknown>>(
        `SELECT r.*,
                a.id as articulo_id, a.codigo as articulo_codigo, a.nombre as articulo_nombre,
                a.stock as articulo_stock, a.stock_minimo as articulo_stock_minimo,
                a.unidad as articulo_unidad, a.imagen_url as articulo_imagen_url,
                p.id as prov_id, p.razon_social as proveedor_razon_social,
                p.nombre_fantasia as proveedor_nombre_fantasia, p.cuit as proveedor_cuit
         FROM reposiciones r
         INNER JOIN articulos a ON a.id = r.articulo_id
         INNER JOIN proveedores p ON p.id = r.proveedor_id
         WHERE ${whereClause}
         ORDER BY r.fecha_reposicion ${sortOrder.toUpperCase()}
         LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
        params
      ),
      queryOne<{ count: string }>(
        `SELECT COUNT(*) as count
         FROM reposiciones r
         INNER JOIN articulos a ON a.id = r.articulo_id
         WHERE ${whereClause}`,
        busqueda ? [`%${busqueda}%`] : []
      ),
    ]);

    const total = parseInt(countResult?.count || '0', 10);

    return {
      data: rows.map((row) => this.mapToReposicionConRelaciones(row)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findByArticulo(articuloId: string, limit: number = 10): Promise<ReposicionConRelaciones[]> {
    const rows = await query<Record<string, unknown>>(
      `SELECT r.*,
              a.id as articulo_id, a.codigo as articulo_codigo, a.nombre as articulo_nombre,
              a.stock as articulo_stock, a.stock_minimo as articulo_stock_minimo,
              a.unidad as articulo_unidad, a.imagen_url as articulo_imagen_url,
              p.id as prov_id, p.razon_social as proveedor_razon_social,
              p.nombre_fantasia as proveedor_nombre_fantasia, p.cuit as proveedor_cuit
       FROM reposiciones r
       INNER JOIN articulos a ON a.id = r.articulo_id
       INNER JOIN proveedores p ON p.id = r.proveedor_id
       WHERE r.articulo_id = $1 AND r.deleted_at IS NULL
       ORDER BY r.fecha_reposicion DESC
       LIMIT $2`,
      [articuloId, limit]
    );

    return rows.map((row) => this.mapToReposicionConRelaciones(row));
  }

  async findByProveedor(proveedorId: string, options: FindOptions = {}): Promise<PaginatedResult<ReposicionConRelaciones>> {
    const { page = 1, limit = 20 } = options;
    const offset = (page - 1) * limit;

    const [rows, countResult] = await Promise.all([
      query<Record<string, unknown>>(
        `SELECT r.*,
                a.id as articulo_id, a.codigo as articulo_codigo, a.nombre as articulo_nombre,
                a.stock as articulo_stock, a.stock_minimo as articulo_stock_minimo,
                a.unidad as articulo_unidad, a.imagen_url as articulo_imagen_url,
                p.id as prov_id, p.razon_social as proveedor_razon_social,
                p.nombre_fantasia as proveedor_nombre_fantasia, p.cuit as proveedor_cuit
         FROM reposiciones r
         INNER JOIN articulos a ON a.id = r.articulo_id
         INNER JOIN proveedores p ON p.id = r.proveedor_id
         WHERE r.proveedor_id = $1 AND r.deleted_at IS NULL
         ORDER BY r.fecha_reposicion DESC
         LIMIT $2 OFFSET $3`,
        [proveedorId, limit, offset]
      ),
      queryOne<{ count: string }>(
        `SELECT COUNT(*) as count FROM reposiciones WHERE proveedor_id = $1 AND deleted_at IS NULL`,
        [proveedorId]
      ),
    ]);

    const total = parseInt(countResult?.count || '0', 10);

    return {
      data: rows.map((row) => this.mapToReposicionConRelaciones(row)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async countToday(): Promise<number> {
    const result = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM reposiciones
       WHERE deleted_at IS NULL AND estado = 'confirmada'
       AND fecha_reposicion >= CURRENT_DATE
       AND fecha_reposicion < CURRENT_DATE + INTERVAL '1 day'`
    );

    return parseInt(result?.count || '0', 10);
  }

  async countThisMonth(): Promise<number> {
    const result = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM reposiciones
       WHERE deleted_at IS NULL AND estado = 'confirmada'
       AND fecha_reposicion >= DATE_TRUNC('month', CURRENT_DATE)
       AND fecha_reposicion < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'`
    );

    return parseInt(result?.count || '0', 10);
  }

  private mapToReposicionConRelaciones(row: Record<string, unknown>): ReposicionConRelaciones {
    const reposicion = toCamelCase<Reposicion>({
      id: row.id,
      articulo_id: row.articulo_id,
      proveedor_id: row.proveedor_id,
      cantidad: row.cantidad,
      stock_disponible: row.stock_disponible,
      observaciones: row.observaciones,
      fecha_reposicion: row.fecha_reposicion,
      costo_reposicion: row.costo_reposicion,
      valor_dolar_oficial: row.valor_dolar_oficial,
      costo_reposicion_dolares: row.costo_reposicion_dolares,
      fecha_vencimiento: row.fecha_vencimiento,
      lote_partida: row.lote_partida,
      link_compra: row.link_compra,
      lugar_compra: row.lugar_compra,
      estado: row.estado,
      created_at: row.created_at,
      updated_at: row.updated_at,
      deleted_at: row.deleted_at,
      created_by: row.created_by,
      updated_by: row.updated_by,
    });

    return {
      ...reposicion,
      articulo: {
        id: row.articulo_id as string,
        codigo: row.articulo_codigo as string,
        nombre: row.articulo_nombre as string,
        descripcion: null,
        rubroId: '',
        proveedorId: null,
        stock: (row.articulo_stock as number) || 0,
        stockMinimo: (row.articulo_stock_minimo as number) || 0,
        unidad: (row.articulo_unidad as string) || 'Unidad',
        presentacion: null,
        marca: null,
        sku: null,
        etm: null,
        stockActual: (row.articulo_stock as number) || 0,
        numeroCotizacionInterna: null,
        ubicacion: null,
        imagenUrl: (row.articulo_imagen_url as string) || null,
        imagenPublicId: null,
        costoInicialEstimado: null,
        valorDolarCostoInicial: null,
        costoInicialEstimadoUsd: null,
        activo: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        createdBy: null,
        updatedBy: null,
      },
      proveedor: {
        id: row.prov_id as string,
        razonSocial: row.proveedor_razon_social as string,
        nombreFantasia: (row.proveedor_nombre_fantasia as string) || null,
        cuit: row.proveedor_cuit as string | null,
        direccion: null,
        telefono: null,
        email: null,
        contacto: null,
        notas: null,
        activo: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        createdBy: null,
        updatedBy: null,
      },
    };
  }

  // ============================================
  // MÉTODOS PARA VALUACIÓN Y FIFO
  // ============================================

  /**
   * Obtiene reposiciones con stock disponible para un artículo, ordenadas por FIFO
   */
  async findWithStockDisponible(articuloId: string): Promise<{
    id: string;
    stockDisponible: number;
    costoReposicion: number | null;
    costoReposicionDolares: number | null;
    fechaReposicion: Date;
    lotePartida: string | null;
    proveedorNombre: string;
  }[]> {
    const rows = await query<Record<string, unknown>>(
      `SELECT r.id, r.stock_disponible, r.costo_reposicion, r.costo_reposicion_dolares,
              r.fecha_reposicion, r.lote_partida, p.razon_social as proveedor_nombre
       FROM reposiciones r
       INNER JOIN proveedores p ON p.id = r.proveedor_id
       WHERE r.articulo_id = $1
         AND r.deleted_at IS NULL
         AND r.estado = 'confirmada'
         AND r.stock_disponible > 0
       ORDER BY r.fecha_reposicion ASC`,
      [articuloId]
    );

    return rows.map(row => ({
      id: row.id as string,
      stockDisponible: row.stock_disponible as number,
      costoReposicion: row.costo_reposicion as number | null,
      costoReposicionDolares: row.costo_reposicion_dolares as number | null,
      fechaReposicion: new Date(row.fecha_reposicion as string),
      lotePartida: row.lote_partida as string | null,
      proveedorNombre: row.proveedor_nombre as string,
    }));
  }

  /**
   * Descuenta stock de reposiciones usando FIFO
   * Retorna el detalle de cómo se descontó de cada reposición
   */
  async descontarStockFIFO(
    articuloId: string,
    cantidad: number,
    updatedBy?: string
  ): Promise<{ reposicionId: string; cantidadDescontada: number }[]> {
    const reposiciones = await this.findWithStockDisponible(articuloId);
    const descuentos: { reposicionId: string; cantidadDescontada: number }[] = [];
    let restante = cantidad;

    for (const repo of reposiciones) {
      if (restante <= 0) break;

      const descontar = Math.min(restante, repo.stockDisponible);

      await queryOne(
        `UPDATE reposiciones
         SET stock_disponible = stock_disponible - $1, updated_at = NOW(), updated_by = $3
         WHERE id = $2`,
        [descontar, repo.id, updatedBy || null]
      );

      descuentos.push({ reposicionId: repo.id, cantidadDescontada: descontar });
      restante -= descontar;
    }

    return descuentos;
  }

  /**
   * Obtiene las capas de stock para calcular valuación
   */
  async getCapasStock(articuloId: string): Promise<{
    reposicionId: string;
    fechaReposicion: Date;
    stockDisponible: number;
    costoUnitario: number;
    costoUnitarioDolares: number | null;
    lotePartida: string | null;
    proveedorNombre: string;
  }[]> {
    const rows = await query<Record<string, unknown>>(
      `SELECT r.id as reposicion_id, r.fecha_reposicion, r.stock_disponible,
              r.costo_reposicion as costo_unitario, r.costo_reposicion_dolares as costo_unitario_dolares,
              r.lote_partida, p.razon_social as proveedor_nombre
       FROM reposiciones r
       INNER JOIN proveedores p ON p.id = r.proveedor_id
       WHERE r.articulo_id = $1
         AND r.deleted_at IS NULL
         AND r.estado = 'confirmada'
         AND r.stock_disponible > 0
       ORDER BY r.fecha_reposicion ASC`,
      [articuloId]
    );

    return rows.map(row => ({
      reposicionId: row.reposicion_id as string,
      fechaReposicion: new Date(row.fecha_reposicion as string),
      stockDisponible: row.stock_disponible as number,
      costoUnitario: (row.costo_unitario as number) || 0,
      costoUnitarioDolares: row.costo_unitario_dolares as number | null,
      lotePartida: row.lote_partida as string | null,
      proveedorNombre: row.proveedor_nombre as string,
    }));
  }

  /**
   * Obtiene el total de stock disponible en reposiciones para un artículo
   */
  async getTotalStockDisponible(articuloId: string): Promise<number> {
    const result = await queryOne<{ total: string }>(
      `SELECT COALESCE(SUM(stock_disponible), 0) as total
       FROM reposiciones
       WHERE articulo_id = $1
         AND deleted_at IS NULL
         AND estado = 'confirmada'`,
      [articuloId]
    );

    return parseInt(result?.total || '0', 10);
  }
}

export const reposicionRepository = new ReposicionRepository();

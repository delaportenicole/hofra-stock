import { query, queryOne, execute } from '../config/database.js';
import { BaseRepository, type FindOptions } from './base.repository.js';
import { toCamelCase, type PaginatedResult } from '../types/index.js';
import type { Articulo, ArticuloConRelaciones, Rubro, Proveedor, ArticuloFiltros } from '@hofra/shared';

export class ArticuloRepository extends BaseRepository<Articulo> {
  constructor() {
    super('articulos', 'nombre');
  }

  async findByCodigo(codigo: string): Promise<Articulo | null> {
    const row = await queryOne<Record<string, unknown>>(
      `SELECT * FROM articulos WHERE codigo = $1 AND deleted_at IS NULL`,
      [codigo]
    );

    return row ? toCamelCase<Articulo>(row) : null;
  }

  async findByIdWithRelations(id: string): Promise<ArticuloConRelaciones | null> {
    const row = await queryOne<Record<string, unknown>>(
      `SELECT a.*,
              r.id as rubro_id, r.nombre as rubro_nombre, r.descripcion as rubro_descripcion, r.prefijo as rubro_prefijo, r.activo as rubro_activo,
              p.id as proveedor_id, p.razon_social as proveedor_razon_social, p.cuit as proveedor_cuit
       FROM articulos a
       LEFT JOIN rubros r ON r.id = a.rubro_id
       LEFT JOIN proveedores p ON p.id = a.proveedor_id
       WHERE a.id = $1 AND a.deleted_at IS NULL`,
      [id]
    );

    if (!row) return null;

    return this.mapToArticuloConRelaciones(row);
  }

  async create(data: {
    codigo: string;
    nombre: string;
    rubroId: string;
    proveedorId?: string | null;
    stockMinimo?: number;
    presentacion?: string | null;
    marca?: string | null;
    sku?: string | null;
    etm?: string | null;
    stockActual?: number;
    numeroCotizacionInterna?: number | null;
    ubicacion?: string | null;
    url?: string | null;
    costoInicialEstimado?: number | null;
    valorDolarCostoInicial?: number | null;
    costoInicialEstimadoUsd?: number | null;
    createdBy?: string;
  }): Promise<Articulo> {
    const stockValue = data.stockActual || 0;
    // Use provided USD cost, or auto-calculate if both ARS cost and dollar value are provided
    const costoInicialEstimadoUsd =
      data.costoInicialEstimadoUsd ??
      (data.costoInicialEstimado && data.valorDolarCostoInicial
        ? data.costoInicialEstimado / data.valorDolarCostoInicial
        : null);

    const row = await queryOne<Record<string, unknown>>(
      `INSERT INTO articulos (codigo, nombre, rubro_id, proveedor_id, stock_minimo, presentacion, marca, sku, etm, stock, stock_actual, numero_cotizacion_interna, ubicacion, url, costo_inicial_estimado, valor_dolar_costo_inicial, costo_inicial_estimado_usd, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
       RETURNING *`,
      [
        data.codigo,
        data.nombre,
        data.rubroId,
        data.proveedorId || null,
        data.stockMinimo || 0,
        data.presentacion || null,
        data.marca || null,
        data.sku || null,
        data.etm || null,
        stockValue,
        stockValue,
        data.numeroCotizacionInterna || null,
        data.ubicacion || null,
        data.url || null,
        data.costoInicialEstimado || null,
        data.valorDolarCostoInicial || null,
        costoInicialEstimadoUsd,
        data.createdBy || null,
      ]
    );

    if (!row) throw new Error('Failed to create articulo');

    return toCamelCase<Articulo>(row);
  }

  async update(
    id: string,
    data: Partial<{
      codigo: string;
      nombre: string;
      rubroId: string;
      proveedorId: string | null;
      stockMinimo: number;
      presentacion: string | null;
      marca: string | null;
      sku: string | null;
      etm: string | null;
      stockActual: number;
      numeroCotizacionInterna: number | null;
      ubicacion: string | null;
      url: string | null;
      costoInicialEstimado: number | null;
      valorDolarCostoInicial: number | null;
      activo: boolean;
    }>,
    updatedBy?: string
  ): Promise<Articulo | null> {
    const sets: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (data.codigo !== undefined) {
      sets.push(`codigo = $${paramIndex++}`);
      values.push(data.codigo);
    }
    if (data.nombre !== undefined) {
      sets.push(`nombre = $${paramIndex++}`);
      values.push(data.nombre);
    }
    if (data.rubroId !== undefined) {
      sets.push(`rubro_id = $${paramIndex++}`);
      values.push(data.rubroId);
    }
    if (data.proveedorId !== undefined) {
      sets.push(`proveedor_id = $${paramIndex++}`);
      values.push(data.proveedorId);
    }
    if (data.stockMinimo !== undefined) {
      sets.push(`stock_minimo = $${paramIndex++}`);
      values.push(data.stockMinimo);
    }
    if (data.presentacion !== undefined) {
      sets.push(`presentacion = $${paramIndex++}`);
      values.push(data.presentacion);
    }
    if (data.marca !== undefined) {
      sets.push(`marca = $${paramIndex++}`);
      values.push(data.marca);
    }
    if (data.sku !== undefined) {
      sets.push(`sku = $${paramIndex++}`);
      values.push(data.sku);
    }
    if (data.etm !== undefined) {
      sets.push(`etm = $${paramIndex++}`);
      values.push(data.etm);
    }
    if (data.stockActual !== undefined) {
      sets.push(`stock = $${paramIndex++}`);
      values.push(data.stockActual);
      sets.push(`stock_actual = $${paramIndex++}`);
      values.push(data.stockActual);
    }
    if (data.numeroCotizacionInterna !== undefined) {
      sets.push(`numero_cotizacion_interna = $${paramIndex++}`);
      values.push(data.numeroCotizacionInterna);
    }
    if (data.ubicacion !== undefined) {
      sets.push(`ubicacion = $${paramIndex++}`);
      values.push(data.ubicacion);
    }
    if (data.url !== undefined) {
      sets.push(`url = $${paramIndex++}`);
      values.push(data.url);
    }
    if (data.costoInicialEstimado !== undefined) {
      sets.push(`costo_inicial_estimado = $${paramIndex++}`);
      values.push(data.costoInicialEstimado);
    }
    if (data.valorDolarCostoInicial !== undefined) {
      sets.push(`valor_dolar_costo_inicial = $${paramIndex++}`);
      values.push(data.valorDolarCostoInicial);
      // Auto-calculate USD cost if both values are present
      if (data.costoInicialEstimado && data.valorDolarCostoInicial) {
        sets.push(`costo_inicial_estimado_usd = $${paramIndex++}`);
        values.push(data.costoInicialEstimado / data.valorDolarCostoInicial);
      }
    }
    if (data.activo !== undefined) {
      sets.push(`activo = $${paramIndex++}`);
      values.push(data.activo);
    }

    sets.push(`updated_by = $${paramIndex++}`);
    values.push(updatedBy || null);

    values.push(id);

    const row = await queryOne<Record<string, unknown>>(
      `UPDATE articulos SET ${sets.join(', ')}
       WHERE id = $${paramIndex} AND deleted_at IS NULL
       RETURNING *`,
      values
    );

    return row ? toCamelCase<Articulo>(row) : null;
  }

  async updateImage(
    id: string,
    imagenUrl: string | null,
    imagenPublicId: string | null,
    updatedBy?: string
  ): Promise<boolean> {
    const rowCount = await execute(
      `UPDATE articulos SET imagen_url = $1, imagen_public_id = $2, updated_by = $3
       WHERE id = $4 AND deleted_at IS NULL`,
      [imagenUrl, imagenPublicId, updatedBy || null, id]
    );

    return rowCount > 0;
  }

  async updateStock(id: string, cantidad: number, updatedBy?: string): Promise<boolean> {
    const rowCount = await execute(
      `UPDATE articulos SET stock = stock + $1, stock_actual = stock_actual + $1, updated_by = $2
       WHERE id = $3 AND deleted_at IS NULL`,
      [cantidad, updatedBy || null, id]
    );

    return rowCount > 0;
  }

  async getStock(id: string): Promise<number> {
    const row = await queryOne<{ stock: number }>(
      `SELECT stock FROM articulos WHERE id = $1 AND deleted_at IS NULL`,
      [id]
    );

    return row?.stock ?? 0;
  }

  async getMaxCodigoByPrefix(prefix: string): Promise<number> {
    // Busca el número más alto para códigos que empiecen con el prefijo
    // El código tiene formato: PREFIJO + NUMERO (ej: E1, ELE1, E25, ELE100)
    const row = await queryOne<{ max_num: string | null }>(
      `SELECT MAX(
        CAST(
          REGEXP_REPLACE(codigo, $1, '') AS INTEGER
        )
      ) as max_num
      FROM articulos
      WHERE codigo ~ $2
      AND deleted_at IS NULL`,
      [`^${prefix}`, `^${prefix}[0-9]+$`]
    );

    return row?.max_num ? parseInt(row.max_num, 10) : 0;
  }

  async search(
    filtros: ArticuloFiltros,
    options: FindOptions = {}
  ): Promise<PaginatedResult<ArticuloConRelaciones>> {
    const { page = 1, limit = 20, sortBy = 'nombre', sortOrder = 'asc' } = options;
    const offset = (page - 1) * limit;

    const conditions: string[] = ['a.deleted_at IS NULL'];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (filtros.busqueda) {
      conditions.push(
        `(a.nombre ILIKE $${paramIndex} OR a.codigo ILIKE $${paramIndex} OR a.sku ILIKE $${paramIndex} OR a.etm ILIKE $${paramIndex})`
      );
      values.push(`%${filtros.busqueda}%`);
      paramIndex++;
    }

    if (filtros.rubroId) {
      conditions.push(`a.rubro_id = $${paramIndex++}`);
      values.push(filtros.rubroId);
    }

    if (filtros.proveedorId) {
      conditions.push(`a.proveedor_id = $${paramIndex++}`);
      values.push(filtros.proveedorId);
    }

    if (filtros.stockBajo) {
      conditions.push(`a.stock <= a.stock_minimo`);
    }

    if (filtros.activo !== undefined) {
      conditions.push(`a.activo = $${paramIndex++}`);
      values.push(filtros.activo);
    }

    const whereClause = conditions.join(' AND ');
    const orderColumn = sortBy === 'rubro' ? 'r.nombre' : `a.${sortBy}`;

    const [rows, countResult] = await Promise.all([
      query<Record<string, unknown>>(
        `SELECT a.*,
                r.id as rubro_id, r.nombre as rubro_nombre, r.descripcion as rubro_descripcion, r.prefijo as rubro_prefijo, r.activo as rubro_activo,
                p.id as proveedor_id, p.razon_social as proveedor_razon_social, p.cuit as proveedor_cuit
         FROM articulos a
         LEFT JOIN rubros r ON r.id = a.rubro_id
         LEFT JOIN proveedores p ON p.id = a.proveedor_id
         WHERE ${whereClause}
         ORDER BY ${orderColumn} ${sortOrder.toUpperCase()}
         LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        [...values, limit, offset]
      ),
      queryOne<{ count: string }>(
        `SELECT COUNT(*) as count FROM articulos a WHERE ${whereClause}`,
        values
      ),
    ]);

    const total = parseInt(countResult?.count || '0', 10);

    return {
      data: rows.map((row) => this.mapToArticuloConRelaciones(row)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findStockBajo(limit: number = 10): Promise<ArticuloConRelaciones[]> {
    const rows = await query<Record<string, unknown>>(
      `SELECT a.*,
              r.id as rubro_id, r.nombre as rubro_nombre, r.descripcion as rubro_descripcion, r.prefijo as rubro_prefijo, r.activo as rubro_activo,
              p.id as proveedor_id, p.razon_social as proveedor_razon_social, p.cuit as proveedor_cuit
       FROM articulos a
       LEFT JOIN rubros r ON r.id = a.rubro_id
       LEFT JOIN proveedores p ON p.id = a.proveedor_id
       WHERE a.deleted_at IS NULL AND a.activo = true AND a.stock <= a.stock_minimo
       ORDER BY (a.stock_minimo - a.stock) DESC
       LIMIT $1`,
      [limit]
    );

    return rows.map((row) => this.mapToArticuloConRelaciones(row));
  }

  private mapToArticuloConRelaciones(row: Record<string, unknown>): ArticuloConRelaciones {
    const articulo = toCamelCase<Articulo>({
      id: row.id,
      codigo: row.codigo,
      nombre: row.nombre,
      rubro_id: row.rubro_id,
      proveedor_id: row.proveedor_id,
      stock: row.stock,
      stock_minimo: row.stock_minimo,
      presentacion: row.presentacion,
      marca: row.marca,
      sku: row.sku,
      etm: row.etm,
      stock_actual: row.stock_actual,
      numero_cotizacion_interna: row.numero_cotizacion_interna,
      ubicacion: row.ubicacion,
      url: row.url,
      costo_inicial_estimado: row.costo_inicial_estimado,
      valor_dolar_costo_inicial: row.valor_dolar_costo_inicial,
      costo_inicial_estimado_usd: row.costo_inicial_estimado_usd,
      imagen_url: row.imagen_url,
      imagen_public_id: row.imagen_public_id,
      activo: row.activo,
      created_at: row.created_at,
      updated_at: row.updated_at,
      deleted_at: row.deleted_at,
      created_by: row.created_by,
      updated_by: row.updated_by,
    });

    const rubro: Rubro = {
      id: row.rubro_id as string,
      nombre: row.rubro_nombre as string,
      descripcion: row.rubro_descripcion as string | null,
      prefijo: row.rubro_prefijo as string,
      activo: row.rubro_activo as boolean,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      createdBy: null,
      updatedBy: null,
    };

    const proveedor: Proveedor | null = row.proveedor_id
      ? {
          id: row.proveedor_id as string,
          razonSocial: row.proveedor_razon_social as string,
          nombreFantasia: null,
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
        }
      : null;

    return { ...articulo, rubro, proveedor };
  }
}

export const articuloRepository = new ArticuloRepository();

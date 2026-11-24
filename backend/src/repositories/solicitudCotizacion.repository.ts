import { query, queryOne, transaction } from '../config/database.js';
import { BaseRepository, type FindOptions } from './base.repository.js';
import { toCamelCase, type PaginatedResult } from '../types/index.js';
import type {
  SolicitudCotizacion,
  SolicitudCotizacionConRelaciones,
  SolicitudCotizacionItem,
  SolicitudCotizacionItemConArticulo,
  EstadoSolicitudCotizacion,
  EstadoItemCotizacion,
  MatchConfianza,
} from '@hofra/shared';

export interface SolicitudCotizacionFiltros {
  estado?: EstadoSolicitudCotizacion;
  clienteId?: string;
  busqueda?: string;
}

interface CreateItemData {
  orden: number;
  etmSolicitado: string | null;
  descripcionSolicitada: string;
  marcaSolicitada: string | null;
  modeloSolicitado: string | null;
  descripcionInglesSolicitada: string | null;
  unidadSolicitada: string | null;
  cantidadSolicitada: number;
  articuloId: string | null;
  matchConfianza: MatchConfianza;
}

export class SolicitudCotizacionRepository extends BaseRepository<SolicitudCotizacion> {
  constructor() {
    super('solicitudes_cotizacion', 'fecha_solicitud');
  }

  private mapSolicitud(row: Record<string, unknown>): SolicitudCotizacion {
    const solicitud = toCamelCase<SolicitudCotizacion>(row);
    return {
      ...solicitud,
      usdOficialCompra: solicitud.usdOficialCompra != null ? Number(solicitud.usdOficialCompra) : null,
      usdOficialVenta: solicitud.usdOficialVenta != null ? Number(solicitud.usdOficialVenta) : null,
    };
  }

  private mapItem(row: Record<string, unknown>): SolicitudCotizacionItem {
    const item = toCamelCase<SolicitudCotizacionItem>(row);
    return {
      ...item,
      precioUnitario: item.precioUnitario != null ? Number(item.precioUnitario) : null,
      markUp: item.markUp != null ? Number(item.markUp) : null,
    };
  }

  async create(data: {
    clienteId?: string | null;
    numeroCotizacion?: number | null;
    nombreCotizacion?: string | null;
    numeroReferenciaCliente?: string | null;
    nombreArchivo?: string | null;
    observaciones?: string | null;
    items: CreateItemData[];
    createdBy?: string;
  }): Promise<SolicitudCotizacion & { items: SolicitudCotizacionItem[] }> {
    return transaction(async (client) => {
      const solicitudRows = await client.query<Record<string, unknown>>(
        `INSERT INTO solicitudes_cotizacion (cliente_id, numero_cotizacion, nombre_cotizacion, numero_referencia_cliente, nombre_archivo, observaciones, estado, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, 'en_revision', $7)
         RETURNING *`,
        [
          data.clienteId || null,
          data.numeroCotizacion ?? null,
          data.nombreCotizacion || null,
          data.numeroReferenciaCliente || null,
          data.nombreArchivo || null,
          data.observaciones || null,
          data.createdBy || null,
        ]
      );

      if (!solicitudRows[0]) throw new Error('Failed to create solicitud de cotización');

      const solicitud = this.mapSolicitud(solicitudRows[0]);

      const items: SolicitudCotizacionItem[] = [];
      for (const item of data.items) {
        const itemRows = await client.query<Record<string, unknown>>(
          `INSERT INTO solicitud_cotizacion_items
             (solicitud_id, orden, etm_solicitado, descripcion_solicitada, marca_solicitada, modelo_solicitado, descripcion_ingles_solicitada, unidad_solicitada, cantidad_solicitada, articulo_id, articulo_id_sugerido, match_confianza)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10, $11)
           RETURNING *`,
          [
            solicitud.id,
            item.orden,
            item.etmSolicitado,
            item.descripcionSolicitada,
            item.marcaSolicitada,
            item.modeloSolicitado,
            item.descripcionInglesSolicitada,
            item.unidadSolicitada,
            item.cantidadSolicitada,
            item.articuloId,
            item.matchConfianza,
          ]
        );
        if (itemRows[0]) {
          items.push(this.mapItem(itemRows[0]));
        }
      }

      return { ...solicitud, items };
    });
  }

  async addItems(
    solicitudId: string,
    items: Omit<CreateItemData, 'orden'>[]
  ): Promise<SolicitudCotizacionItem[]> {
    return transaction(async (client) => {
      const maxOrdenRow = await client.queryOne<{ max_orden: number | null }>(
        `SELECT MAX(orden) as max_orden FROM solicitud_cotizacion_items WHERE solicitud_id = $1`,
        [solicitudId]
      );
      let nextOrden = (maxOrdenRow?.max_orden ?? -1) + 1;

      const inserted: SolicitudCotizacionItem[] = [];
      for (const item of items) {
        const itemRows = await client.query<Record<string, unknown>>(
          `INSERT INTO solicitud_cotizacion_items
             (solicitud_id, orden, etm_solicitado, descripcion_solicitada, marca_solicitada, modelo_solicitado, descripcion_ingles_solicitada, unidad_solicitada, cantidad_solicitada, articulo_id, articulo_id_sugerido, match_confianza)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10, $11)
           RETURNING *`,
          [
            solicitudId,
            nextOrden,
            item.etmSolicitado,
            item.descripcionSolicitada,
            item.marcaSolicitada,
            item.modeloSolicitado,
            item.descripcionInglesSolicitada,
            item.unidadSolicitada,
            item.cantidadSolicitada,
            item.articuloId,
            item.matchConfianza,
          ]
        );
        if (itemRows[0]) {
          inserted.push(this.mapItem(itemRows[0]));
        }
        nextOrden++;
      }

      return inserted;
    });
  }

  async updateHeader(
    id: string,
    data: {
      numeroCotizacion?: number | null;
      nombreCotizacion?: string | null;
      numeroReferenciaCliente?: string | null;
      observaciones?: string | null;
      fechaEntrega?: Date | string | null;
      lugarEntrega?: string | null;
      solicitadoPor?: string | null;
      usdOficialCompra?: number | null;
      usdOficialVenta?: number | null;
    },
    updatedBy?: string
  ): Promise<SolicitudCotizacion | null> {
    const sets: string[] = ['updated_at = NOW()'];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (data.numeroCotizacion !== undefined) {
      sets.push(`numero_cotizacion = $${paramIndex++}`);
      values.push(data.numeroCotizacion);
    }
    if (data.nombreCotizacion !== undefined) {
      sets.push(`nombre_cotizacion = $${paramIndex++}`);
      values.push(data.nombreCotizacion);
    }
    if (data.numeroReferenciaCliente !== undefined) {
      sets.push(`numero_referencia_cliente = $${paramIndex++}`);
      values.push(data.numeroReferenciaCliente);
    }
    if (data.observaciones !== undefined) {
      sets.push(`observaciones = $${paramIndex++}`);
      values.push(data.observaciones);
    }
    if (data.fechaEntrega !== undefined) {
      sets.push(`fecha_entrega = $${paramIndex++}`);
      values.push(data.fechaEntrega);
    }
    if (data.lugarEntrega !== undefined) {
      sets.push(`lugar_entrega = $${paramIndex++}`);
      values.push(data.lugarEntrega);
    }
    if (data.solicitadoPor !== undefined) {
      sets.push(`solicitado_por = $${paramIndex++}`);
      values.push(data.solicitadoPor);
    }
    if (data.usdOficialCompra !== undefined) {
      sets.push(`usd_oficial_compra = $${paramIndex++}`);
      values.push(data.usdOficialCompra);
    }
    if (data.usdOficialVenta !== undefined) {
      sets.push(`usd_oficial_venta = $${paramIndex++}`);
      values.push(data.usdOficialVenta);
    }
    if (updatedBy) {
      sets.push(`updated_by = $${paramIndex++}`);
      values.push(updatedBy);
    }

    values.push(id);

    const row = await queryOne<Record<string, unknown>>(
      `UPDATE solicitudes_cotizacion SET ${sets.join(', ')}
       WHERE id = $${paramIndex} AND deleted_at IS NULL
       RETURNING *`,
      values
    );

    return row ? this.mapSolicitud(row) : null;
  }

  async updateEstado(
    id: string,
    estado: EstadoSolicitudCotizacion,
    updatedBy?: string
  ): Promise<SolicitudCotizacion | null> {
    const row = await queryOne<Record<string, unknown>>(
      `UPDATE solicitudes_cotizacion SET estado = $1, updated_at = NOW(), updated_by = $2
       WHERE id = $3 AND deleted_at IS NULL
       RETURNING *`,
      [estado, updatedBy || null, id]
    );

    return row ? this.mapSolicitud(row) : null;
  }

  async updateItem(
    itemId: string,
    data: {
      articuloId?: string | null;
      estadoItem?: EstadoItemCotizacion;
      precioUnitario?: number | null;
      markUp?: number | null;
      urlExterna?: string | null;
      nombreExterno?: string | null;
    }
  ): Promise<SolicitudCotizacionItem | null> {
    const sets: string[] = ['updated_at = NOW()'];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (data.articuloId !== undefined) {
      sets.push(`articulo_id = $${paramIndex++}`);
      values.push(data.articuloId);
    }
    if (data.estadoItem !== undefined) {
      sets.push(`estado_item = $${paramIndex++}`);
      values.push(data.estadoItem);
    }
    if (data.precioUnitario !== undefined) {
      sets.push(`precio_unitario = $${paramIndex++}`);
      values.push(data.precioUnitario);
    }
    if (data.markUp !== undefined) {
      sets.push(`mark_up = $${paramIndex++}`);
      values.push(data.markUp);
    }
    if (data.urlExterna !== undefined) {
      sets.push(`url_externa = $${paramIndex++}`);
      values.push(data.urlExterna);
    }
    if (data.nombreExterno !== undefined) {
      sets.push(`nombre_externo = $${paramIndex++}`);
      values.push(data.nombreExterno);
    }

    values.push(itemId);

    const row = await queryOne<Record<string, unknown>>(
      `UPDATE solicitud_cotizacion_items SET ${sets.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING *`,
      values
    );

    return row ? this.mapItem(row) : null;
  }

  async findItemById(itemId: string): Promise<SolicitudCotizacionItem | null> {
    const row = await queryOne<Record<string, unknown>>(
      `SELECT * FROM solicitud_cotizacion_items WHERE id = $1`,
      [itemId]
    );
    return row ? this.mapItem(row) : null;
  }

  async findByIdWithRelations(id: string): Promise<SolicitudCotizacionConRelaciones | null> {
    const row = await queryOne<Record<string, unknown>>(
      `SELECT s.*,
              c.id as cli_id, c.razon_social as cliente_razon_social, c.cuit as cliente_cuit, c.contacto as cliente_contacto
       FROM solicitudes_cotizacion s
       LEFT JOIN clientes c ON c.id = s.cliente_id
       WHERE s.id = $1 AND s.deleted_at IS NULL`,
      [id]
    );

    if (!row) return null;

    const items = await this.getItems(id);

    return this.mapToConRelaciones(row, items);
  }

  async getItems(solicitudId: string): Promise<SolicitudCotizacionItemConArticulo[]> {
    const rows = await query<Record<string, unknown>>(
      `SELECT sci.*,
              a.id as articulo_id_full, a.codigo as articulo_codigo, a.nombre as articulo_nombre,
              a.marca as articulo_marca, a.etm as articulo_etm, a.sku as articulo_sku,
              a.costo_inicial_estimado as articulo_costo_inicial_estimado, a.stock_actual as articulo_stock_actual,
              a.imagen_url as articulo_imagen_url, p.razon_social as articulo_proveedor_nombre,
              a_sug.id as sugerido_id_full, a_sug.codigo as sugerido_codigo, a_sug.nombre as sugerido_nombre,
              a_sug.marca as sugerido_marca, a_sug.etm as sugerido_etm, a_sug.sku as sugerido_sku,
              a_sug.costo_inicial_estimado as sugerido_costo_inicial_estimado, a_sug.stock_actual as sugerido_stock_actual,
              a_sug.imagen_url as sugerido_imagen_url, p_sug.razon_social as sugerido_proveedor_nombre
       FROM solicitud_cotizacion_items sci
       LEFT JOIN articulos a ON a.id = sci.articulo_id
       LEFT JOIN proveedores p ON p.id = a.proveedor_id
       LEFT JOIN articulos a_sug ON a_sug.id = sci.articulo_id_sugerido
       LEFT JOIN proveedores p_sug ON p_sug.id = a_sug.proveedor_id
       WHERE sci.solicitud_id = $1
       ORDER BY sci.orden ASC`,
      [solicitudId]
    );

    return rows.map((row) => ({
      id: row.id as string,
      solicitudId: row.solicitud_id as string,
      orden: row.orden as number,
      etmSolicitado: row.etm_solicitado as string | null,
      descripcionSolicitada: row.descripcion_solicitada as string,
      marcaSolicitada: row.marca_solicitada as string | null,
      modeloSolicitado: row.modelo_solicitado as string | null,
      descripcionInglesSolicitada: row.descripcion_ingles_solicitada as string | null,
      unidadSolicitada: row.unidad_solicitada as string | null,
      cantidadSolicitada: row.cantidad_solicitada as number,
      articuloId: row.articulo_id as string | null,
      articuloIdSugerido: row.articulo_id_sugerido as string | null,
      matchConfianza: row.match_confianza as MatchConfianza | null,
      estadoItem: row.estado_item as EstadoItemCotizacion,
      precioUnitario: row.precio_unitario !== null ? Number(row.precio_unitario) : null,
      markUp: row.mark_up !== null ? Number(row.mark_up) : null,
      urlExterna: row.url_externa as string | null,
      nombreExterno: row.nombre_externo as string | null,
      createdAt: row.created_at as Date,
      updatedAt: row.updated_at as Date,
      articulo: row.articulo_id_full
        ? {
            id: row.articulo_id_full as string,
            codigo: row.articulo_codigo as string,
            nombre: row.articulo_nombre as string,
            marca: row.articulo_marca as string | null,
            etm: row.articulo_etm as string | null,
            sku: row.articulo_sku as string | null,
            costoInicialEstimado: row.articulo_costo_inicial_estimado !== null ? Number(row.articulo_costo_inicial_estimado) : null,
            stockActual: row.articulo_stock_actual as number,
            imagenUrl: row.articulo_imagen_url as string | null,
            proveedorNombre: row.articulo_proveedor_nombre as string | null,
          }
        : null,
      articuloSugerido: row.sugerido_id_full
        ? {
            id: row.sugerido_id_full as string,
            codigo: row.sugerido_codigo as string,
            nombre: row.sugerido_nombre as string,
            marca: row.sugerido_marca as string | null,
            etm: row.sugerido_etm as string | null,
            sku: row.sugerido_sku as string | null,
            costoInicialEstimado: row.sugerido_costo_inicial_estimado !== null ? Number(row.sugerido_costo_inicial_estimado) : null,
            stockActual: row.sugerido_stock_actual as number,
            imagenUrl: row.sugerido_imagen_url as string | null,
            proveedorNombre: row.sugerido_proveedor_nombre as string | null,
          }
        : null,
    }));
  }

  async findAllWithRelations(
    filtros: SolicitudCotizacionFiltros = {},
    options: FindOptions = {}
  ): Promise<PaginatedResult<SolicitudCotizacionConRelaciones>> {
    const { page = 1, limit = 20, sortOrder = 'desc' } = options;
    const offset = (page - 1) * limit;

    const conditions: string[] = ['s.deleted_at IS NULL'];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (filtros.estado) {
      conditions.push(`s.estado = $${paramIndex++}`);
      values.push(filtros.estado);
    }
    if (filtros.clienteId) {
      conditions.push(`s.cliente_id = $${paramIndex++}`);
      values.push(filtros.clienteId);
    }
    if (filtros.busqueda) {
      conditions.push(
        `(s.numero_referencia_cliente ILIKE $${paramIndex} OR c.razon_social ILIKE $${paramIndex})`
      );
      values.push(`%${filtros.busqueda}%`);
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');

    const [rows, countResult] = await Promise.all([
      query<Record<string, unknown>>(
        `SELECT s.*,
                c.id as cli_id, c.razon_social as cliente_razon_social, c.cuit as cliente_cuit, c.contacto as cliente_contacto
         FROM solicitudes_cotizacion s
         LEFT JOIN clientes c ON c.id = s.cliente_id
         WHERE ${whereClause}
         ORDER BY s.fecha_solicitud ${sortOrder.toUpperCase()}
         LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        [...values, limit, offset]
      ),
      queryOne<{ count: string }>(
        `SELECT COUNT(*) as count
         FROM solicitudes_cotizacion s
         LEFT JOIN clientes c ON c.id = s.cliente_id
         WHERE ${whereClause}`,
        values
      ),
    ]);

    const total = parseInt(countResult?.count || '0', 10);

    const solicitudes = await Promise.all(
      rows.map(async (row) => {
        const items = await this.getItems(row.id as string);
        return this.mapToConRelaciones(row, items);
      })
    );

    return {
      data: solicitudes,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  private mapToConRelaciones(
    row: Record<string, unknown>,
    items: SolicitudCotizacionItemConArticulo[]
  ): SolicitudCotizacionConRelaciones {
    const solicitud = toCamelCase<SolicitudCotizacion>({
      id: row.id,
      cliente_id: row.cliente_id,
      numero_cotizacion: row.numero_cotizacion,
      nombre_cotizacion: row.nombre_cotizacion,
      numero_referencia_cliente: row.numero_referencia_cliente,
      nombre_archivo: row.nombre_archivo,
      fecha_solicitud: row.fecha_solicitud,
      estado: row.estado,
      observaciones: row.observaciones,
      fecha_entrega: row.fecha_entrega,
      lugar_entrega: row.lugar_entrega,
      solicitado_por: row.solicitado_por,
      usd_oficial_compra: row.usd_oficial_compra,
      usd_oficial_venta: row.usd_oficial_venta,
      created_at: row.created_at,
      updated_at: row.updated_at,
      deleted_at: row.deleted_at,
      created_by: row.created_by,
      updated_by: row.updated_by,
    });

    return {
      ...solicitud,
      usdOficialCompra: row.usd_oficial_compra !== null && row.usd_oficial_compra !== undefined
        ? Number(row.usd_oficial_compra)
        : null,
      usdOficialVenta: row.usd_oficial_venta !== null && row.usd_oficial_venta !== undefined
        ? Number(row.usd_oficial_venta)
        : null,
      items,
      cliente: row.cli_id
        ? {
            id: row.cli_id as string,
            razonSocial: row.cliente_razon_social as string,
            cuit: row.cliente_cuit as string,
            direccion: null,
            telefono: null,
            email: null,
            contacto: row.cliente_contacto as string | null,
            notas: null,
            activo: true,
            createdAt: new Date(),
            updatedAt: new Date(),
            deletedAt: null,
            createdBy: null,
            updatedBy: null,
          }
        : null,
    };
  }
}

export const solicitudCotizacionRepository = new SolicitudCotizacionRepository();

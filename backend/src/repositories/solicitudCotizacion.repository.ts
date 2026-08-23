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
  cantidadSolicitada: number;
  articuloId: string | null;
  matchConfianza: MatchConfianza;
}

export class SolicitudCotizacionRepository extends BaseRepository<SolicitudCotizacion> {
  constructor() {
    super('solicitudes_cotizacion', 'fecha_solicitud');
  }

  async create(data: {
    clienteId: string;
    numeroReferenciaCliente?: string | null;
    nombreArchivo?: string | null;
    observaciones?: string | null;
    items: CreateItemData[];
    createdBy?: string;
  }): Promise<SolicitudCotizacion & { items: SolicitudCotizacionItem[] }> {
    return transaction(async (client) => {
      const solicitudRows = await client.query<Record<string, unknown>>(
        `INSERT INTO solicitudes_cotizacion (cliente_id, numero_referencia_cliente, nombre_archivo, observaciones, estado, created_by)
         VALUES ($1, $2, $3, $4, 'en_revision', $5)
         RETURNING *`,
        [
          data.clienteId,
          data.numeroReferenciaCliente || null,
          data.nombreArchivo || null,
          data.observaciones || null,
          data.createdBy || null,
        ]
      );

      if (!solicitudRows[0]) throw new Error('Failed to create solicitud de cotización');

      const solicitud = toCamelCase<SolicitudCotizacion>(solicitudRows[0]);

      const items: SolicitudCotizacionItem[] = [];
      for (const item of data.items) {
        const itemRows = await client.query<Record<string, unknown>>(
          `INSERT INTO solicitud_cotizacion_items
             (solicitud_id, orden, etm_solicitado, descripcion_solicitada, marca_solicitada, cantidad_solicitada, articulo_id, match_confianza)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           RETURNING *`,
          [
            solicitud.id,
            item.orden,
            item.etmSolicitado,
            item.descripcionSolicitada,
            item.marcaSolicitada,
            item.cantidadSolicitada,
            item.articuloId,
            item.matchConfianza,
          ]
        );
        if (itemRows[0]) {
          items.push(toCamelCase<SolicitudCotizacionItem>(itemRows[0]));
        }
      }

      return { ...solicitud, items };
    });
  }

  async updateHeader(
    id: string,
    data: { numeroReferenciaCliente?: string | null; observaciones?: string | null },
    updatedBy?: string
  ): Promise<SolicitudCotizacion | null> {
    const sets: string[] = ['updated_at = NOW()'];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (data.numeroReferenciaCliente !== undefined) {
      sets.push(`numero_referencia_cliente = $${paramIndex++}`);
      values.push(data.numeroReferenciaCliente);
    }
    if (data.observaciones !== undefined) {
      sets.push(`observaciones = $${paramIndex++}`);
      values.push(data.observaciones);
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

    return row ? toCamelCase<SolicitudCotizacion>(row) : null;
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

    return row ? toCamelCase<SolicitudCotizacion>(row) : null;
  }

  async updateItem(
    itemId: string,
    data: {
      articuloId?: string | null;
      estadoItem?: EstadoItemCotizacion;
      precioUnitario?: number | null;
      urlExterna?: string | null;
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
    if (data.urlExterna !== undefined) {
      sets.push(`url_externa = $${paramIndex++}`);
      values.push(data.urlExterna);
    }

    values.push(itemId);

    const row = await queryOne<Record<string, unknown>>(
      `UPDATE solicitud_cotizacion_items SET ${sets.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING *`,
      values
    );

    return row ? toCamelCase<SolicitudCotizacionItem>(row) : null;
  }

  async findItemById(itemId: string): Promise<SolicitudCotizacionItem | null> {
    const row = await queryOne<Record<string, unknown>>(
      `SELECT * FROM solicitud_cotizacion_items WHERE id = $1`,
      [itemId]
    );
    return row ? toCamelCase<SolicitudCotizacionItem>(row) : null;
  }

  async findByIdWithRelations(id: string): Promise<SolicitudCotizacionConRelaciones | null> {
    const row = await queryOne<Record<string, unknown>>(
      `SELECT s.*,
              c.id as cli_id, c.razon_social as cliente_razon_social, c.cuit as cliente_cuit
       FROM solicitudes_cotizacion s
       INNER JOIN clientes c ON c.id = s.cliente_id
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
              a.costo_inicial_estimado as articulo_costo_inicial_estimado, a.stock_actual as articulo_stock_actual
       FROM solicitud_cotizacion_items sci
       LEFT JOIN articulos a ON a.id = sci.articulo_id
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
      cantidadSolicitada: row.cantidad_solicitada as number,
      articuloId: row.articulo_id as string | null,
      matchConfianza: row.match_confianza as MatchConfianza | null,
      estadoItem: row.estado_item as EstadoItemCotizacion,
      precioUnitario: row.precio_unitario !== null ? Number(row.precio_unitario) : null,
      urlExterna: row.url_externa as string | null,
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
                c.id as cli_id, c.razon_social as cliente_razon_social, c.cuit as cliente_cuit
         FROM solicitudes_cotizacion s
         INNER JOIN clientes c ON c.id = s.cliente_id
         WHERE ${whereClause}
         ORDER BY s.fecha_solicitud ${sortOrder.toUpperCase()}
         LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        [...values, limit, offset]
      ),
      queryOne<{ count: string }>(
        `SELECT COUNT(*) as count
         FROM solicitudes_cotizacion s
         INNER JOIN clientes c ON c.id = s.cliente_id
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
      numero_referencia_cliente: row.numero_referencia_cliente,
      nombre_archivo: row.nombre_archivo,
      fecha_solicitud: row.fecha_solicitud,
      estado: row.estado,
      observaciones: row.observaciones,
      created_at: row.created_at,
      updated_at: row.updated_at,
      deleted_at: row.deleted_at,
      created_by: row.created_by,
      updated_by: row.updated_by,
    });

    return {
      ...solicitud,
      items,
      cliente: {
        id: row.cli_id as string,
        razonSocial: row.cliente_razon_social as string,
        cuit: row.cliente_cuit as string,
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
}

export const solicitudCotizacionRepository = new SolicitudCotizacionRepository();

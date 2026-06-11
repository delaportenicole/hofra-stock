import { query, queryOne, transaction } from '../config/database.js';
import { BaseRepository, type FindOptions } from './base.repository.js';
import { toCamelCase, type PaginatedResult } from '../types/index.js';
import type { Entrega, EntregaConRelaciones, EntregaItem, EntregaItemConArticulo, CreateEntregaItemDto, EstadoEntrega } from '@hofra/shared';

export class EntregaRepository extends BaseRepository<Entrega> {
  constructor() {
    super('entregas', 'fecha_entrega');
  }

  async create(data: {
    clienteId: string;
    numeroCotizacionInterna: string;
    purchaseOrder?: string | null;
    items: CreateEntregaItemDto[];
    observaciones?: string | null;
    fechaEntrega?: Date;
    createdBy?: string;
  }): Promise<Entrega & { items: EntregaItem[] }> {
    return transaction(async (client) => {
      // Create entrega header
      const entregaRows = await client.query<Record<string, unknown>>(
        `INSERT INTO entregas (cliente_id, numero_cotizacion_interna, purchase_order, observaciones, fecha_entrega, estado, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          data.clienteId,
          data.numeroCotizacionInterna,
          data.purchaseOrder || null,
          data.observaciones || null,
          data.fechaEntrega || new Date(),
          'en_curso',
          data.createdBy || null,
        ]
      );

      if (!entregaRows[0]) throw new Error('Failed to create entrega');

      const entrega = toCamelCase<Entrega>(entregaRows[0]);

      // Create entrega items
      const items: EntregaItem[] = [];
      for (const item of data.items) {
        const itemRows = await client.query<Record<string, unknown>>(
          `INSERT INTO entrega_items (entrega_id, articulo_id, cantidad)
           VALUES ($1, $2, $3)
           RETURNING *`,
          [entrega.id, item.articuloId, item.cantidad]
        );
        if (itemRows[0]) {
          items.push(toCamelCase<EntregaItem>(itemRows[0]));
        }
      }

      return { ...entrega, items };
    });
  }

  async update(id: string, data: {
    clienteId?: string;
    numeroCotizacionInterna?: string;
    purchaseOrder?: string | null;
    observaciones?: string | null;
    fechaEntrega?: Date;
    items?: CreateEntregaItemDto[];
  }, updatedBy?: string): Promise<Entrega & { items: EntregaItem[] }> {
    return transaction(async (client) => {
      // Build SET clauses for header
      const setClauses: string[] = ['updated_at = NOW()'];
      const values: unknown[] = [];
      let paramIndex = 1;

      if (data.clienteId !== undefined) {
        setClauses.push(`cliente_id = $${paramIndex++}`);
        values.push(data.clienteId);
      }
      if (data.numeroCotizacionInterna !== undefined) {
        setClauses.push(`numero_cotizacion_interna = $${paramIndex++}`);
        values.push(data.numeroCotizacionInterna);
      }
      if (data.purchaseOrder !== undefined) {
        setClauses.push(`purchase_order = $${paramIndex++}`);
        values.push(data.purchaseOrder);
      }
      if (data.observaciones !== undefined) {
        setClauses.push(`observaciones = $${paramIndex++}`);
        values.push(data.observaciones);
      }
      if (data.fechaEntrega !== undefined) {
        setClauses.push(`fecha_entrega = $${paramIndex++}`);
        values.push(data.fechaEntrega);
      }
      if (updatedBy) {
        setClauses.push(`updated_by = $${paramIndex++}`);
        values.push(updatedBy);
      }

      values.push(id);

      const entregaRows = await client.query<Record<string, unknown>>(
        `UPDATE entregas SET ${setClauses.join(', ')} WHERE id = $${paramIndex} AND deleted_at IS NULL RETURNING *`,
        values
      );

      if (!entregaRows[0]) throw new Error('Failed to update entrega');

      const entrega = toCamelCase<Entrega>(entregaRows[0]);

      // If items are provided, replace all items
      let items: EntregaItem[] = [];
      if (data.items !== undefined) {
        // Delete existing items
        await client.query('DELETE FROM entrega_items WHERE entrega_id = $1', [id]);

        // Create new items
        for (const item of data.items) {
          const itemRows = await client.query<Record<string, unknown>>(
            `INSERT INTO entrega_items (entrega_id, articulo_id, cantidad)
             VALUES ($1, $2, $3)
             RETURNING *`,
            [id, item.articuloId, item.cantidad]
          );
          if (itemRows[0]) {
            items.push(toCamelCase<EntregaItem>(itemRows[0]));
          }
        }
      } else {
        // Get existing items
        const existingItems = await client.query<Record<string, unknown>>(
          'SELECT * FROM entrega_items WHERE entrega_id = $1',
          [id]
        );
        items = existingItems.map(row => toCamelCase<EntregaItem>(row));
      }

      return { ...entrega, items };
    });
  }

  async findByIdWithRelations(id: string): Promise<EntregaConRelaciones | null> {
    const row = await queryOne<Record<string, unknown>>(
      `SELECT e.*,
              c.id as cli_id, c.razon_social as cliente_razon_social, c.cuit as cliente_cuit
       FROM entregas e
       INNER JOIN clientes c ON c.id = e.cliente_id
       WHERE e.id = $1 AND e.deleted_at IS NULL`,
      [id]
    );

    if (!row) return null;

    // Get items
    const items = await this.getEntregaItems(id);

    return this.mapToEntregaConRelaciones(row, items);
  }

  async getEntregaItems(entregaId: string): Promise<EntregaItemConArticulo[]> {
    const rows = await query<Record<string, unknown>>(
      `SELECT ei.*,
              a.id as articulo_id, a.codigo as articulo_codigo, a.nombre as articulo_nombre,
              a.unidad as articulo_unidad, a.costo_inicial_estimado as articulo_costo_inicial_estimado
       FROM entrega_items ei
       INNER JOIN articulos a ON a.id = ei.articulo_id
       WHERE ei.entrega_id = $1
       ORDER BY ei.created_at ASC`,
      [entregaId]
    );

    return rows.map((row) => ({
      id: row.id as string,
      entregaId: row.entrega_id as string,
      articuloId: row.articulo_id as string,
      cantidad: row.cantidad as number,
      createdAt: row.created_at as Date,
      updatedAt: row.updated_at as Date,
      articulo: {
        id: row.articulo_id as string,
        codigo: row.articulo_codigo as string,
        nombre: row.articulo_nombre as string,
        unidad: row.articulo_unidad as string,
        costoInicialEstimado: row.articulo_costo_inicial_estimado as number | null,
      },
    }));
  }

  async findAllWithRelations(options: FindOptions = {}): Promise<PaginatedResult<EntregaConRelaciones>> {
    const { page = 1, limit = 20, sortOrder = 'desc' } = options;
    const offset = (page - 1) * limit;

    const [rows, countResult] = await Promise.all([
      query<Record<string, unknown>>(
        `SELECT e.*,
                c.id as cli_id, c.razon_social as cliente_razon_social, c.cuit as cliente_cuit
         FROM entregas e
         INNER JOIN clientes c ON c.id = e.cliente_id
         WHERE e.deleted_at IS NULL
         ORDER BY e.fecha_entrega ${sortOrder.toUpperCase()}
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      ),
      queryOne<{ count: string }>(
        `SELECT COUNT(*) as count FROM entregas WHERE deleted_at IS NULL`
      ),
    ]);

    const total = parseInt(countResult?.count || '0', 10);

    // Get items for each entrega
    const entregas = await Promise.all(
      rows.map(async (row) => {
        const items = await this.getEntregaItems(row.id as string);
        return this.mapToEntregaConRelaciones(row, items);
      })
    );

    return {
      data: entregas,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findByArticulo(articuloId: string, limit: number = 10): Promise<EntregaConRelaciones[]> {
    const rows = await query<Record<string, unknown>>(
      `SELECT DISTINCT e.*,
              c.id as cli_id, c.razon_social as cliente_razon_social, c.cuit as cliente_cuit
       FROM entregas e
       INNER JOIN entrega_items ei ON ei.entrega_id = e.id
       INNER JOIN clientes c ON c.id = e.cliente_id
       WHERE ei.articulo_id = $1 AND e.deleted_at IS NULL
       ORDER BY e.fecha_entrega DESC
       LIMIT $2`,
      [articuloId, limit]
    );

    return Promise.all(
      rows.map(async (row) => {
        const items = await this.getEntregaItems(row.id as string);
        return this.mapToEntregaConRelaciones(row, items);
      })
    );
  }

  async findByCliente(clienteId: string, options: FindOptions = {}): Promise<PaginatedResult<EntregaConRelaciones>> {
    const { page = 1, limit = 20 } = options;
    const offset = (page - 1) * limit;

    const [rows, countResult] = await Promise.all([
      query<Record<string, unknown>>(
        `SELECT e.*,
                c.id as cli_id, c.razon_social as cliente_razon_social, c.cuit as cliente_cuit
         FROM entregas e
         INNER JOIN clientes c ON c.id = e.cliente_id
         WHERE e.cliente_id = $1 AND e.deleted_at IS NULL
         ORDER BY e.fecha_entrega DESC
         LIMIT $2 OFFSET $3`,
        [clienteId, limit, offset]
      ),
      queryOne<{ count: string }>(
        `SELECT COUNT(*) as count FROM entregas WHERE cliente_id = $1 AND deleted_at IS NULL`,
        [clienteId]
      ),
    ]);

    const total = parseInt(countResult?.count || '0', 10);

    const entregas = await Promise.all(
      rows.map(async (row) => {
        const items = await this.getEntregaItems(row.id as string);
        return this.mapToEntregaConRelaciones(row, items);
      })
    );

    return {
      data: entregas,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async confirm(id: string, updatedBy?: string): Promise<Entrega> {
    const row = await queryOne<Record<string, unknown>>(
      `UPDATE entregas
       SET estado = 'confirmada', updated_at = NOW(), updated_by = $2
       WHERE id = $1 AND deleted_at IS NULL AND estado = 'en_curso'
       RETURNING *`,
      [id, updatedBy || null]
    );

    if (!row) throw new Error('Entrega not found or not in en_curso state');

    return toCamelCase<Entrega>(row);
  }

  async cancel(id: string, updatedBy?: string): Promise<Entrega> {
    const row = await queryOne<Record<string, unknown>>(
      `UPDATE entregas
       SET estado = 'cancelada', updated_at = NOW(), updated_by = $2
       WHERE id = $1 AND deleted_at IS NULL AND estado != 'cancelada'
       RETURNING *`,
      [id, updatedBy || null]
    );

    if (!row) throw new Error('Entrega not found or already cancelled');

    return toCamelCase<Entrega>(row);
  }

  async countToday(): Promise<number> {
    const result = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM entregas
       WHERE deleted_at IS NULL AND estado = 'confirmada'
       AND fecha_entrega >= CURRENT_DATE
       AND fecha_entrega < CURRENT_DATE + INTERVAL '1 day'`
    );

    return parseInt(result?.count || '0', 10);
  }

  async countThisMonth(): Promise<number> {
    const result = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM entregas
       WHERE deleted_at IS NULL AND estado = 'confirmada'
       AND fecha_entrega >= DATE_TRUNC('month', CURRENT_DATE)
       AND fecha_entrega < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'`
    );

    return parseInt(result?.count || '0', 10);
  }

  private mapToEntregaConRelaciones(row: Record<string, unknown>, items: EntregaItemConArticulo[]): EntregaConRelaciones {
    const entrega = toCamelCase<Entrega>({
      id: row.id,
      cliente_id: row.cliente_id,
      numero_cotizacion_interna: row.numero_cotizacion_interna,
      purchase_order: row.purchase_order,
      observaciones: row.observaciones,
      fecha_entrega: row.fecha_entrega,
      estado: row.estado,
      created_at: row.created_at,
      updated_at: row.updated_at,
      deleted_at: row.deleted_at,
      created_by: row.created_by,
      updated_by: row.updated_by,
    });

    return {
      ...entrega,
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

export const entregaRepository = new EntregaRepository();

import { query, queryOne } from '../config/database.js';
import { BaseRepository } from './base.repository.js';
import { toCamelCase } from '../types/index.js';
import type { Sugerencia, SugerenciaConUsuario } from '@hofra/shared';

export class SugerenciaRepository extends BaseRepository<Sugerencia> {
  constructor() {
    super('sugerencias', 'created_at');
  }

  async findByIdWithUsuario(id: string): Promise<SugerenciaConUsuario | null> {
    const row = await queryOne<Record<string, unknown>>(
      `SELECT s.*,
              u.id as creador_id, u.nombre as creador_nombre, u.apellido as creador_apellido
       FROM sugerencias s
       LEFT JOIN usuarios u ON u.id = s.created_by
       WHERE s.id = $1 AND s.deleted_at IS NULL`,
      [id]
    );

    if (!row) return null;

    return this.mapRowToSugerenciaConUsuario(row);
  }

  async findAllWithUsuario(options: {
    page?: number;
    limit?: number;
    estado?: string;
    prioridad?: string;
  } = {}): Promise<{ data: SugerenciaConUsuario[]; total: number }> {
    const { page = 1, limit = 20, estado, prioridad } = options;
    const offset = (page - 1) * limit;

    let whereClause = 's.deleted_at IS NULL';
    const params: unknown[] = [];
    let paramIndex = 1;

    if (estado) {
      whereClause += ` AND s.estado = $${paramIndex++}`;
      params.push(estado);
    }

    if (prioridad) {
      whereClause += ` AND s.prioridad = $${paramIndex++}`;
      params.push(prioridad);
    }

    const countResult = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM sugerencias s WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countResult?.count || '0', 10);

    params.push(limit, offset);
    const rows = await query<Record<string, unknown>>(
      `SELECT s.*,
              u.id as creador_id, u.nombre as creador_nombre, u.apellido as creador_apellido
       FROM sugerencias s
       LEFT JOIN usuarios u ON u.id = s.created_by
       WHERE ${whereClause}
       ORDER BY
         CASE s.prioridad
           WHEN 'alta' THEN 1
           WHEN 'media' THEN 2
           WHEN 'baja' THEN 3
         END,
         s.created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      params
    );

    return {
      data: rows.map((row) => this.mapRowToSugerenciaConUsuario(row)),
      total,
    };
  }

  private mapRowToSugerenciaConUsuario(row: Record<string, unknown>): SugerenciaConUsuario {
    const sugerencia = toCamelCase<Sugerencia>(row);

    return {
      ...sugerencia,
      creador: row.creador_id
        ? {
            id: row.creador_id as string,
            nombre: row.creador_nombre as string,
            apellido: row.creador_apellido as string,
          }
        : null,
    };
  }

  async create(data: {
    titulo: string;
    descripcion: string;
    prioridad: string;
    createdBy?: string;
  }): Promise<Sugerencia> {
    const row = await queryOne<Record<string, unknown>>(
      `INSERT INTO sugerencias (titulo, descripcion, prioridad, estado, created_by)
       VALUES ($1, $2, $3, 'nueva', $4)
       RETURNING *`,
      [data.titulo, data.descripcion, data.prioridad, data.createdBy || null]
    );

    if (!row) throw new Error('Failed to create sugerencia');

    return toCamelCase<Sugerencia>(row);
  }

  async update(
    id: string,
    data: Partial<{
      titulo: string;
      descripcion: string;
      prioridad: string;
      estado: string;
    }>,
    updatedBy?: string
  ): Promise<Sugerencia | null> {
    const sets: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (data.titulo !== undefined) {
      sets.push(`titulo = $${paramIndex++}`);
      values.push(data.titulo);
    }
    if (data.descripcion !== undefined) {
      sets.push(`descripcion = $${paramIndex++}`);
      values.push(data.descripcion);
    }
    if (data.prioridad !== undefined) {
      sets.push(`prioridad = $${paramIndex++}`);
      values.push(data.prioridad);
    }
    if (data.estado !== undefined) {
      sets.push(`estado = $${paramIndex++}`);
      values.push(data.estado);
    }

    if (sets.length === 0) {
      return this.findById(id);
    }

    sets.push(`updated_by = $${paramIndex++}`);
    values.push(updatedBy || null);

    values.push(id);

    const row = await queryOne<Record<string, unknown>>(
      `UPDATE sugerencias SET ${sets.join(', ')}
       WHERE id = $${paramIndex} AND deleted_at IS NULL
       RETURNING *`,
      values
    );

    if (!row) return null;

    return toCamelCase<Sugerencia>(row);
  }
}

export const sugerenciaRepository = new SugerenciaRepository();

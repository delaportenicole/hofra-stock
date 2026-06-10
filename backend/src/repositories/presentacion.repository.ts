import { query, queryOne } from '../config/database.js';
import { BaseRepository } from './base.repository.js';
import { toCamelCase } from '../types/index.js';
import type { Presentacion } from '@hofra/shared';

export class PresentacionRepository extends BaseRepository<Presentacion> {
  constructor() {
    super('presentaciones', 'nombre');
  }

  async create(data: {
    nombre: string;
    descripcion?: string | null;
    createdBy?: string;
  }): Promise<Presentacion> {
    const row = await queryOne<Record<string, unknown>>(
      `INSERT INTO presentaciones (nombre, descripcion, created_by)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [data.nombre, data.descripcion || null, data.createdBy || null]
    );

    if (!row) throw new Error('Failed to create presentacion');

    return toCamelCase<Presentacion>(row);
  }

  async update(
    id: string,
    data: Partial<{ nombre: string; descripcion: string | null; activo: boolean }>,
    updatedBy?: string
  ): Promise<Presentacion> {
    const setClauses: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (data.nombre !== undefined) {
      setClauses.push(`nombre = $${paramIndex++}`);
      values.push(data.nombre);
    }
    if (data.descripcion !== undefined) {
      setClauses.push(`descripcion = $${paramIndex++}`);
      values.push(data.descripcion);
    }
    if (data.activo !== undefined) {
      setClauses.push(`activo = $${paramIndex++}`);
      values.push(data.activo);
    }

    setClauses.push(`updated_at = NOW()`);
    if (updatedBy) {
      setClauses.push(`updated_by = $${paramIndex++}`);
      values.push(updatedBy);
    }

    values.push(id);

    const row = await queryOne<Record<string, unknown>>(
      `UPDATE presentaciones SET ${setClauses.join(', ')}
       WHERE id = $${paramIndex} AND deleted_at IS NULL
       RETURNING *`,
      values
    );

    if (!row) throw new Error('Presentacion not found');

    return toCamelCase<Presentacion>(row);
  }

  async getActive(): Promise<Presentacion[]> {
    const rows = await query<Record<string, unknown>>(
      `SELECT * FROM presentaciones
       WHERE deleted_at IS NULL AND activo = true
       ORDER BY nombre ASC`
    );

    return rows.map((row) => toCamelCase<Presentacion>(row));
  }
}

export const presentacionRepository = new PresentacionRepository();

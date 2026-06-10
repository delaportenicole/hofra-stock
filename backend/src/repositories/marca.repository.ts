import { query, queryOne } from '../config/database.js';
import { BaseRepository } from './base.repository.js';
import { toCamelCase } from '../types/index.js';
import type { Marca } from '@hofra/shared';

export class MarcaRepository extends BaseRepository<Marca> {
  constructor() {
    super('marcas', 'nombre');
  }

  async create(data: {
    nombre: string;
    descripcion?: string | null;
    createdBy?: string;
  }): Promise<Marca> {
    const row = await queryOne<Record<string, unknown>>(
      `INSERT INTO marcas (nombre, descripcion, created_by)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [data.nombre, data.descripcion || null, data.createdBy || null]
    );

    if (!row) throw new Error('Failed to create marca');

    return toCamelCase<Marca>(row);
  }

  async update(
    id: string,
    data: Partial<{ nombre: string; descripcion: string | null; activo: boolean }>,
    updatedBy?: string
  ): Promise<Marca> {
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
      `UPDATE marcas SET ${setClauses.join(', ')}
       WHERE id = $${paramIndex} AND deleted_at IS NULL
       RETURNING *`,
      values
    );

    if (!row) throw new Error('Marca not found');

    return toCamelCase<Marca>(row);
  }

  async getActive(): Promise<Marca[]> {
    const rows = await query<Record<string, unknown>>(
      `SELECT * FROM marcas
       WHERE deleted_at IS NULL AND activo = true
       ORDER BY nombre ASC`
    );

    return rows.map((row) => toCamelCase<Marca>(row));
  }

  async findByNombre(nombre: string): Promise<Marca | null> {
    const row = await queryOne<Record<string, unknown>>(
      `SELECT * FROM marcas WHERE LOWER(nombre) = LOWER($1) AND deleted_at IS NULL`,
      [nombre]
    );

    return row ? toCamelCase<Marca>(row) : null;
  }
}

export const marcaRepository = new MarcaRepository();

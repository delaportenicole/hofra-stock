import { query, queryOne } from '../config/database.js';
import { BaseRepository } from './base.repository.js';
import { toCamelCase } from '../types/index.js';
import type { UnidadMedida } from '@hofra/shared';

export class UnidadMedidaRepository extends BaseRepository<UnidadMedida> {
  constructor() {
    super('unidades_medida', 'nombre');
  }

  async create(data: {
    nombre: string;
    createdBy?: string;
  }): Promise<UnidadMedida> {
    const row = await queryOne<Record<string, unknown>>(
      `INSERT INTO unidades_medida (nombre, created_by)
       VALUES ($1, $2)
       RETURNING *`,
      [data.nombre, data.createdBy || null]
    );

    if (!row) throw new Error('Failed to create unidad de medida');

    return toCamelCase<UnidadMedida>(row);
  }

  async update(
    id: string,
    data: Partial<{ nombre: string; activo: boolean }>,
    updatedBy?: string
  ): Promise<UnidadMedida> {
    const setClauses: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (data.nombre !== undefined) {
      setClauses.push(`nombre = $${paramIndex++}`);
      values.push(data.nombre);
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
      `UPDATE unidades_medida SET ${setClauses.join(', ')}
       WHERE id = $${paramIndex} AND deleted_at IS NULL
       RETURNING *`,
      values
    );

    if (!row) throw new Error('Unidad de medida not found');

    return toCamelCase<UnidadMedida>(row);
  }

  async getActive(): Promise<UnidadMedida[]> {
    const rows = await query<Record<string, unknown>>(
      `SELECT * FROM unidades_medida
       WHERE deleted_at IS NULL AND activo = true
       ORDER BY nombre ASC`
    );

    return rows.map((row) => toCamelCase<UnidadMedida>(row));
  }
}

export const unidadMedidaRepository = new UnidadMedidaRepository();

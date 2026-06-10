import { queryOne, execute } from '../config/database.js';
import { BaseRepository } from './base.repository.js';
import { toCamelCase } from '../types/index.js';
import type { Rubro } from '@hofra/shared';

export class RubroRepository extends BaseRepository<Rubro> {
  constructor() {
    super('rubros', 'nombre');
  }

  async findByNombre(nombre: string): Promise<Rubro | null> {
    const row = await queryOne<Record<string, unknown>>(
      `SELECT * FROM rubros WHERE nombre = $1 AND deleted_at IS NULL`,
      [nombre]
    );

    return row ? toCamelCase<Rubro>(row) : null;
  }

  async create(data: {
    nombre: string;
    descripcion?: string | null;
    prefijo: string;
    createdBy?: string;
  }): Promise<Rubro> {
    const row = await queryOne<Record<string, unknown>>(
      `INSERT INTO rubros (nombre, descripcion, prefijo, created_by)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [data.nombre, data.descripcion || null, data.prefijo, data.createdBy || null]
    );

    if (!row) throw new Error('Failed to create rubro');

    return toCamelCase<Rubro>(row);
  }

  async update(
    id: string,
    data: Partial<{
      nombre: string;
      descripcion: string | null;
      prefijo: string;
      activo: boolean;
    }>,
    updatedBy?: string
  ): Promise<Rubro | null> {
    const sets: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (data.nombre !== undefined) {
      sets.push(`nombre = $${paramIndex++}`);
      values.push(data.nombre);
    }
    if (data.descripcion !== undefined) {
      sets.push(`descripcion = $${paramIndex++}`);
      values.push(data.descripcion);
    }
    if (data.prefijo !== undefined) {
      sets.push(`prefijo = $${paramIndex++}`);
      values.push(data.prefijo);
    }
    if (data.activo !== undefined) {
      sets.push(`activo = $${paramIndex++}`);
      values.push(data.activo);
    }

    sets.push(`updated_by = $${paramIndex++}`);
    values.push(updatedBy || null);

    values.push(id);

    const row = await queryOne<Record<string, unknown>>(
      `UPDATE rubros SET ${sets.join(', ')}
       WHERE id = $${paramIndex} AND deleted_at IS NULL
       RETURNING *`,
      values
    );

    return row ? toCamelCase<Rubro>(row) : null;
  }

  async findActive(): Promise<Rubro[]> {
    const result = await this.findAll({
      limit: 100,
      sortBy: 'nombre',
      sortOrder: 'asc',
    });

    return result.data.filter((r) => r.activo);
  }

  async hasArticulos(id: string): Promise<boolean> {
    const result = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM articulos WHERE rubro_id = $1 AND deleted_at IS NULL`,
      [id]
    );

    return parseInt(result?.count || '0', 10) > 0;
  }
}

export const rubroRepository = new RubroRepository();

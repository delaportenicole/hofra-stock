import { query, queryOne, execute, transaction } from '../config/database.js';
import { BaseRepository } from './base.repository.js';
import { toCamelCase } from '../types/index.js';
import type { Rol, RolConPermisos, Permiso } from '@hofra/shared';

export class RolRepository extends BaseRepository<Rol> {
  constructor() {
    super('roles', 'nombre');
  }

  async findByNombre(nombre: string): Promise<Rol | null> {
    const row = await queryOne<Record<string, unknown>>(
      `SELECT * FROM roles WHERE nombre = $1 AND deleted_at IS NULL`,
      [nombre]
    );

    return row ? toCamelCase<Rol>(row) : null;
  }

  async findByIdWithPermisos(id: string): Promise<RolConPermisos | null> {
    const rol = await this.findById(id);
    if (!rol) return null;

    const permisos = await this.getPermisos(id);
    return { ...rol, permisos };
  }

  async getPermisos(rolId: string): Promise<Permiso[]> {
    const rows = await query<Record<string, unknown>>(
      `SELECT p.* FROM permisos p
       INNER JOIN roles_permisos rp ON rp.permiso_id = p.id
       WHERE rp.rol_id = $1 AND p.deleted_at IS NULL`,
      [rolId]
    );

    return rows.map((row) => toCamelCase<Permiso>(row));
  }

  async create(data: {
    nombre: string;
    descripcion?: string | null;
    permisoIds?: string[];
    createdBy?: string;
  }): Promise<Rol> {
    return transaction(async ({ queryOne: txQueryOne, execute: txExecute }) => {
      const row = await txQueryOne<Record<string, unknown>>(
        `INSERT INTO roles (nombre, descripcion, created_by)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [data.nombre, data.descripcion || null, data.createdBy || null]
      );

      if (!row) throw new Error('Failed to create rol');

      const rol = toCamelCase<Rol>(row);

      // Assign permisos
      if (data.permisoIds && data.permisoIds.length > 0) {
        for (const permisoId of data.permisoIds) {
          await txExecute(
            `INSERT INTO roles_permisos (rol_id, permiso_id) VALUES ($1, $2)`,
            [rol.id, permisoId]
          );
        }
      }

      return rol;
    });
  }

  async update(
    id: string,
    data: Partial<{
      nombre: string;
      descripcion: string | null;
      permisoIds: string[];
    }>,
    updatedBy?: string
  ): Promise<Rol | null> {
    return transaction(async ({ queryOne: txQueryOne, execute: txExecute }) => {
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

      sets.push(`updated_by = $${paramIndex++}`);
      values.push(updatedBy || null);

      values.push(id);

      const row = await txQueryOne<Record<string, unknown>>(
        `UPDATE roles SET ${sets.join(', ')}
         WHERE id = $${paramIndex} AND deleted_at IS NULL
         RETURNING *`,
        values
      );

      if (!row) return null;

      // Update permisos if provided
      if (data.permisoIds !== undefined) {
        await txExecute(`DELETE FROM roles_permisos WHERE rol_id = $1`, [id]);
        for (const permisoId of data.permisoIds) {
          await txExecute(
            `INSERT INTO roles_permisos (rol_id, permiso_id) VALUES ($1, $2)`,
            [id, permisoId]
          );
        }
      }

      return toCamelCase<Rol>(row);
    });
  }

  async findAllWithPermisos(): Promise<RolConPermisos[]> {
    const result = await this.findAll({ limit: 100 });

    const rolesConPermisos = await Promise.all(
      result.data.map(async (rol) => {
        const permisos = await this.getPermisos(rol.id);
        return { ...rol, permisos };
      })
    );

    return rolesConPermisos;
  }
}

export const rolRepository = new RolRepository();

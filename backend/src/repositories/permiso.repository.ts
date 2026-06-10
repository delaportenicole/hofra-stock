import { query, queryOne } from '../config/database.js';
import { BaseRepository } from './base.repository.js';
import { toCamelCase } from '../types/index.js';
import type { Permiso } from '@hofra/shared';

export class PermisoRepository extends BaseRepository<Permiso> {
  constructor() {
    super('permisos', 'modulo');
  }

  async findByModuloAccion(modulo: string, accion: string): Promise<Permiso | null> {
    const row = await queryOne<Record<string, unknown>>(
      `SELECT * FROM permisos WHERE modulo = $1 AND accion = $2 AND deleted_at IS NULL`,
      [modulo, accion]
    );

    return row ? toCamelCase<Permiso>(row) : null;
  }

  async findByModulo(modulo: string): Promise<Permiso[]> {
    const rows = await query<Record<string, unknown>>(
      `SELECT * FROM permisos WHERE modulo = $1 AND deleted_at IS NULL ORDER BY accion`,
      [modulo]
    );

    return rows.map((row) => toCamelCase<Permiso>(row));
  }

  async findAllGroupedByModulo(): Promise<Record<string, Permiso[]>> {
    const result = await this.findAll({ limit: 200, sortBy: 'modulo', sortOrder: 'asc' });

    const grouped: Record<string, Permiso[]> = {};
    for (const permiso of result.data) {
      if (!grouped[permiso.modulo]) {
        grouped[permiso.modulo] = [];
      }
      grouped[permiso.modulo].push(permiso);
    }

    return grouped;
  }
}

export const permisoRepository = new PermisoRepository();

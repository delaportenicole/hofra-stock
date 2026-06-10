import { query, queryOne } from '../config/database.js';
import { BaseRepository, type FindOptions } from './base.repository.js';
import { toCamelCase, type PaginatedResult } from '../types/index.js';
import type { AuditLog, AuditLogConUsuario, AuditLogFiltros } from '@hofra/shared';

export class AuditLogRepository extends BaseRepository<AuditLog> {
  constructor() {
    super('audit_log', 'created_at');
  }

  async findAllWithUsuario(
    filtros: AuditLogFiltros = {},
    options: FindOptions = {}
  ): Promise<PaginatedResult<AuditLogConUsuario>> {
    const { page = 1, limit = 20, sortOrder = 'desc' } = options;
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (filtros.usuarioId) {
      conditions.push(`al.usuario_id = $${paramIndex++}`);
      values.push(filtros.usuarioId);
    }

    if (filtros.accion) {
      conditions.push(`al.accion = $${paramIndex++}`);
      values.push(filtros.accion);
    }

    if (filtros.entidad) {
      conditions.push(`al.entidad = $${paramIndex++}`);
      values.push(filtros.entidad);
    }

    if (filtros.entidades && filtros.entidades.length > 0) {
      const placeholders = filtros.entidades.map((_, i) => `$${paramIndex + i}`).join(', ');
      conditions.push(`al.entidad IN (${placeholders})`);
      values.push(...filtros.entidades);
      paramIndex += filtros.entidades.length;
    }

    if (filtros.fechaDesde) {
      conditions.push(`al.created_at >= $${paramIndex++}`);
      values.push(filtros.fechaDesde);
    }

    if (filtros.fechaHasta) {
      conditions.push(`al.created_at <= $${paramIndex++}`);
      values.push(filtros.fechaHasta);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const [rows, countResult] = await Promise.all([
      query<Record<string, unknown>>(
        `SELECT al.*,
                u.id as usuario_id, u.nombre as usuario_nombre, u.apellido as usuario_apellido, u.email as usuario_email
         FROM audit_log al
         LEFT JOIN usuarios u ON u.id = al.usuario_id
         ${whereClause}
         ORDER BY al.created_at ${sortOrder.toUpperCase()}
         LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        [...values, limit, offset]
      ),
      queryOne<{ count: string }>(
        `SELECT COUNT(*) as count FROM audit_log al ${whereClause}`,
        values
      ),
    ]);

    const total = parseInt(countResult?.count || '0', 10);

    return {
      data: rows.map((row) => this.mapToAuditLogConUsuario(row)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getDistinctEntidades(): Promise<string[]> {
    const rows = await query<{ entidad: string }>(
      `SELECT DISTINCT entidad FROM audit_log ORDER BY entidad`
    );

    return rows.map((r) => r.entidad);
  }

  async getDistinctAcciones(): Promise<string[]> {
    const rows = await query<{ accion: string }>(
      `SELECT DISTINCT accion FROM audit_log ORDER BY accion`
    );

    return rows.map((r) => r.accion);
  }

  async findByEntidadId(
    entidad: string,
    entidadId: string
  ): Promise<AuditLogConUsuario[]> {
    const rows = await query<Record<string, unknown>>(
      `SELECT al.*,
              u.id as usuario_id, u.nombre as usuario_nombre, u.apellido as usuario_apellido, u.email as usuario_email
       FROM audit_log al
       LEFT JOIN usuarios u ON u.id = al.usuario_id
       WHERE al.entidad = $1 AND al.entidad_id = $2
       ORDER BY al.created_at ASC`,
      [entidad, entidadId]
    );

    return rows.map((row) => this.mapToAuditLogConUsuario(row));
  }

  private mapToAuditLogConUsuario(row: Record<string, unknown>): AuditLogConUsuario {
    const auditLog = toCamelCase<AuditLog>({
      id: row.id,
      usuario_id: row.usuario_id,
      accion: row.accion,
      entidad: row.entidad,
      entidad_id: row.entidad_id,
      datos_anteriores: row.datos_anteriores,
      datos_nuevos: row.datos_nuevos,
      ip: row.ip,
      user_agent: row.user_agent,
      created_at: row.created_at,
      updated_at: row.updated_at,
      deleted_at: row.deleted_at,
      created_by: row.created_by,
      updated_by: row.updated_by,
    });

    return {
      ...auditLog,
      usuario: row.usuario_nombre
        ? {
            id: row.usuario_id as string,
            nombre: row.usuario_nombre as string,
            apellido: row.usuario_apellido as string,
            email: row.usuario_email as string,
          }
        : null,
    };
  }
}

export const auditLogRepository = new AuditLogRepository();

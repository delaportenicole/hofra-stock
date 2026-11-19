import { query, queryOne, execute } from '../config/database.js';
import { toCamelCase } from '../types/index.js';

export interface ApiKey {
  id: string;
  nombre: string;
  keyHash: string;
  usuarioId: string;
  permisos: string[];
  activa: boolean;
  lastUsedAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
  createdBy: string | null;
}

export class ApiKeyRepository {
  async findByHash(keyHash: string): Promise<ApiKey | null> {
    const row = await queryOne<Record<string, unknown>>(
      `SELECT * FROM api_keys WHERE key_hash = $1 AND activa = true AND revoked_at IS NULL`,
      [keyHash]
    );

    return row ? toCamelCase<ApiKey>(row) : null;
  }

  async findAll(): Promise<ApiKey[]> {
    const rows = await query<Record<string, unknown>>(
      `SELECT * FROM api_keys ORDER BY created_at DESC`
    );

    return rows.map((row) => toCamelCase<ApiKey>(row));
  }

  async touchLastUsed(id: string): Promise<void> {
    await execute(`UPDATE api_keys SET last_used_at = NOW() WHERE id = $1`, [id]);
  }

  async create(data: {
    nombre: string;
    keyHash: string;
    usuarioId: string;
    permisos: string[];
    createdBy?: string;
  }): Promise<ApiKey> {
    const row = await queryOne<Record<string, unknown>>(
      `INSERT INTO api_keys (nombre, key_hash, usuario_id, permisos, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [data.nombre, data.keyHash, data.usuarioId, data.permisos, data.createdBy || null]
    );

    if (!row) throw new Error('Failed to create api key');

    return toCamelCase<ApiKey>(row);
  }

  async revoke(id: string): Promise<boolean> {
    const rowCount = await execute(
      `UPDATE api_keys SET activa = false, revoked_at = NOW() WHERE id = $1`,
      [id]
    );

    return rowCount > 0;
  }
}

export const apiKeyRepository = new ApiKeyRepository();

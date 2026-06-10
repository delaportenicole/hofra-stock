import { query, queryOne, execute } from '../config/database.js';

export interface RefreshTokenRow {
  id: string;
  usuario_id: string;
  token_hash: string;
  expires_at: Date;
  revoked: boolean;
  created_at: Date;
}

export class RefreshTokenRepository {
  async create(usuarioId: string, tokenHash: string, expiresAt: Date): Promise<void> {
    await execute(
      `INSERT INTO refresh_tokens (usuario_id, token_hash, expires_at)
       VALUES ($1, $2, $3)`,
      [usuarioId, tokenHash, expiresAt]
    );
  }

  async findByTokenHash(tokenHash: string): Promise<RefreshTokenRow | null> {
    const row = await queryOne<RefreshTokenRow>(
      `SELECT * FROM refresh_tokens
       WHERE token_hash = $1 AND revoked = false AND expires_at > NOW()`,
      [tokenHash]
    );

    return row;
  }

  async revoke(tokenHash: string): Promise<void> {
    await execute(
      `UPDATE refresh_tokens SET revoked = true WHERE token_hash = $1`,
      [tokenHash]
    );
  }

  async revokeAllForUser(usuarioId: string): Promise<void> {
    await execute(
      `UPDATE refresh_tokens SET revoked = true WHERE usuario_id = $1`,
      [usuarioId]
    );
  }

  async deleteExpired(): Promise<number> {
    return await execute(
      `DELETE FROM refresh_tokens WHERE expires_at < NOW() OR revoked = true`
    );
  }
}

export const refreshTokenRepository = new RefreshTokenRepository();

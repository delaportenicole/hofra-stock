import { query, queryOne } from '../config/database.js';

export interface GoogleIntegracion {
  id: string;
  refreshToken: string;
  connectedEmail: string | null;
  connectedAt: Date;
  updatedAt: Date;
}

class GoogleIntegracionRepository {
  async get(): Promise<GoogleIntegracion | null> {
    const row = await queryOne<Record<string, unknown>>(
      `SELECT * FROM google_integracion ORDER BY connected_at DESC LIMIT 1`
    );
    if (!row) return null;
    return this.map(row);
  }

  async upsert(data: { refreshToken: string; connectedEmail: string | null }): Promise<GoogleIntegracion> {
    // Solo se admite una cuenta conectada: se reemplaza cualquier conexión previa
    await query(`DELETE FROM google_integracion`);
    const row = await queryOne<Record<string, unknown>>(
      `INSERT INTO google_integracion (refresh_token, connected_email)
       VALUES ($1, $2)
       RETURNING *`,
      [data.refreshToken, data.connectedEmail]
    );
    if (!row) throw new Error('Failed to save Google integration');
    return this.map(row);
  }

  private map(row: Record<string, unknown>): GoogleIntegracion {
    return {
      id: row.id as string,
      refreshToken: row.refresh_token as string,
      connectedEmail: row.connected_email as string | null,
      connectedAt: row.connected_at as Date,
      updatedAt: row.updated_at as Date,
    };
  }
}

export const googleIntegracionRepository = new GoogleIntegracionRepository();

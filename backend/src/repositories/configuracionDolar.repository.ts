import { query, queryOne, execute } from '../config/database.js';
import { toCamelCase } from '../types/index.js';
import type { ConfiguracionDolar } from '@hofra/shared';

class ConfiguracionDolarRepository {
  async getVigente(): Promise<ConfiguracionDolar | null> {
    const row = await queryOne<Record<string, unknown>>(
      `SELECT * FROM configuracion_dolar LIMIT 1`
    );

    if (!row) return null;

    // Postgres devuelve NUMERIC como string; toCamelCase solo renombra claves, no castea tipos
    const configuracion = toCamelCase<ConfiguracionDolar>(row);
    return { ...configuracion, valorDolarOficial: Number(configuracion.valorDolarOficial) };
  }

  async setVigente(valorDolarOficial: number, updatedBy?: string): Promise<void> {
    const updated = await execute(
      `UPDATE configuracion_dolar SET valor_dolar_oficial = $1, updated_by = $2`,
      [valorDolarOficial, updatedBy || null]
    );

    if (updated === 0) {
      await query(
        `INSERT INTO configuracion_dolar (valor_dolar_oficial, updated_by) VALUES ($1, $2)`,
        [valorDolarOficial, updatedBy || null]
      );
    }
  }
}

export const configuracionDolarRepository = new ConfiguracionDolarRepository();

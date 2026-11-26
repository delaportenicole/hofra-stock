import { query, queryOne } from '../config/database.js';
import { BaseRepository } from './base.repository.js';
import { toCamelCase } from '../types/index.js';
import type { SinonimoColumnaExcel, CampoSinonimoExcel } from '@hofra/shared';

export class SinonimoColumnaExcelRepository extends BaseRepository<SinonimoColumnaExcel> {
  constructor() {
    super('sinonimos_columna_excel', 'campo');
  }

  async findAllActivos(): Promise<SinonimoColumnaExcel[]> {
    const rows = await query<Record<string, unknown>>(
      `SELECT * FROM sinonimos_columna_excel
       WHERE deleted_at IS NULL
       ORDER BY campo ASC, sinonimo ASC`
    );

    return rows.map((row) => toCamelCase<SinonimoColumnaExcel>(row));
  }

  async findByCampoYSinonimo(campo: CampoSinonimoExcel, sinonimo: string): Promise<SinonimoColumnaExcel | null> {
    const row = await queryOne<Record<string, unknown>>(
      `SELECT * FROM sinonimos_columna_excel
       WHERE campo = $1 AND UPPER(sinonimo) = UPPER($2) AND deleted_at IS NULL`,
      [campo, sinonimo]
    );

    return row ? toCamelCase<SinonimoColumnaExcel>(row) : null;
  }

  async create(data: { campo: CampoSinonimoExcel; sinonimo: string; createdBy?: string }): Promise<SinonimoColumnaExcel> {
    const row = await queryOne<Record<string, unknown>>(
      `INSERT INTO sinonimos_columna_excel (campo, sinonimo, created_by)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [data.campo, data.sinonimo, data.createdBy || null]
    );

    if (!row) throw new Error('Failed to create sinonimo');

    return toCamelCase<SinonimoColumnaExcel>(row);
  }
}

export const sinonimoColumnaExcelRepository = new SinonimoColumnaExcelRepository();

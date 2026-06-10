import { query, queryOne } from '../config/database.js';
import { BaseRepository, type FindOptions } from './base.repository.js';
import { toCamelCase, type PaginatedResult } from '../types/index.js';
import type { Cliente } from '@hofra/shared';

export class ClienteRepository extends BaseRepository<Cliente> {
  constructor() {
    super('clientes', 'razon_social');
  }

  async findByCuit(cuit: string): Promise<Cliente | null> {
    const row = await queryOne<Record<string, unknown>>(
      `SELECT * FROM clientes WHERE cuit = $1 AND deleted_at IS NULL`,
      [cuit.replace(/-/g, '')]
    );

    return row ? toCamelCase<Cliente>(row) : null;
  }

  async create(data: {
    razonSocial: string;
    cuit: string;
    direccion?: string | null;
    telefono?: string | null;
    email?: string | null;
    contacto?: string | null;
    notas?: string | null;
    createdBy?: string;
  }): Promise<Cliente> {
    const row = await queryOne<Record<string, unknown>>(
      `INSERT INTO clientes (razon_social, cuit, direccion, telefono, email, contacto, notas, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        data.razonSocial,
        data.cuit.replace(/-/g, ''),
        data.direccion || null,
        data.telefono || null,
        data.email || null,
        data.contacto || null,
        data.notas || null,
        data.createdBy || null,
      ]
    );

    if (!row) throw new Error('Failed to create cliente');

    return toCamelCase<Cliente>(row);
  }

  async update(
    id: string,
    data: Partial<{
      razonSocial: string;
      cuit: string;
      direccion: string | null;
      telefono: string | null;
      email: string | null;
      contacto: string | null;
      notas: string | null;
      activo: boolean;
    }>,
    updatedBy?: string
  ): Promise<Cliente | null> {
    const sets: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (data.razonSocial !== undefined) {
      sets.push(`razon_social = $${paramIndex++}`);
      values.push(data.razonSocial);
    }
    if (data.cuit !== undefined) {
      sets.push(`cuit = $${paramIndex++}`);
      values.push(data.cuit.replace(/-/g, ''));
    }
    if (data.direccion !== undefined) {
      sets.push(`direccion = $${paramIndex++}`);
      values.push(data.direccion);
    }
    if (data.telefono !== undefined) {
      sets.push(`telefono = $${paramIndex++}`);
      values.push(data.telefono);
    }
    if (data.email !== undefined) {
      sets.push(`email = $${paramIndex++}`);
      values.push(data.email);
    }
    if (data.contacto !== undefined) {
      sets.push(`contacto = $${paramIndex++}`);
      values.push(data.contacto);
    }
    if (data.notas !== undefined) {
      sets.push(`notas = $${paramIndex++}`);
      values.push(data.notas);
    }
    if (data.activo !== undefined) {
      sets.push(`activo = $${paramIndex++}`);
      values.push(data.activo);
    }

    sets.push(`updated_by = $${paramIndex++}`);
    values.push(updatedBy || null);

    values.push(id);

    const row = await queryOne<Record<string, unknown>>(
      `UPDATE clientes SET ${sets.join(', ')}
       WHERE id = $${paramIndex} AND deleted_at IS NULL
       RETURNING *`,
      values
    );

    return row ? toCamelCase<Cliente>(row) : null;
  }

  async search(
    term: string,
    options: FindOptions = {}
  ): Promise<PaginatedResult<Cliente>> {
    const { page = 1, limit = 20 } = options;
    const offset = (page - 1) * limit;
    const searchTerm = `%${term}%`;

    const [rows, countResult] = await Promise.all([
      query<Record<string, unknown>>(
        `SELECT * FROM clientes
         WHERE deleted_at IS NULL
         AND (razon_social ILIKE $1 OR cuit LIKE $1)
         ORDER BY razon_social
         LIMIT $2 OFFSET $3`,
        [searchTerm, limit, offset]
      ),
      queryOne<{ count: string }>(
        `SELECT COUNT(*) as count FROM clientes
         WHERE deleted_at IS NULL
         AND (razon_social ILIKE $1 OR cuit LIKE $1)`,
        [searchTerm]
      ),
    ]);

    const total = parseInt(countResult?.count || '0', 10);

    return {
      data: rows.map((row) => toCamelCase<Cliente>(row)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findActive(): Promise<Cliente[]> {
    const rows = await query<Record<string, unknown>>(
      `SELECT * FROM clientes WHERE activo = true AND deleted_at IS NULL ORDER BY razon_social`,
      []
    );

    return rows.map((row) => toCamelCase<Cliente>(row));
  }
}

export const clienteRepository = new ClienteRepository();

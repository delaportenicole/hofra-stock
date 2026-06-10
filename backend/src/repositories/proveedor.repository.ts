import { query, queryOne } from '../config/database.js';
import { BaseRepository, type FindOptions } from './base.repository.js';
import { toCamelCase, type PaginatedResult } from '../types/index.js';
import type { Proveedor } from '@hofra/shared';

export class ProveedorRepository extends BaseRepository<Proveedor> {
  constructor() {
    super('proveedores', 'razon_social');
  }

  async findByCuit(cuit: string): Promise<Proveedor | null> {
    const row = await queryOne<Record<string, unknown>>(
      `SELECT * FROM proveedores WHERE cuit = $1 AND deleted_at IS NULL`,
      [cuit.replace(/-/g, '')]
    );

    return row ? toCamelCase<Proveedor>(row) : null;
  }

  async create(data: {
    razonSocial: string;
    nombreFantasia?: string | null;
    cuit?: string | null;
    direccion?: string | null;
    telefono?: string | null;
    email?: string | null;
    contacto?: string | null;
    notas?: string | null;
    createdBy?: string;
  }): Promise<Proveedor> {
    const row = await queryOne<Record<string, unknown>>(
      `INSERT INTO proveedores (razon_social, nombre_fantasia, cuit, direccion, telefono, email, contacto, notas, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        data.razonSocial,
        data.nombreFantasia || null,
        data.cuit ? data.cuit.replace(/-/g, '') : null,
        data.direccion || null,
        data.telefono || null,
        data.email || null,
        data.contacto || null,
        data.notas || null,
        data.createdBy || null,
      ]
    );

    if (!row) throw new Error('Failed to create proveedor');

    return toCamelCase<Proveedor>(row);
  }

  async update(
    id: string,
    data: Partial<{
      razonSocial: string;
      nombreFantasia: string | null;
      cuit: string | null;
      direccion: string | null;
      telefono: string | null;
      email: string | null;
      contacto: string | null;
      notas: string | null;
      activo: boolean;
    }>,
    updatedBy?: string
  ): Promise<Proveedor | null> {
    const sets: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (data.razonSocial !== undefined) {
      sets.push(`razon_social = $${paramIndex++}`);
      values.push(data.razonSocial);
    }
    if (data.nombreFantasia !== undefined) {
      sets.push(`nombre_fantasia = $${paramIndex++}`);
      values.push(data.nombreFantasia);
    }
    if (data.cuit !== undefined) {
      sets.push(`cuit = $${paramIndex++}`);
      values.push(data.cuit ? data.cuit.replace(/-/g, '') : null);
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
      `UPDATE proveedores SET ${sets.join(', ')}
       WHERE id = $${paramIndex} AND deleted_at IS NULL
       RETURNING *`,
      values
    );

    return row ? toCamelCase<Proveedor>(row) : null;
  }

  async search(
    term: string,
    options: FindOptions = {}
  ): Promise<PaginatedResult<Proveedor>> {
    const { page = 1, limit = 20 } = options;
    const offset = (page - 1) * limit;
    const searchTerm = `%${term}%`;

    const [rows, countResult] = await Promise.all([
      query<Record<string, unknown>>(
        `SELECT * FROM proveedores
         WHERE deleted_at IS NULL
         AND (razon_social ILIKE $1 OR cuit LIKE $1)
         ORDER BY razon_social
         LIMIT $2 OFFSET $3`,
        [searchTerm, limit, offset]
      ),
      queryOne<{ count: string }>(
        `SELECT COUNT(*) as count FROM proveedores
         WHERE deleted_at IS NULL
         AND (razon_social ILIKE $1 OR cuit LIKE $1)`,
        [searchTerm]
      ),
    ]);

    const total = parseInt(countResult?.count || '0', 10);

    return {
      data: rows.map((row) => toCamelCase<Proveedor>(row)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findActive(): Promise<Proveedor[]> {
    const rows = await query<Record<string, unknown>>(
      `SELECT * FROM proveedores WHERE activo = true AND deleted_at IS NULL ORDER BY razon_social`,
      []
    );

    return rows.map((row) => toCamelCase<Proveedor>(row));
  }
}

export const proveedorRepository = new ProveedorRepository();

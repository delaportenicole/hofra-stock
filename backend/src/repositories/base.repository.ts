import { query, queryOne, execute } from '../config/database.js';
import { toCamelCase } from '../types/index.js';
import type { PaginatedResult } from '../types/index.js';

export interface FindOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  includeDeleted?: boolean;
}

export abstract class BaseRepository<T> {
  constructor(
    protected tableName: string,
    protected defaultSortBy: string = 'created_at'
  ) {}

  async findAll(options: FindOptions = {}): Promise<PaginatedResult<T>> {
    const {
      page = 1,
      limit = 20,
      sortBy = this.defaultSortBy,
      sortOrder = 'desc',
      includeDeleted = false,
    } = options;

    const offset = (page - 1) * limit;
    const whereClause = includeDeleted ? '' : 'WHERE deleted_at IS NULL';
    const orderClause = `ORDER BY ${sortBy} ${sortOrder.toUpperCase()}`;

    const [rows, countResult] = await Promise.all([
      query<Record<string, unknown>>(
        `SELECT * FROM ${this.tableName} ${whereClause} ${orderClause} LIMIT $1 OFFSET $2`,
        [limit, offset]
      ),
      queryOne<{ count: string }>(
        `SELECT COUNT(*) as count FROM ${this.tableName} ${whereClause}`
      ),
    ]);

    const total = parseInt(countResult?.count || '0', 10);

    return {
      data: rows.map((row) => toCamelCase<T>(row)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string, includeDeleted: boolean = false): Promise<T | null> {
    const whereClause = includeDeleted
      ? 'WHERE id = $1'
      : 'WHERE id = $1 AND deleted_at IS NULL';

    const row = await queryOne<Record<string, unknown>>(
      `SELECT * FROM ${this.tableName} ${whereClause}`,
      [id]
    );

    return row ? toCamelCase<T>(row) : null;
  }

  async softDelete(id: string, userId?: string): Promise<boolean> {
    const rowCount = await execute(
      `UPDATE ${this.tableName}
       SET deleted_at = NOW(), updated_by = $2
       WHERE id = $1 AND deleted_at IS NULL`,
      [id, userId || null]
    );

    return rowCount > 0;
  }

  async hardDelete(id: string): Promise<boolean> {
    const rowCount = await execute(
      `DELETE FROM ${this.tableName} WHERE id = $1`,
      [id]
    );

    return rowCount > 0;
  }

  async exists(id: string): Promise<boolean> {
    const result = await queryOne<{ exists: boolean }>(
      `SELECT EXISTS(SELECT 1 FROM ${this.tableName} WHERE id = $1 AND deleted_at IS NULL) as exists`,
      [id]
    );

    return result?.exists ?? false;
  }

  async count(whereClause: string = '', params: unknown[] = []): Promise<number> {
    const fullWhere = whereClause
      ? `WHERE deleted_at IS NULL AND ${whereClause}`
      : 'WHERE deleted_at IS NULL';

    const result = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM ${this.tableName} ${fullWhere}`,
      params
    );

    return parseInt(result?.count || '0', 10);
  }
}

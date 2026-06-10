import type { Request } from 'express';
import type { JwtPayload } from '@hofra/shared';

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

export interface DbRow {
  [key: string]: unknown;
}

// Mapeo de nombres de columnas snake_case a camelCase
export function toCamelCase<T>(row: DbRow): T {
  const result: Record<string, unknown> = {};

  for (const key in row) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) =>
      letter.toUpperCase()
    );
    const value = row[key];

    // Convertir fechas de PostgreSQL a Date de JS
    if (value instanceof Date) {
      result[camelKey] = value;
    } else {
      result[camelKey] = value;
    }
  }

  return result as T;
}

// Mapeo de nombres de propiedades camelCase a snake_case
export function toSnakeCase(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const key in obj) {
    const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
    result[snakeKey] = obj[key];
  }

  return result;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: PaginationMeta;
}

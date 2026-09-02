import pg from 'pg';
import dns from 'dns';
import { env } from './env.js';

// Force Node.js to accept self-signed certificates globally
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Force IPv4 for DNS resolution (fixes Render -> Supabase connection issues)
dns.setDefaultResultOrder('ipv4first');

const { Pool } = pg;

// Ensure connection string has sslmode parameter
let connectionString = env.DATABASE_URL;

if (!connectionString) {
  console.warn('Warning: DATABASE_URL not set. Database features will not work.');
} else if (!connectionString.includes('sslmode=')) {
  // Add sslmode=require if not present
  connectionString += connectionString.includes('?') ? '&sslmode=require' : '?sslmode=require';
}

export const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false,
  },
});

export async function query<T = unknown>(
  text: string,
  params?: unknown[]
): Promise<T[]> {
  const result = await pool.query(text, params);
  return result.rows as T[];
}

export async function queryOne<T = unknown>(
  text: string,
  params?: unknown[]
): Promise<T | null> {
  const result = await pool.query(text, params);
  return (result.rows[0] as T) || null;
}

export async function execute(
  text: string,
  params?: unknown[]
): Promise<number> {
  const result = await pool.query(text, params);
  return result.rowCount ?? 0;
}

export async function transaction<T>(
  callback: (client: {
    query: typeof query;
    queryOne: typeof queryOne;
    execute: typeof execute;
  }) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback({
      query: async <R = unknown>(text: string, params?: unknown[]) => {
        const res = await client.query(text, params);
        return res.rows as R[];
      },
      queryOne: async <R = unknown>(text: string, params?: unknown[]) => {
        const res = await client.query(text, params);
        return (res.rows[0] as R) || null;
      },
      execute: async (text: string, params?: unknown[]) => {
        const res = await client.query(text, params);
        return res.rowCount ?? 0;
      },
    });
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function testConnection(): Promise<boolean> {
  try {
    await pool.query('SELECT NOW()');
    return true;
  } catch (error) {
    console.error('Database connection error:', error);
    return false;
  }
}

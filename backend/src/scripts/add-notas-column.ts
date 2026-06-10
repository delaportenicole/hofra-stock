import { pool } from '../config/database.js';

async function addNotasColumn() {
  console.log('Adding notas column to clientes and proveedores tables...');

  try {
    await pool.query('ALTER TABLE clientes ADD COLUMN IF NOT EXISTS notas TEXT;');
    console.log('Column added to clientes');
    await pool.query('ALTER TABLE proveedores ADD COLUMN IF NOT EXISTS notas TEXT;');
    console.log('Column added to proveedores');
    process.exit(0);
  } catch (error) {
    console.error('Failed:', error);
    process.exit(1);
  }
}

addNotasColumn();

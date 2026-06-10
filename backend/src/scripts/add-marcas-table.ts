import { pool } from '../config/database.js';

async function addMarcasTable() {
  console.log('Updating marcas table...');

  try {
    // Add missing columns
    await pool.query(`
      ALTER TABLE marcas ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES usuarios(id);
    `);
    await pool.query(`
      ALTER TABLE marcas ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES usuarios(id);
    `);
    console.log('Columns created_by and updated_by added');

    process.exit(0);
  } catch (error) {
    console.error('Failed:', error);
    process.exit(1);
  }
}

addMarcasTable();

import { pool } from '../config/database.js';

async function addNombreFantasiaColumn() {
  console.log('Updating proveedores table...');

  try {
    // Add nombre_fantasia column
    await pool.query('ALTER TABLE proveedores ADD COLUMN IF NOT EXISTS nombre_fantasia VARCHAR(200);');
    console.log('Column nombre_fantasia added');

    // Make cuit nullable and remove unique constraint
    await pool.query('ALTER TABLE proveedores ALTER COLUMN cuit DROP NOT NULL;');
    console.log('CUIT is now optional');

    process.exit(0);
  } catch (error) {
    console.error('Failed:', error);
    process.exit(1);
  }
}

addNombreFantasiaColumn();

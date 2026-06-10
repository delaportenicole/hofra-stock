import pg from 'pg';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '..', '.env') });

const { Pool } = pg;

async function migrate() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('Conectando a la base de datos...');
    await pool.query('SELECT NOW()');
    console.log('Conexion exitosa');

    console.log('Ejecutando migracion: Agregar estado a reposiciones...');

    // Agregar columna de estado
    await pool.query(`
      ALTER TABLE reposiciones
      ADD COLUMN IF NOT EXISTS estado VARCHAR(20) NOT NULL DEFAULT 'activa';
    `);
    console.log('✓ Columna estado agregada');

    // Agregar constraint de valores permitidos
    await pool.query(`
      DO $$ BEGIN
        ALTER TABLE reposiciones
        ADD CONSTRAINT chk_reposicion_estado
        CHECK (estado IN ('activa', 'cancelada'));
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
    `);
    console.log('✓ Constraint de estado agregada');

    // Indice para filtrar por estado
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_reposiciones_estado
      ON reposiciones(estado) WHERE deleted_at IS NULL;
    `);
    console.log('✓ Indice idx_reposiciones_estado creado');

    console.log('\n✅ Migracion completada exitosamente');

  } catch (error) {
    console.error('Error en la migracion:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();

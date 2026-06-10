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

    console.log('Ejecutando migracion: Actualizar estados de reposiciones...');

    // Eliminar constraint anterior
    await pool.query(`
      ALTER TABLE reposiciones DROP CONSTRAINT IF EXISTS chk_reposicion_estado;
    `);
    console.log('✓ Constraint anterior eliminada');

    // Actualizar valores existentes
    await pool.query(`
      UPDATE reposiciones SET estado = 'en_curso' WHERE estado = 'activa';
    `);
    console.log('✓ Estados "activa" actualizados a "en_curso"');

    // Cambiar default
    await pool.query(`
      ALTER TABLE reposiciones ALTER COLUMN estado SET DEFAULT 'en_curso';
    `);
    console.log('✓ Default actualizado a "en_curso"');

    // Agregar nuevo constraint
    await pool.query(`
      ALTER TABLE reposiciones
      ADD CONSTRAINT chk_reposicion_estado
      CHECK (estado IN ('en_curso', 'confirmada', 'cancelada'));
    `);
    console.log('✓ Nuevo constraint agregado (en_curso, confirmada, cancelada)');

    console.log('\n✅ Migracion completada exitosamente');

  } catch (error) {
    console.error('Error en la migracion:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();

import pg from 'pg';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cargar variables de entorno desde la raíz del proyecto
dotenv.config({ path: join(__dirname, '..', '..', '.env') });

const { Pool } = pg;

async function migrate() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('Conectando a la base de datos...');

    // Verificar conexión
    await pool.query('SELECT NOW()');
    console.log('Conexión exitosa');

    console.log('Ejecutando migración: Extender tabla reposiciones...');

    // Agregar columnas nuevas
    await pool.query(`
      -- Costo de reposición en pesos
      ALTER TABLE reposiciones ADD COLUMN IF NOT EXISTS costo_reposicion DECIMAL(12,2);
    `);
    console.log('✓ Columna costo_reposicion agregada');

    await pool.query(`
      -- Valor del dólar oficial al momento de la reposición
      ALTER TABLE reposiciones ADD COLUMN IF NOT EXISTS valor_dolar_oficial DECIMAL(10,2);
    `);
    console.log('✓ Columna valor_dolar_oficial agregada');

    await pool.query(`
      -- Costo de reposición en dólares
      ALTER TABLE reposiciones ADD COLUMN IF NOT EXISTS costo_reposicion_dolares DECIMAL(12,2);
    `);
    console.log('✓ Columna costo_reposicion_dolares agregada');

    await pool.query(`
      -- Fecha de vencimiento del producto
      ALTER TABLE reposiciones ADD COLUMN IF NOT EXISTS fecha_vencimiento DATE;
    `);
    console.log('✓ Columna fecha_vencimiento agregada');

    await pool.query(`
      -- Lote o partida del producto
      ALTER TABLE reposiciones ADD COLUMN IF NOT EXISTS lote_partida VARCHAR(100);
    `);
    console.log('✓ Columna lote_partida agregada');

    await pool.query(`
      -- Link de la compra
      ALTER TABLE reposiciones ADD COLUMN IF NOT EXISTS link_compra TEXT;
    `);
    console.log('✓ Columna link_compra agregada');

    await pool.query(`
      -- Lugar de compra
      ALTER TABLE reposiciones ADD COLUMN IF NOT EXISTS lugar_compra VARCHAR(200);
    `);
    console.log('✓ Columna lugar_compra agregada');

    // Crear índices
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_reposiciones_vencimiento
      ON reposiciones(fecha_vencimiento)
      WHERE deleted_at IS NULL AND fecha_vencimiento IS NOT NULL;
    `);
    console.log('✓ Índice idx_reposiciones_vencimiento creado');

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_reposiciones_lote
      ON reposiciones(lote_partida)
      WHERE deleted_at IS NULL AND lote_partida IS NOT NULL;
    `);
    console.log('✓ Índice idx_reposiciones_lote creado');

    console.log('\n✅ Migración completada exitosamente');

  } catch (error) {
    console.error('Error en la migración:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';
import { pool } from '../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function ask(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, (answer) => {
    rl.close();
    resolve(answer);
  }));
}

async function resetData() {
  const sqlPath = path.join(__dirname, '../../../database/scripts/clean_database_keep_users.sql');
  const sql = fs.readFileSync(sqlPath, 'utf-8');

  console.log('Esto va a borrar TODOS los datos operativos (articulos, marcas, rubros,');
  console.log('proveedores, clientes, reposiciones, entregas, sugerencias, cotizaciones).');
  console.log('Se conservan: usuarios, roles, permisos y la integración con Google.');
  console.log(`Base de datos destino: ${process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':****@')}`);

  const skipConfirm = process.argv.includes('--yes');
  if (!skipConfirm) {
    const answer = await ask('Escribí "BORRAR" para confirmar: ');
    if (answer.trim() !== 'BORRAR') {
      console.log('Cancelado, no se modificó nada.');
      process.exit(0);
    }
  }

  try {
    await pool.query(sql);
    console.log('Datos operativos eliminados. Listo para un nuevo import.');
    process.exit(0);
  } catch (error) {
    console.error('Falló el reset:', error);
    process.exit(1);
  }
}

resetData();

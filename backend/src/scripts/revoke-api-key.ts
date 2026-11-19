// Revoca una API key existente (ej. si se filtró o ya no se usa).
// Uso: npm run revoke-api-key --workspace=backend -- --id <uuid>
import { pool } from '../config/database.js';
import { apiKeyRepository } from '../repositories/apiKey.repository.js';

async function main() {
  const args = process.argv.slice(2);
  const index = args.indexOf('--id');
  const id = index >= 0 ? args[index + 1] : undefined;

  if (!id) {
    console.error('Uso: npm run revoke-api-key --workspace=backend -- --id <uuid>');
    process.exit(1);
  }

  try {
    const revocada = await apiKeyRepository.revoke(id);
    if (revocada) {
      console.log(`API key ${id} revocada.`);
    } else {
      console.error(`No se encontró ninguna API key con id ${id}.`);
      process.exit(1);
    }
  } finally {
    await pool.end();
  }
}

main();

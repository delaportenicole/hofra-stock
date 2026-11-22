// Crea (o reutiliza) un usuario "identidad de servicio" y genera una API key nueva para él.
// Uso: npm run create-api-key --workspace=backend -- --nombre "Hofra AI Agent" --email ai-agent@hofra.internal --permisos articulos:leer,rubros:leer,proveedores:leer,clientes:leer
//
// La key en texto plano NUNCA se imprime en consola — se escribe directo en ai-agent/.env
// (reemplazando la línea HOFRA_API_KEY= si ya existía) y no queda guardada en ningún otro
// lado (solo su hash SHA-256 en la DB). Si se pierde, hay que generar una nueva con este
// mismo script; la vieja hay que revocarla con revoke-api-key.ts.
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import { pool, queryOne } from '../config/database.js';
import { hashToken } from '../utils/jwt.js';
import { apiKeyRepository } from '../repositories/apiKey.repository.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../../../');
const ENV_PATH = path.join(REPO_ROOT, 'ai-agent', '.env');
const ENV_EXAMPLE_PATH = path.join(REPO_ROOT, 'ai-agent', '.env.example');

function escribirKeyEnEnv(keyPlano: string): void {
  const base = fs.existsSync(ENV_PATH)
    ? fs.readFileSync(ENV_PATH, 'utf-8')
    : fs.existsSync(ENV_EXAMPLE_PATH)
      ? fs.readFileSync(ENV_EXAMPLE_PATH, 'utf-8')
      : '';

  const linea = `HOFRA_API_KEY=${keyPlano}`;
  const contenido = /^HOFRA_API_KEY=.*$/m.test(base)
    ? base.replace(/^HOFRA_API_KEY=.*$/m, linea)
    : `${base.trimEnd()}\n${linea}\n`;

  fs.writeFileSync(ENV_PATH, contenido);
}

function enmascarar(keyPlano: string): string {
  return `${keyPlano.slice(0, 10)}...${keyPlano.slice(-4)}`;
}

function parseArgs(): { nombre: string; email: string; permisos: string[] } {
  const args = process.argv.slice(2);
  const get = (flag: string): string | undefined => {
    const index = args.indexOf(flag);
    return index >= 0 ? args[index + 1] : undefined;
  };

  const nombre = get('--nombre') || 'Hofra AI Agent';
  const email = get('--email') || 'ai-agent@hofra.internal';
  const permisosArg = get('--permisos') || 'articulos:leer,rubros:leer,proveedores:leer,clientes:leer';
  const permisos = permisosArg.split(',').map((p) => p.trim()).filter(Boolean);

  return { nombre, email, permisos };
}

async function generarUsernameDisponible(email: string): Promise<string> {
  const base = email.split('@')[0].replace(/[^a-z0-9.-]/gi, '').toLowerCase() || 'servicio';

  for (let sufijo = 0; ; sufijo++) {
    const candidato = sufijo === 0 ? base : `${base}-${sufijo}`;
    const existente = await queryOne<{ id: string }>(
      'SELECT id FROM usuarios WHERE username = $1 AND deleted_at IS NULL',
      [candidato]
    );
    if (!existente) return candidato;
  }
}

async function obtenerOCrearUsuarioServicio(email: string, nombre: string): Promise<string> {
  const existente = await queryOne<{ id: string }>(
    'SELECT id FROM usuarios WHERE email = $1',
    [email]
  );
  if (existente) return existente.id;

  // Password inutilizable: nunca se guarda ni se usa para loguear, solo satisface el NOT NULL.
  const passwordAleatoria = crypto.randomBytes(32).toString('hex');
  const passwordHash = await bcrypt.hash(passwordAleatoria, 12);
  const username = await generarUsernameDisponible(email);

  const row = await queryOne<{ id: string }>(
    `INSERT INTO usuarios (email, username, password_hash, nombre, apellido, activo)
     VALUES ($1, $2, $3, $4, 'Identidad de servicio', true)
     RETURNING id`,
    [email, username, passwordHash, nombre]
  );
  if (!row) throw new Error('No se pudo crear el usuario de servicio');

  console.log(`Usuario de servicio creado: ${email} / username "${username}" (${row.id})`);
  return row.id;
}

async function main() {
  const { nombre, email, permisos } = parseArgs();

  try {
    const usuarioId = await obtenerOCrearUsuarioServicio(email, nombre);

    const keyPlano = `hofra_${crypto.randomBytes(32).toString('hex')}`;
    const keyHash = hashToken(keyPlano);

    const apiKey = await apiKeyRepository.create({
      nombre,
      keyHash,
      usuarioId,
      permisos,
    });

    escribirKeyEnEnv(keyPlano);

    console.log('\n API key creada correctamente.');
    console.log(`   id:        ${apiKey.id}`);
    console.log(`   nombre:    ${apiKey.nombre}`);
    console.log(`   permisos:  ${permisos.join(', ')}`);
    console.log(`   key:       ${enmascarar(keyPlano)} (enmascarada a propósito)`);
    console.log(`\n Escrita en ${ENV_PATH} — no se imprime completa en ningún lado.\n`);

    process.exit(0);
  } catch (error) {
    console.error('Error creando la API key:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();

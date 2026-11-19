// Crea (o reutiliza) un usuario "identidad de servicio" y genera una API key nueva para él.
// Uso: npm run create-api-key --workspace=backend -- --nombre "Hofra AI Agent" --email ai-agent@hofra.internal --permisos articulos:leer,rubros:leer,proveedores:leer,clientes:leer
//
// La key en texto plano se imprime UNA sola vez acá abajo — no queda guardada en ningún lado
// (solo su hash SHA-256). Si se pierde, hay que generar una nueva con este mismo script.
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { pool, queryOne } from '../config/database.js';
import { hashToken } from '../utils/jwt.js';
import { apiKeyRepository } from '../repositories/apiKey.repository.js';

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

async function obtenerOCrearUsuarioServicio(email: string, nombre: string): Promise<string> {
  const existente = await queryOne<{ id: string }>(
    'SELECT id FROM usuarios WHERE email = $1',
    [email]
  );
  if (existente) return existente.id;

  // Password inutilizable: nunca se guarda ni se usa para loguear, solo satisface el NOT NULL.
  const passwordAleatoria = crypto.randomBytes(32).toString('hex');
  const passwordHash = await bcrypt.hash(passwordAleatoria, 12);

  const row = await queryOne<{ id: string }>(
    `INSERT INTO usuarios (email, password_hash, nombre, apellido, activo)
     VALUES ($1, $2, $3, 'Identidad de servicio', true)
     RETURNING id`,
    [email, passwordHash, nombre]
  );
  if (!row) throw new Error('No se pudo crear el usuario de servicio');

  console.log(`Usuario de servicio creado: ${email} (${row.id})`);
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

    console.log('\n API key creada correctamente.');
    console.log(`   id:        ${apiKey.id}`);
    console.log(`   nombre:    ${apiKey.nombre}`);
    console.log(`   permisos:  ${permisos.join(', ')}`);
    console.log('\n Guardá esta key ahora — no se puede volver a ver:\n');
    console.log(`   ${keyPlano}\n`);

    process.exit(0);
  } catch (error) {
    console.error('Error creando la API key:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();

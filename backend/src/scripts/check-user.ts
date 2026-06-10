import bcrypt from 'bcryptjs';
import { pool, queryOne } from '../config/database.js';

async function checkUser() {
  try {
    // Check if user exists
    const user = await queryOne<{ id: string; email: string; password_hash: string; activo: boolean }>(
      'SELECT id, email, password_hash, activo FROM usuarios WHERE email = $1',
      ['admin@hofra.com']
    );

    if (!user) {
      console.log('Usuario admin@hofra.com NO EXISTE');

      // Create the user
      const passwordHash = await bcrypt.hash('Admin123!', 12);
      await pool.query(
        `INSERT INTO usuarios (email, password_hash, nombre, apellido, activo)
         VALUES ($1, $2, $3, $4, true)`,
        ['admin@hofra.com', passwordHash, 'Administrador', 'Sistema']
      );

      // Assign admin role
      await pool.query(`
        INSERT INTO usuarios_roles (usuario_id, rol_id)
        SELECT u.id, r.id
        FROM usuarios u, roles r
        WHERE u.email = 'admin@hofra.com' AND r.nombre = 'Administrador'
      `);

      console.log('Usuario creado con password: Admin123!');
    } else {
      console.log('Usuario encontrado:', user.email);
      console.log('Activo:', user.activo);
      console.log('Password hash actual:', user.password_hash.substring(0, 30) + '...');

      // Test password
      const isValid = await bcrypt.compare('Admin123!', user.password_hash);
      console.log('Password "Admin123!" es válido:', isValid);

      if (!isValid) {
        // Update password
        const newHash = await bcrypt.hash('Admin123!', 12);
        await pool.query(
          'UPDATE usuarios SET password_hash = $1 WHERE email = $2',
          [newHash, 'admin@hofra.com']
        );
        console.log('Password actualizado a: Admin123!');
      }
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkUser();

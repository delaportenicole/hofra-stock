import { query, queryOne, execute, transaction } from '../config/database.js';
import { BaseRepository, type FindOptions } from './base.repository.js';
import { toCamelCase, type PaginatedResult } from '../types/index.js';
import type { Usuario, UsuarioConRoles, Rol, Permiso } from '@hofra/shared';

interface UsuarioRow {
  id: string;
  username: string;
  email: string;
  password_hash: string;
  nombre: string;
  apellido: string;
  activo: boolean;
  ultimo_acceso: Date | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
  created_by: string | null;
  updated_by: string | null;
}

export class UsuarioRepository extends BaseRepository<Usuario> {
  constructor() {
    super('usuarios', 'created_at');
  }

  async findByEmail(email: string): Promise<(Usuario & { passwordHash: string }) | null> {
    const row = await queryOne<UsuarioRow>(
      `SELECT * FROM usuarios WHERE email = $1 AND deleted_at IS NULL`,
      [email]
    );

    if (!row) return null;

    return {
      ...toCamelCase<Usuario>(row as unknown as Record<string, unknown>),
      passwordHash: row.password_hash,
    };
  }

  async findByUsername(username: string): Promise<(Usuario & { passwordHash: string }) | null> {
    const row = await queryOne<UsuarioRow>(
      `SELECT * FROM usuarios WHERE username = $1 AND deleted_at IS NULL`,
      [username]
    );

    if (!row) return null;

    return {
      ...toCamelCase<Usuario>(row as unknown as Record<string, unknown>),
      passwordHash: row.password_hash,
    };
  }

  async findByIdWithRoles(id: string): Promise<UsuarioConRoles | null> {
    const usuario = await this.findById(id);
    if (!usuario) return null;

    const roles = await this.getRoles(id);

    return { ...usuario, roles };
  }

  async findByEmailWithRolesAndPermisos(
    email: string
  ): Promise<(UsuarioConRoles & { passwordHash: string; permisos: Permiso[] }) | null> {
    const row = await queryOne<UsuarioRow>(
      `SELECT * FROM usuarios WHERE email = $1 AND deleted_at IS NULL`,
      [email]
    );

    if (!row) return null;

    const roles = await this.getRoles(row.id);
    const permisos = await this.getPermisos(row.id);

    return {
      ...toCamelCase<Usuario>(row as unknown as Record<string, unknown>),
      passwordHash: row.password_hash,
      roles,
      permisos,
    };
  }

  async findByUsernameWithRolesAndPermisos(
    username: string
  ): Promise<(UsuarioConRoles & { passwordHash: string; permisos: Permiso[] }) | null> {
    const row = await queryOne<UsuarioRow>(
      `SELECT * FROM usuarios WHERE username = $1 AND deleted_at IS NULL`,
      [username]
    );

    if (!row) return null;

    const roles = await this.getRoles(row.id);
    const permisos = await this.getPermisos(row.id);

    return {
      ...toCamelCase<Usuario>(row as unknown as Record<string, unknown>),
      passwordHash: row.password_hash,
      roles,
      permisos,
    };
  }

  async getRoles(usuarioId: string): Promise<Rol[]> {
    const rows = await query<Record<string, unknown>>(
      `SELECT r.* FROM roles r
       INNER JOIN usuarios_roles ur ON ur.rol_id = r.id
       WHERE ur.usuario_id = $1 AND r.deleted_at IS NULL`,
      [usuarioId]
    );

    return rows.map((row) => toCamelCase<Rol>(row));
  }

  async getPermisos(usuarioId: string): Promise<Permiso[]> {
    const rows = await query<Record<string, unknown>>(
      `SELECT DISTINCT p.* FROM permisos p
       INNER JOIN roles_permisos rp ON rp.permiso_id = p.id
       INNER JOIN usuarios_roles ur ON ur.rol_id = rp.rol_id
       WHERE ur.usuario_id = $1 AND p.deleted_at IS NULL`,
      [usuarioId]
    );

    return rows.map((row) => toCamelCase<Permiso>(row));
  }

  async create(data: {
    username: string;
    email: string;
    passwordHash: string;
    nombre: string;
    apellido: string;
    roleIds: string[];
    createdBy?: string;
  }): Promise<Usuario> {
    return transaction(async ({ queryOne: txQueryOne, execute: txExecute }) => {
      const row = await txQueryOne<Record<string, unknown>>(
        `INSERT INTO usuarios (username, email, password_hash, nombre, apellido, created_by)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [data.username, data.email, data.passwordHash, data.nombre, data.apellido, data.createdBy || null]
      );

      if (!row) throw new Error('Failed to create usuario');

      const usuario = toCamelCase<Usuario>(row);

      // Assign roles
      for (const roleId of data.roleIds) {
        await txExecute(
          `INSERT INTO usuarios_roles (usuario_id, rol_id) VALUES ($1, $2)`,
          [usuario.id, roleId]
        );
      }

      return usuario;
    });
  }

  async update(
    id: string,
    data: Partial<{
      username: string;
      email: string;
      nombre: string;
      apellido: string;
      activo: boolean;
      roleIds: string[];
    }>,
    updatedBy?: string
  ): Promise<Usuario | null> {
    return transaction(async ({ queryOne: txQueryOne, execute: txExecute }) => {
      const sets: string[] = [];
      const values: unknown[] = [];
      let paramIndex = 1;

      if (data.username !== undefined) {
        sets.push(`username = $${paramIndex++}`);
        values.push(data.username);
      }
      if (data.email !== undefined) {
        sets.push(`email = $${paramIndex++}`);
        values.push(data.email);
      }
      if (data.nombre !== undefined) {
        sets.push(`nombre = $${paramIndex++}`);
        values.push(data.nombre);
      }
      if (data.apellido !== undefined) {
        sets.push(`apellido = $${paramIndex++}`);
        values.push(data.apellido);
      }
      if (data.activo !== undefined) {
        sets.push(`activo = $${paramIndex++}`);
        values.push(data.activo);
      }

      sets.push(`updated_by = $${paramIndex++}`);
      values.push(updatedBy || null);

      values.push(id);

      const row = await txQueryOne<Record<string, unknown>>(
        `UPDATE usuarios SET ${sets.join(', ')}
         WHERE id = $${paramIndex} AND deleted_at IS NULL
         RETURNING *`,
        values
      );

      if (!row) return null;

      // Update roles if provided
      if (data.roleIds !== undefined) {
        await txExecute(`DELETE FROM usuarios_roles WHERE usuario_id = $1`, [id]);
        for (const roleId of data.roleIds) {
          await txExecute(
            `INSERT INTO usuarios_roles (usuario_id, rol_id) VALUES ($1, $2)`,
            [id, roleId]
          );
        }
      }

      return toCamelCase<Usuario>(row);
    });
  }

  async updatePassword(id: string, passwordHash: string, updatedBy?: string): Promise<boolean> {
    const rowCount = await execute(
      `UPDATE usuarios SET password_hash = $1, updated_by = $2
       WHERE id = $3 AND deleted_at IS NULL`,
      [passwordHash, updatedBy || null, id]
    );

    return rowCount > 0;
  }

  async updateLastAccess(id: string): Promise<void> {
    await execute(
      `UPDATE usuarios SET ultimo_acceso = NOW() WHERE id = $1`,
      [id]
    );
  }

  async findAllWithRoles(options: FindOptions = {}): Promise<PaginatedResult<UsuarioConRoles>> {
    const result = await this.findAll(options);

    const usuariosConRoles = await Promise.all(
      result.data.map(async (usuario) => {
        const roles = await this.getRoles(usuario.id);
        return { ...usuario, roles };
      })
    );

    return {
      ...result,
      data: usuariosConRoles,
    };
  }
}

export const usuarioRepository = new UsuarioRepository();

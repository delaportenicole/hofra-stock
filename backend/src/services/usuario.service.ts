import bcrypt from 'bcryptjs';
import { usuarioRepository } from '../repositories/usuario.repository.js';
import { NotFoundError, ConflictError } from '../utils/errors.js';
import type { Usuario, UsuarioConRoles, CreateUsuarioDto, UpdateUsuarioDto } from '@hofra/shared';
import type { PaginatedResult } from '../types/index.js';
import type { FindOptions } from '../repositories/base.repository.js';

export class UsuarioService {
  async findAll(options: FindOptions = {}): Promise<PaginatedResult<UsuarioConRoles>> {
    return usuarioRepository.findAllWithRoles(options);
  }

  async findById(id: string): Promise<UsuarioConRoles> {
    const usuario = await usuarioRepository.findByIdWithRoles(id);

    if (!usuario) {
      throw new NotFoundError('Usuario');
    }

    return usuario;
  }

  async create(data: CreateUsuarioDto, createdBy?: string): Promise<Usuario> {
    // Check if username already exists
    const existingUsername = await usuarioRepository.findByUsername(data.username);
    if (existingUsername) {
      throw new ConflictError('El nombre de usuario ya está registrado');
    }

    // Check if email already exists
    const existingEmail = await usuarioRepository.findByEmail(data.email);
    if (existingEmail) {
      throw new ConflictError('El email ya está registrado');
    }

    const passwordHash = await bcrypt.hash(data.password, 12);

    return usuarioRepository.create({
      username: data.username,
      email: data.email,
      passwordHash,
      nombre: data.nombre,
      apellido: data.apellido,
      roleIds: data.roleIds,
      createdBy,
    });
  }

  async update(id: string, data: UpdateUsuarioDto, updatedBy?: string): Promise<Usuario> {
    // Check if user exists
    const existing = await usuarioRepository.findById(id);
    if (!existing) {
      throw new NotFoundError('Usuario');
    }

    // Check if new username already exists
    if (data.username && data.username !== (existing as Usuario & { username: string }).username) {
      const usernameExists = await usuarioRepository.findByUsername(data.username);
      if (usernameExists) {
        throw new ConflictError('El nombre de usuario ya está registrado');
      }
    }

    // Check if new email already exists
    if (data.email && data.email !== existing.email) {
      const emailExists = await usuarioRepository.findByEmail(data.email);
      if (emailExists) {
        throw new ConflictError('El email ya está registrado');
      }
    }

    const updated = await usuarioRepository.update(id, data, updatedBy);

    if (!updated) {
      throw new NotFoundError('Usuario');
    }

    return updated;
  }

  async delete(id: string, deletedBy?: string): Promise<void> {
    const deleted = await usuarioRepository.softDelete(id, deletedBy);

    if (!deleted) {
      throw new NotFoundError('Usuario');
    }
  }

  async resetPassword(id: string, newPassword: string, updatedBy?: string): Promise<void> {
    const existing = await usuarioRepository.findById(id);
    if (!existing) {
      throw new NotFoundError('Usuario');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await usuarioRepository.updatePassword(id, passwordHash, updatedBy);
  }
}

export const usuarioService = new UsuarioService();

import { rolRepository } from '../repositories/rol.repository.js';
import { permisoRepository } from '../repositories/permiso.repository.js';
import { NotFoundError, ConflictError } from '../utils/errors.js';
import type { Rol, RolConPermisos, Permiso, CreateRolDto, UpdateRolDto } from '@hofra/shared';
import type { PaginatedResult } from '../types/index.js';
import type { FindOptions } from '../repositories/base.repository.js';

export class RolService {
  async findAll(options: FindOptions = {}): Promise<PaginatedResult<Rol>> {
    return rolRepository.findAll(options);
  }

  async findAllWithPermisos(): Promise<RolConPermisos[]> {
    return rolRepository.findAllWithPermisos();
  }

  async findById(id: string): Promise<RolConPermisos> {
    const rol = await rolRepository.findByIdWithPermisos(id);

    if (!rol) {
      throw new NotFoundError('Rol');
    }

    return rol;
  }

  async create(data: CreateRolDto, createdBy?: string): Promise<Rol> {
    const existing = await rolRepository.findByNombre(data.nombre);
    if (existing) {
      throw new ConflictError('Ya existe un rol con ese nombre');
    }

    return rolRepository.create({
      nombre: data.nombre,
      descripcion: data.descripcion,
      permisoIds: data.permisoIds,
      createdBy,
    });
  }

  async update(id: string, data: UpdateRolDto, updatedBy?: string): Promise<Rol> {
    const existing = await rolRepository.findById(id);
    if (!existing) {
      throw new NotFoundError('Rol');
    }

    if (data.nombre && data.nombre !== existing.nombre) {
      const nameExists = await rolRepository.findByNombre(data.nombre);
      if (nameExists) {
        throw new ConflictError('Ya existe un rol con ese nombre');
      }
    }

    const updated = await rolRepository.update(id, data, updatedBy);

    if (!updated) {
      throw new NotFoundError('Rol');
    }

    return updated;
  }

  async delete(id: string, deletedBy?: string): Promise<void> {
    const deleted = await rolRepository.softDelete(id, deletedBy);

    if (!deleted) {
      throw new NotFoundError('Rol');
    }
  }

  async getAllPermisos(): Promise<Permiso[]> {
    const result = await permisoRepository.findAll({ limit: 200 });
    return result.data;
  }

  async getPermisosGrouped(): Promise<Record<string, Permiso[]>> {
    return permisoRepository.findAllGroupedByModulo();
  }
}

export const rolService = new RolService();

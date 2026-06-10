import { rubroRepository } from '../repositories/rubro.repository.js';
import { NotFoundError, ConflictError, ValidationError } from '../utils/errors.js';
import type { Rubro, CreateRubroDto, UpdateRubroDto } from '@hofra/shared';
import type { PaginatedResult } from '../types/index.js';
import type { FindOptions } from '../repositories/base.repository.js';

export class RubroService {
  async findAll(options: FindOptions = {}): Promise<PaginatedResult<Rubro>> {
    return rubroRepository.findAll(options);
  }

  async findActive(): Promise<Rubro[]> {
    return rubroRepository.findActive();
  }

  async findById(id: string): Promise<Rubro> {
    const rubro = await rubroRepository.findById(id);

    if (!rubro) {
      throw new NotFoundError('Rubro');
    }

    return rubro;
  }

  async create(data: CreateRubroDto, createdBy?: string): Promise<Rubro> {
    const existing = await rubroRepository.findByNombre(data.nombre);
    if (existing) {
      throw new ConflictError('Ya existe un rubro con ese nombre');
    }

    return rubroRepository.create({
      nombre: data.nombre,
      descripcion: data.descripcion,
      prefijo: data.prefijo.toUpperCase(),
      createdBy,
    });
  }

  async update(id: string, data: UpdateRubroDto, updatedBy?: string): Promise<Rubro> {
    const existing = await rubroRepository.findById(id);
    if (!existing) {
      throw new NotFoundError('Rubro');
    }

    if (data.nombre && data.nombre !== existing.nombre) {
      const nameExists = await rubroRepository.findByNombre(data.nombre);
      if (nameExists) {
        throw new ConflictError('Ya existe un rubro con ese nombre');
      }
    }

    const updated = await rubroRepository.update(id, data, updatedBy);

    if (!updated) {
      throw new NotFoundError('Rubro');
    }

    return updated;
  }

  async delete(id: string, deletedBy?: string): Promise<void> {
    const hasArticulos = await rubroRepository.hasArticulos(id);
    if (hasArticulos) {
      throw new ValidationError(
        'No se puede eliminar el rubro porque tiene artículos asociados'
      );
    }

    const deleted = await rubroRepository.softDelete(id, deletedBy);

    if (!deleted) {
      throw new NotFoundError('Rubro');
    }
  }
}

export const rubroService = new RubroService();

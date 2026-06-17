import { rubroRepository } from '../repositories/rubro.repository.js';
import { execute } from '../config/database.js';
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

    // Check if prefix is changing
    const newPrefijo = data.prefijo?.toUpperCase();
    const existingPrefijo = existing.prefijo || '';
    const prefijoChanged = newPrefijo && newPrefijo !== existingPrefijo;

    // Prepare update data with uppercase prefijo
    const updateData: typeof data = {
      ...data,
      prefijo: newPrefijo,
    };

    // Update the rubro
    const updated = await rubroRepository.update(id, updateData, updatedBy);

    if (!updated) {
      throw new NotFoundError('Rubro');
    }

    // If prefix changed, update all article codes
    if (prefijoChanged && existingPrefijo) {
      await execute(
        `UPDATE articulos
         SET codigo = $1 || SUBSTRING(codigo FROM $2::int),
             updated_by = $3
         WHERE rubro_id = $4
           AND deleted_at IS NULL
           AND codigo LIKE $5`,
        [
          newPrefijo,
          existingPrefijo.length + 1,
          updatedBy || null,
          id,
          existingPrefijo + '%',
        ]
      );
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

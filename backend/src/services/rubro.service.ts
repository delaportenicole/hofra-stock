import { rubroRepository } from '../repositories/rubro.repository.js';
import { transaction, execute } from '../config/database.js';
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
    const prefijoChanged = newPrefijo && newPrefijo !== existing.prefijo;

    if (prefijoChanged) {
      // Update rubro and all article codes in a transaction
      return transaction(async (client) => {
        // Update rubro
        const updated = await client.queryOne<Record<string, unknown>>(
          `UPDATE rubros SET
            nombre = COALESCE($1, nombre),
            descripcion = COALESCE($2, descripcion),
            prefijo = $3,
            activo = COALESCE($4, activo),
            updated_by = $5
           WHERE id = $6 AND deleted_at IS NULL
           RETURNING *`,
          [
            data.nombre || null,
            data.descripcion !== undefined ? data.descripcion : null,
            newPrefijo,
            data.activo !== undefined ? data.activo : null,
            updatedBy || null,
            id,
          ]
        );

        if (!updated) {
          throw new NotFoundError('Rubro');
        }

        // Update all article codes: replace old prefix with new prefix
        // Example: ELE1 -> ELEC1, ELE25 -> ELEC25
        await client.execute(
          `UPDATE articulos
           SET codigo = $1 || SUBSTRING(codigo FROM $2),
               updated_by = $3
           WHERE rubro_id = $4
             AND deleted_at IS NULL
             AND codigo LIKE $5`,
          [
            newPrefijo,
            existing.prefijo.length + 1,
            updatedBy || null,
            id,
            existing.prefijo + '%',
          ]
        );

        // Import toCamelCase inline to avoid circular dependency issues
        const result: Rubro = {
          id: updated.id as string,
          nombre: updated.nombre as string,
          descripcion: updated.descripcion as string | null,
          prefijo: updated.prefijo as string,
          activo: updated.activo as boolean,
          createdAt: updated.created_at as Date,
          updatedAt: updated.updated_at as Date,
          deletedAt: updated.deleted_at as Date | null,
          createdBy: updated.created_by as string | null,
          updatedBy: updated.updated_by as string | null,
        };

        return result;
      });
    }

    // Normal update without prefix change
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

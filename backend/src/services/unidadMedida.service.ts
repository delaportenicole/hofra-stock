import { unidadMedidaRepository } from '../repositories/unidadMedida.repository.js';
import { NotFoundError } from '../utils/errors.js';
import type { UnidadMedida, CreateUnidadMedidaDto, UpdateUnidadMedidaDto, PaginatedResponse } from '@hofra/shared';
import type { FindOptions } from '../repositories/base.repository.js';

class UnidadMedidaService {
  async getAll(options: FindOptions = {}): Promise<PaginatedResponse<UnidadMedida>> {
    return unidadMedidaRepository.findAll(options);
  }

  async getActive(): Promise<UnidadMedida[]> {
    return unidadMedidaRepository.getActive();
  }

  async getById(id: string): Promise<UnidadMedida> {
    const unidad = await unidadMedidaRepository.findById(id);
    if (!unidad) {
      throw new NotFoundError('Unidad de medida');
    }
    return unidad;
  }

  async create(data: CreateUnidadMedidaDto, createdBy?: string): Promise<UnidadMedida> {
    return unidadMedidaRepository.create({
      nombre: data.nombre,
      createdBy,
    });
  }

  async update(id: string, data: UpdateUnidadMedidaDto, updatedBy?: string): Promise<UnidadMedida> {
    const existing = await unidadMedidaRepository.findById(id);
    if (!existing) {
      throw new NotFoundError('Unidad de medida');
    }

    return unidadMedidaRepository.update(id, data, updatedBy);
  }

  async delete(id: string, deletedBy?: string): Promise<void> {
    const existing = await unidadMedidaRepository.findById(id);
    if (!existing) {
      throw new NotFoundError('Unidad de medida');
    }

    await unidadMedidaRepository.softDelete(id, deletedBy);
  }
}

export const unidadMedidaService = new UnidadMedidaService();

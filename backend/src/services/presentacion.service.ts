import { presentacionRepository } from '../repositories/presentacion.repository.js';
import { NotFoundError } from '../utils/errors.js';
import type { Presentacion, CreatePresentacionDto, UpdatePresentacionDto, PaginatedResponse } from '@hofra/shared';
import type { FindOptions } from '../repositories/base.repository.js';

class PresentacionService {
  async getAll(options: FindOptions = {}): Promise<PaginatedResponse<Presentacion>> {
    return presentacionRepository.findAll(options);
  }

  async getActive(): Promise<Presentacion[]> {
    return presentacionRepository.getActive();
  }

  async getById(id: string): Promise<Presentacion> {
    const presentacion = await presentacionRepository.findById(id);
    if (!presentacion) {
      throw new NotFoundError('Presentación');
    }
    return presentacion;
  }

  async create(data: CreatePresentacionDto, createdBy?: string): Promise<Presentacion> {
    return presentacionRepository.create({
      nombre: data.nombre,
      descripcion: data.descripcion,
      createdBy,
    });
  }

  async update(id: string, data: UpdatePresentacionDto, updatedBy?: string): Promise<Presentacion> {
    const existing = await presentacionRepository.findById(id);
    if (!existing) {
      throw new NotFoundError('Presentación');
    }

    return presentacionRepository.update(id, data, updatedBy);
  }

  async delete(id: string, deletedBy?: string): Promise<void> {
    const existing = await presentacionRepository.findById(id);
    if (!existing) {
      throw new NotFoundError('Presentación');
    }

    await presentacionRepository.softDelete(id, deletedBy);
  }
}

export const presentacionService = new PresentacionService();

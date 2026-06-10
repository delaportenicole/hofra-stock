import { marcaRepository } from '../repositories/marca.repository.js';
import { ConflictError, NotFoundError } from '../utils/errors.js';
import type { Marca, CreateMarcaDto, UpdateMarcaDto } from '@hofra/shared';
import type { FindOptions } from '../repositories/base.repository.js';
import type { PaginatedResult } from '../types/index.js';

export class MarcaService {
  async findAll(options: FindOptions = {}): Promise<PaginatedResult<Marca>> {
    return marcaRepository.findAll(options);
  }

  async findById(id: string): Promise<Marca> {
    const marca = await marcaRepository.findById(id);
    if (!marca) {
      throw new NotFoundError('Marca no encontrada');
    }
    return marca;
  }

  async getActive(): Promise<Marca[]> {
    return marcaRepository.getActive();
  }

  async create(data: CreateMarcaDto, userId?: string): Promise<Marca> {
    // Check if marca already exists
    const existing = await marcaRepository.findByNombre(data.nombre);
    if (existing) {
      throw new ConflictError('Ya existe una marca con ese nombre');
    }

    return marcaRepository.create({
      ...data,
      createdBy: userId,
    });
  }

  async update(id: string, data: UpdateMarcaDto, userId?: string): Promise<Marca> {
    // Check if exists
    const existing = await marcaRepository.findById(id);
    if (!existing) {
      throw new NotFoundError('Marca no encontrada');
    }

    // Check for duplicate name if updating nombre
    if (data.nombre && data.nombre !== existing.nombre) {
      const duplicate = await marcaRepository.findByNombre(data.nombre);
      if (duplicate) {
        throw new ConflictError('Ya existe una marca con ese nombre');
      }
    }

    return marcaRepository.update(id, data, userId);
  }

  async delete(id: string, userId?: string): Promise<void> {
    const success = await marcaRepository.softDelete(id, userId);
    if (!success) {
      throw new NotFoundError('Marca no encontrada');
    }
  }

  async findOrCreate(nombre: string, userId?: string): Promise<Marca> {
    // Try to find existing
    const existing = await marcaRepository.findByNombre(nombre);
    if (existing) {
      return existing;
    }

    // Create new
    return marcaRepository.create({
      nombre,
      createdBy: userId,
    });
  }
}

export const marcaService = new MarcaService();

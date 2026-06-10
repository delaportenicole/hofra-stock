import { proveedorRepository } from '../repositories/proveedor.repository.js';
import { NotFoundError, ConflictError } from '../utils/errors.js';
import type { Proveedor, CreateProveedorDto, UpdateProveedorDto } from '@hofra/shared';
import type { PaginatedResult } from '../types/index.js';
import type { FindOptions } from '../repositories/base.repository.js';

export class ProveedorService {
  async findAll(options: FindOptions = {}): Promise<PaginatedResult<Proveedor>> {
    return proveedorRepository.findAll(options);
  }

  async findActive(): Promise<Proveedor[]> {
    return proveedorRepository.findActive();
  }

  async findById(id: string): Promise<Proveedor> {
    const proveedor = await proveedorRepository.findById(id);

    if (!proveedor) {
      throw new NotFoundError('Proveedor');
    }

    return proveedor;
  }

  async search(term: string, options: FindOptions = {}): Promise<PaginatedResult<Proveedor>> {
    return proveedorRepository.search(term, options);
  }

  async create(data: CreateProveedorDto, createdBy?: string): Promise<Proveedor> {
    // Only check for duplicate CUIT if one is provided
    if (data.cuit) {
      const existing = await proveedorRepository.findByCuit(data.cuit);
      if (existing) {
        throw new ConflictError('Ya existe un proveedor con ese CUIT');
      }
    }

    return proveedorRepository.create({
      razonSocial: data.razonSocial,
      nombreFantasia: data.nombreFantasia,
      cuit: data.cuit,
      direccion: data.direccion,
      telefono: data.telefono,
      email: data.email,
      contacto: data.contacto,
      notas: data.notas,
      createdBy,
    });
  }

  async update(id: string, data: UpdateProveedorDto, updatedBy?: string): Promise<Proveedor> {
    const existing = await proveedorRepository.findById(id);
    if (!existing) {
      throw new NotFoundError('Proveedor');
    }

    // Only check for duplicate CUIT if one is provided and different from current
    if (data.cuit && data.cuit.replace(/-/g, '') !== existing.cuit) {
      const cuitExists = await proveedorRepository.findByCuit(data.cuit);
      if (cuitExists) {
        throw new ConflictError('Ya existe un proveedor con ese CUIT');
      }
    }

    const updated = await proveedorRepository.update(id, data, updatedBy);

    if (!updated) {
      throw new NotFoundError('Proveedor');
    }

    return updated;
  }

  async delete(id: string, deletedBy?: string): Promise<void> {
    const deleted = await proveedorRepository.softDelete(id, deletedBy);

    if (!deleted) {
      throw new NotFoundError('Proveedor');
    }
  }
}

export const proveedorService = new ProveedorService();

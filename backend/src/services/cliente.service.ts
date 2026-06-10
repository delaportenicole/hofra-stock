import { clienteRepository } from '../repositories/cliente.repository.js';
import { NotFoundError, ConflictError } from '../utils/errors.js';
import type { Cliente, CreateClienteDto, UpdateClienteDto } from '@hofra/shared';
import type { PaginatedResult } from '../types/index.js';
import type { FindOptions } from '../repositories/base.repository.js';

export class ClienteService {
  async findAll(options: FindOptions = {}): Promise<PaginatedResult<Cliente>> {
    return clienteRepository.findAll(options);
  }

  async findActive(): Promise<Cliente[]> {
    return clienteRepository.findActive();
  }

  async findById(id: string): Promise<Cliente> {
    const cliente = await clienteRepository.findById(id);

    if (!cliente) {
      throw new NotFoundError('Cliente');
    }

    return cliente;
  }

  async search(term: string, options: FindOptions = {}): Promise<PaginatedResult<Cliente>> {
    return clienteRepository.search(term, options);
  }

  async create(data: CreateClienteDto, createdBy?: string): Promise<Cliente> {
    const existing = await clienteRepository.findByCuit(data.cuit);
    if (existing) {
      throw new ConflictError('Ya existe un cliente con ese CUIT');
    }

    return clienteRepository.create({
      razonSocial: data.razonSocial,
      cuit: data.cuit,
      direccion: data.direccion,
      telefono: data.telefono,
      email: data.email,
      contacto: data.contacto,
      notas: data.notas,
      createdBy,
    });
  }

  async update(id: string, data: UpdateClienteDto, updatedBy?: string): Promise<Cliente> {
    const existing = await clienteRepository.findById(id);
    if (!existing) {
      throw new NotFoundError('Cliente');
    }

    if (data.cuit && data.cuit.replace(/-/g, '') !== existing.cuit) {
      const cuitExists = await clienteRepository.findByCuit(data.cuit);
      if (cuitExists) {
        throw new ConflictError('Ya existe un cliente con ese CUIT');
      }
    }

    const updated = await clienteRepository.update(id, data, updatedBy);

    if (!updated) {
      throw new NotFoundError('Cliente');
    }

    return updated;
  }

  async delete(id: string, deletedBy?: string): Promise<void> {
    const deleted = await clienteRepository.softDelete(id, deletedBy);

    if (!deleted) {
      throw new NotFoundError('Cliente');
    }
  }
}

export const clienteService = new ClienteService();

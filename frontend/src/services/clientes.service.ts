import api from './api';
import type { Cliente, CreateClienteDto, UpdateClienteDto, PaginatedResponse } from '@hofra/shared';

export const clientesService = {
  async getAll(params: { page?: number; limit?: number; sortBy?: string; sortOrder?: 'asc' | 'desc' } = {}): Promise<PaginatedResponse<Cliente>> {
    const response = await api.get<PaginatedResponse<Cliente>>('/clientes', { params });
    return response.data;
  },

  async getActive(): Promise<Cliente[]> {
    const response = await api.get<{ data: Cliente[] }>('/clientes/active');
    return response.data.data;
  },

  async search(q: string, params: { page?: number; limit?: number; sortBy?: string; sortOrder?: 'asc' | 'desc' } = {}): Promise<PaginatedResponse<Cliente>> {
    const response = await api.get<PaginatedResponse<Cliente>>('/clientes/search', {
      params: { q, ...params },
    });
    return response.data;
  },

  async getById(id: string): Promise<Cliente> {
    const response = await api.get<{ data: Cliente }>(`/clientes/${id}`);
    return response.data.data;
  },

  async create(data: CreateClienteDto): Promise<Cliente> {
    const response = await api.post<{ data: Cliente }>('/clientes', data);
    return response.data.data;
  },

  async update(id: string, data: UpdateClienteDto): Promise<Cliente> {
    const response = await api.put<{ data: Cliente }>(`/clientes/${id}`, data);
    return response.data.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/clientes/${id}`);
  },
};

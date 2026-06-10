import api from './api';
import type { Proveedor, CreateProveedorDto, UpdateProveedorDto, PaginatedResponse, ReposicionConRelaciones } from '@hofra/shared';

export const proveedoresService = {
  async getAll(params: { page?: number; limit?: number; sortBy?: string; sortOrder?: 'asc' | 'desc' } = {}): Promise<PaginatedResponse<Proveedor>> {
    const response = await api.get<PaginatedResponse<Proveedor>>('/proveedores', { params });
    return response.data;
  },

  async getActive(): Promise<Proveedor[]> {
    const response = await api.get<{ data: Proveedor[] }>('/proveedores/active');
    return response.data.data;
  },

  async search(q: string, params: { page?: number; limit?: number; sortBy?: string; sortOrder?: 'asc' | 'desc' } = {}): Promise<PaginatedResponse<Proveedor>> {
    const response = await api.get<PaginatedResponse<Proveedor>>('/proveedores/search', {
      params: { q, ...params },
    });
    return response.data;
  },

  async getById(id: string): Promise<Proveedor> {
    const response = await api.get<{ data: Proveedor }>(`/proveedores/${id}`);
    return response.data.data;
  },

  async getReposiciones(id: string, params: { page?: number; limit?: number } = {}): Promise<PaginatedResponse<ReposicionConRelaciones>> {
    const response = await api.get<PaginatedResponse<ReposicionConRelaciones>>(
      `/proveedores/${id}/reposiciones`,
      { params }
    );
    return response.data;
  },

  async create(data: CreateProveedorDto): Promise<Proveedor> {
    const response = await api.post<{ data: Proveedor }>('/proveedores', data);
    return response.data.data;
  },

  async update(id: string, data: UpdateProveedorDto): Promise<Proveedor> {
    const response = await api.put<{ data: Proveedor }>(`/proveedores/${id}`, data);
    return response.data.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/proveedores/${id}`);
  },
};

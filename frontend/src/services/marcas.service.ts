import api from './api';
import type { Marca, CreateMarcaDto, UpdateMarcaDto, PaginatedResponse, PaginationParams } from '@hofra/shared';

export const marcasService = {
  async getAll(params: Partial<PaginationParams> & { sortBy?: string; sortOrder?: 'asc' | 'desc' } = {}): Promise<PaginatedResponse<Marca>> {
    const response = await api.get<PaginatedResponse<Marca>>('/marcas', { params });
    return response.data;
  },

  async getById(id: string): Promise<Marca> {
    const response = await api.get<{ data: Marca }>(`/marcas/${id}`);
    return response.data.data;
  },

  async getActive(): Promise<Marca[]> {
    const response = await api.get<{ data: Marca[] }>('/marcas/active');
    return response.data.data;
  },

  async create(data: CreateMarcaDto): Promise<Marca> {
    const response = await api.post<{ data: Marca }>('/marcas', data);
    return response.data.data;
  },

  async findOrCreate(nombre: string): Promise<Marca> {
    const response = await api.post<{ data: Marca }>('/marcas/find-or-create', { nombre });
    return response.data.data;
  },

  async update(id: string, data: UpdateMarcaDto): Promise<Marca> {
    const response = await api.put<{ data: Marca }>(`/marcas/${id}`, data);
    return response.data.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/marcas/${id}`);
  },
};

import api from './api';
import type { Rubro, CreateRubroDto, UpdateRubroDto, PaginatedResponse } from '@hofra/shared';

export const rubrosService = {
  async getAll(params: { page?: number; limit?: number; sortBy?: string; sortOrder?: 'asc' | 'desc' } = {}): Promise<PaginatedResponse<Rubro>> {
    const response = await api.get<PaginatedResponse<Rubro>>('/rubros', { params });
    return response.data;
  },

  async getActive(): Promise<Rubro[]> {
    const response = await api.get<{ data: Rubro[] }>('/rubros/active');
    return response.data.data;
  },

  async getById(id: string): Promise<Rubro> {
    const response = await api.get<{ data: Rubro }>(`/rubros/${id}`);
    return response.data.data;
  },

  async create(data: CreateRubroDto): Promise<Rubro> {
    const response = await api.post<{ data: Rubro }>('/rubros', data);
    return response.data.data;
  },

  async update(id: string, data: UpdateRubroDto): Promise<Rubro> {
    const response = await api.put<{ data: Rubro }>(`/rubros/${id}`, data);
    return response.data.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/rubros/${id}`);
  },
};

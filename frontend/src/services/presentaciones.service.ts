import api from './api';
import type { Presentacion, CreatePresentacionDto, UpdatePresentacionDto, PaginatedResponse } from '@hofra/shared';

interface GetAllParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export const presentacionesService = {
  async getAll(params: GetAllParams = {}): Promise<PaginatedResponse<Presentacion>> {
    const response = await api.get('/presentaciones', { params });
    return response.data;
  },

  async getActive(): Promise<Presentacion[]> {
    const response = await api.get('/presentaciones/active');
    return response.data.data;
  },

  async getById(id: string): Promise<Presentacion> {
    const response = await api.get(`/presentaciones/${id}`);
    return response.data.data;
  },

  async create(data: CreatePresentacionDto): Promise<Presentacion> {
    const response = await api.post('/presentaciones', data);
    return response.data.data;
  },

  async update(id: string, data: UpdatePresentacionDto): Promise<Presentacion> {
    const response = await api.put(`/presentaciones/${id}`, data);
    return response.data.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/presentaciones/${id}`);
  },
};

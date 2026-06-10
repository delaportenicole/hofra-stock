import api from './api';
import type { UnidadMedida, CreateUnidadMedidaDto, UpdateUnidadMedidaDto, PaginatedResponse } from '@hofra/shared';

interface GetAllParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export const unidadesMedidaService = {
  async getAll(params: GetAllParams = {}): Promise<PaginatedResponse<UnidadMedida>> {
    const response = await api.get('/unidades-medida', { params });
    return response.data;
  },

  async getActive(): Promise<UnidadMedida[]> {
    const response = await api.get('/unidades-medida/active');
    return response.data.data;
  },

  async getById(id: string): Promise<UnidadMedida> {
    const response = await api.get(`/unidades-medida/${id}`);
    return response.data.data;
  },

  async create(data: CreateUnidadMedidaDto): Promise<UnidadMedida> {
    const response = await api.post('/unidades-medida', data);
    return response.data.data;
  },

  async update(id: string, data: UpdateUnidadMedidaDto): Promise<UnidadMedida> {
    const response = await api.put(`/unidades-medida/${id}`, data);
    return response.data.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/unidades-medida/${id}`);
  },
};

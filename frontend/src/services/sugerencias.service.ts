import api from './api';
import type { Sugerencia, SugerenciaConUsuario, CreateSugerenciaDto, UpdateSugerenciaDto, PaginatedResponse } from '@hofra/shared';

export const sugerenciasService = {
  async getAll(params: {
    page?: number;
    limit?: number;
    estado?: string;
    prioridad?: string;
  } = {}): Promise<PaginatedResponse<SugerenciaConUsuario>> {
    const response = await api.get('/sugerencias', { params });
    return response.data;
  },

  async getById(id: string): Promise<SugerenciaConUsuario> {
    const response = await api.get(`/sugerencias/${id}`);
    return response.data.data;
  },

  async create(data: CreateSugerenciaDto): Promise<Sugerencia> {
    const response = await api.post('/sugerencias', data);
    return response.data.data;
  },

  async update(id: string, data: UpdateSugerenciaDto): Promise<Sugerencia> {
    const response = await api.put(`/sugerencias/${id}`, data);
    return response.data.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/sugerencias/${id}`);
  },
};

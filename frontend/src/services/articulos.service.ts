import api from './api';
import type {
  ArticuloConRelaciones,
  ArticuloFiltros,
  CreateArticuloDto,
  UpdateArticuloDto,
  PaginatedResponse,
  ReposicionConRelaciones,
  EntregaConRelaciones,
  ValuacionStock,
} from '@hofra/shared';

export interface ArticuloHistorial {
  reposiciones: ReposicionConRelaciones[];
  entregas: EntregaConRelaciones[];
}

export const articulosService = {
  async getAll(
    filtros: ArticuloFiltros & { page?: number; limit?: number; sortBy?: string; sortOrder?: 'asc' | 'desc' } = {}
  ): Promise<PaginatedResponse<ArticuloConRelaciones>> {
    const response = await api.get<PaginatedResponse<ArticuloConRelaciones>>('/articulos', {
      params: filtros,
    });
    return response.data;
  },

  async getById(id: string): Promise<ArticuloConRelaciones> {
    const response = await api.get<{ data: ArticuloConRelaciones }>(`/articulos/${id}`);
    return response.data.data;
  },

  async getHistorial(id: string, limit?: number): Promise<ArticuloHistorial> {
    const response = await api.get<{ data: ArticuloHistorial }>(`/articulos/${id}/historial`, {
      params: { limit },
    });
    return response.data.data;
  },

  async getStockBajo(limit?: number): Promise<ArticuloConRelaciones[]> {
    const response = await api.get<{ data: ArticuloConRelaciones[] }>('/articulos/stock-bajo', {
      params: { limit },
    });
    return response.data.data;
  },

  async create(data: CreateArticuloDto): Promise<ArticuloConRelaciones> {
    const response = await api.post<{ data: ArticuloConRelaciones }>('/articulos', data);
    return response.data.data;
  },

  async update(id: string, data: UpdateArticuloDto): Promise<ArticuloConRelaciones> {
    const response = await api.put<{ data: ArticuloConRelaciones }>(`/articulos/${id}`, data);
    return response.data.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/articulos/${id}`);
  },

  async uploadImage(id: string, file: File): Promise<string> {
    const formData = new FormData();
    formData.append('imagen', file);

    const response = await api.post<{ data: { url: string } }>(
      `/articulos/${id}/imagen`,
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      }
    );
    return response.data.data.url;
  },

  async deleteImage(id: string): Promise<void> {
    await api.delete(`/articulos/${id}/imagen`);
  },

  async generateCodigo(rubroId: string): Promise<string> {
    const response = await api.get<{ data: { codigo: string } }>('/articulos/generate-codigo', {
      params: { rubroId },
    });
    return response.data.data.codigo;
  },

  async getValuacion(id: string): Promise<ValuacionStock> {
    const response = await api.get<{ data: ValuacionStock }>(`/articulos/${id}/valuacion`);
    return response.data.data;
  },
};

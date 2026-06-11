import api from './api';
import type {
  Reposicion,
  ReposicionConRelaciones,
  Entrega,
  EntregaConRelaciones,
  CreateReposicionDto,
  UpdateReposicionDto,
  CreateEntregaDto,
  PaginatedResponse,
  AuditLogConUsuario,
} from '@hofra/shared';

export const stockService = {
  // Reposiciones
  async getReposiciones(params: { page?: number; limit?: number; busqueda?: string } = {}): Promise<PaginatedResponse<ReposicionConRelaciones>> {
    const response = await api.get<PaginatedResponse<ReposicionConRelaciones>>('/stock/reposiciones', { params });
    return response.data;
  },

  async getReposicionById(id: string): Promise<ReposicionConRelaciones> {
    const response = await api.get<{ data: ReposicionConRelaciones }>(`/stock/reposiciones/${id}`);
    return response.data.data;
  },

  async createReposicion(data: CreateReposicionDto): Promise<Reposicion> {
    const response = await api.post<{ data: Reposicion }>('/stock/reposiciones', data);
    return response.data.data;
  },

  async updateReposicion(id: string, data: UpdateReposicionDto): Promise<Reposicion> {
    const response = await api.put<{ data: Reposicion }>(`/stock/reposiciones/${id}`, data);
    return response.data.data;
  },

  async confirmReposicion(id: string): Promise<Reposicion> {
    const response = await api.post<{ data: Reposicion }>(`/stock/reposiciones/${id}/confirmar`);
    return response.data.data;
  },

  async cancelReposicion(id: string): Promise<Reposicion> {
    const response = await api.post<{ data: Reposicion }>(`/stock/reposiciones/${id}/cancelar`);
    return response.data.data;
  },

  async getReposicionHistorial(id: string): Promise<AuditLogConUsuario[]> {
    const response = await api.get<{ data: AuditLogConUsuario[] }>(`/stock/reposiciones/${id}/historial`);
    return response.data.data;
  },

  // Entregas
  async getEntregas(params: { page?: number; limit?: number } = {}): Promise<PaginatedResponse<EntregaConRelaciones>> {
    const response = await api.get<PaginatedResponse<EntregaConRelaciones>>('/stock/entregas', { params });
    return response.data;
  },

  async getEntregaById(id: string): Promise<EntregaConRelaciones> {
    const response = await api.get<{ data: EntregaConRelaciones }>(`/stock/entregas/${id}`);
    return response.data.data;
  },

  async createEntrega(data: CreateEntregaDto): Promise<Entrega> {
    const response = await api.post<{ data: Entrega }>('/stock/entregas', data);
    return response.data.data;
  },

  async updateEntrega(id: string, data: Partial<CreateEntregaDto>): Promise<Entrega> {
    const response = await api.put<{ data: Entrega }>(`/stock/entregas/${id}`, data);
    return response.data.data;
  },

  async confirmEntrega(id: string): Promise<Entrega> {
    const response = await api.post<{ data: Entrega }>(`/stock/entregas/${id}/confirmar`);
    return response.data.data;
  },

  async cancelEntrega(id: string): Promise<Entrega> {
    const response = await api.post<{ data: Entrega }>(`/stock/entregas/${id}/cancelar`);
    return response.data.data;
  },
};

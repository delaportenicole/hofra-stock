import api from './api';
import type { Usuario, UsuarioConRoles, CreateUsuarioDto, UpdateUsuarioDto, PaginatedResponse } from '@hofra/shared';

export const usuariosService = {
  async getAll(params: { page?: number; limit?: number } = {}): Promise<PaginatedResponse<UsuarioConRoles>> {
    const response = await api.get<PaginatedResponse<UsuarioConRoles>>('/usuarios', { params });
    return response.data;
  },

  async getById(id: string): Promise<UsuarioConRoles> {
    const response = await api.get<{ data: UsuarioConRoles }>(`/usuarios/${id}`);
    return response.data.data;
  },

  async create(data: CreateUsuarioDto): Promise<Usuario> {
    const response = await api.post<{ data: Usuario }>('/usuarios', data);
    return response.data.data;
  },

  async update(id: string, data: UpdateUsuarioDto): Promise<Usuario> {
    const response = await api.put<{ data: Usuario }>(`/usuarios/${id}`, data);
    return response.data.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/usuarios/${id}`);
  },

  async resetPassword(id: string, newPassword: string): Promise<void> {
    await api.post(`/usuarios/${id}/reset-password`, { newPassword });
  },
};

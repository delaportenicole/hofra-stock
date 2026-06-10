import api from './api';
import type { Rol, RolConPermisos, Permiso, CreateRolDto, UpdateRolDto, PaginatedResponse } from '@hofra/shared';

export const rolesService = {
  async getAll(params: { page?: number; limit?: number } = {}): Promise<PaginatedResponse<Rol>> {
    const response = await api.get<PaginatedResponse<Rol>>('/roles', { params });
    return response.data;
  },

  async getAllWithPermisos(): Promise<RolConPermisos[]> {
    const response = await api.get<{ data: RolConPermisos[] }>('/roles/with-permisos');
    return response.data.data;
  },

  async getById(id: string): Promise<RolConPermisos> {
    const response = await api.get<{ data: RolConPermisos }>(`/roles/${id}`);
    return response.data.data;
  },

  async create(data: CreateRolDto): Promise<Rol> {
    const response = await api.post<{ data: Rol }>('/roles', data);
    return response.data.data;
  },

  async update(id: string, data: UpdateRolDto): Promise<Rol> {
    const response = await api.put<{ data: Rol }>(`/roles/${id}`, data);
    return response.data.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/roles/${id}`);
  },

  async getPermisos(): Promise<Permiso[]> {
    const response = await api.get<{ data: Permiso[] }>('/roles/permisos');
    return response.data.data;
  },

  async getPermisosGrouped(): Promise<Record<string, Permiso[]>> {
    const response = await api.get<{ data: Record<string, Permiso[]> }>('/roles/permisos/grouped');
    return response.data.data;
  },
};

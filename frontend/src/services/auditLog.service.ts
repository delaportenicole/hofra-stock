import api from './api';
import type { AuditLogConUsuario, AuditLogFiltros, PaginatedResponse } from '@hofra/shared';

export const auditLogService = {
  async getAll(
    filtros: AuditLogFiltros & { page?: number; limit?: number } = {}
  ): Promise<PaginatedResponse<AuditLogConUsuario>> {
    const response = await api.get<PaginatedResponse<AuditLogConUsuario>>('/audit', {
      params: filtros,
    });
    return response.data;
  },

  async getFilters(): Promise<{ entidades: string[]; acciones: string[] }> {
    const response = await api.get<{ data: { entidades: string[]; acciones: string[] } }>(
      '/audit/filters'
    );
    return response.data.data;
  },
};

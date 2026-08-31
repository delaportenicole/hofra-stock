import api from './api';
import type {
  SolicitudCotizacion,
  SolicitudCotizacionConRelaciones,
  CreateSolicitudCotizacionDto,
  UpdateSolicitudCotizacionDto,
  UpdateSolicitudCotizacionItemDto,
  EstadoSolicitudCotizacion,
  PaginatedResponse,
} from '@hofra/shared';

export const solicitudesCotizacionService = {
  async getAll(params: {
    page?: number;
    limit?: number;
    estado?: EstadoSolicitudCotizacion;
    clienteId?: string;
    busqueda?: string;
    sortOrder?: 'asc' | 'desc';
  } = {}): Promise<PaginatedResponse<SolicitudCotizacionConRelaciones>> {
    const response = await api.get<PaginatedResponse<SolicitudCotizacionConRelaciones>>('/solicitudes-cotizacion', { params });
    return response.data;
  },

  async getById(id: string): Promise<SolicitudCotizacionConRelaciones> {
    const response = await api.get<{ data: SolicitudCotizacionConRelaciones }>(`/solicitudes-cotizacion/${id}`);
    return response.data.data;
  },

  async create(data: CreateSolicitudCotizacionDto): Promise<SolicitudCotizacionConRelaciones> {
    const response = await api.post<{ data: SolicitudCotizacionConRelaciones }>('/solicitudes-cotizacion', data);
    return response.data.data;
  },

  async update(id: string, data: UpdateSolicitudCotizacionDto): Promise<SolicitudCotizacion> {
    const response = await api.put<{ data: SolicitudCotizacion }>(`/solicitudes-cotizacion/${id}`, data);
    return response.data.data;
  },

  async updateItem(
    solicitudId: string,
    itemId: string,
    data: UpdateSolicitudCotizacionItemDto
  ): Promise<SolicitudCotizacionConRelaciones> {
    const response = await api.put<{ data: SolicitudCotizacionConRelaciones }>(
      `/solicitudes-cotizacion/${solicitudId}/items/${itemId}`,
      data
    );
    return response.data.data;
  },

  async marcarCotizada(id: string): Promise<SolicitudCotizacionConRelaciones> {
    const response = await api.post<{ data: SolicitudCotizacionConRelaciones }>(`/solicitudes-cotizacion/${id}/marcar-cotizada`);
    return response.data.data;
  },

  async cancelar(id: string): Promise<SolicitudCotizacionConRelaciones> {
    const response = await api.post<{ data: SolicitudCotizacionConRelaciones }>(`/solicitudes-cotizacion/${id}/cancelar`);
    return response.data.data;
  },

  async exportarExcel(id: string): Promise<Blob> {
    const response = await api.get(`/solicitudes-cotizacion/${id}/exportar-excel`, { responseType: 'blob' });
    return response.data;
  },

  async exportarGoogleSheets(id: string): Promise<string> {
    const response = await api.post<{ data: { url: string } }>(`/solicitudes-cotizacion/${id}/exportar-google-sheets`);
    return response.data.data.url;
  },
};

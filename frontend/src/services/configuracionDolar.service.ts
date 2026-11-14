import api from './api';

export const configuracionDolarService = {
  async getVigente(): Promise<{ valorDolarOficial: number | null }> {
    const response = await api.get<{ data: { valorDolarOficial: number | null } }>('/configuracion/dolar');
    return response.data.data;
  },
};

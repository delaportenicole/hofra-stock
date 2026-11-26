import api from './api';
import type { SinonimoColumnaExcel, CreateSinonimoColumnaExcelDto } from '@hofra/shared';

export const sinonimosColumnaExcelService = {
  async getAll(): Promise<SinonimoColumnaExcel[]> {
    const response = await api.get<{ data: SinonimoColumnaExcel[] }>('/sinonimos-columna-excel');
    return response.data.data;
  },

  async create(data: CreateSinonimoColumnaExcelDto): Promise<SinonimoColumnaExcel> {
    const response = await api.post<{ data: SinonimoColumnaExcel }>('/sinonimos-columna-excel', data);
    return response.data.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/sinonimos-columna-excel/${id}`);
  },
};

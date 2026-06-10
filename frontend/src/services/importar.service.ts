import api from './api';

export interface ImportArticuloRow {
  nombre: string;
  sku: string | null;
  categoria: string;
  stockActual: number;
  stockMinimo: number;
  marca: string | null;
}

export interface PreviewResult {
  rows: ImportArticuloRow[];
  rubrosToCreate: string[];
  marcasToCreate: string[];
  existingRubros: string[];
  existingMarcas: string[];
}

export interface ImportResult {
  success: boolean;
  totalRows: number;
  imported: number;
  skipped: number;
  errors: Array<{ row: number; error: string }>;
  rubrosCreated: string[];
  marcasCreated: string[];
}

export const importarService = {
  async preview(rows: ImportArticuloRow[]): Promise<PreviewResult> {
    const response = await api.post<{ data: PreviewResult }>('/importar/preview', { rows });
    return response.data.data;
  },

  async execute(rows: ImportArticuloRow[]): Promise<ImportResult> {
    const response = await api.post<{ data: ImportResult }>('/importar/execute', { rows });
    return response.data.data;
  },
};

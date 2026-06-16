import api from './api';

export interface ImportArticuloRow {
  nombre: string;
  marca: string | null;
  codigo: string | null;
  sku: string | null;
  etm: string | null;
  presentacion: string | null;
  stockActual: number;
  stockMinimo: number;
  costoInicial: number | null;
  proveedor: string | null;
  rubro: string;
  ubicacion: string | null;
}

export interface PreviewResult {
  rows: ImportArticuloRow[];
  rubrosToCreate: string[];
  marcasToCreate: string[];
  proveedoresToCreate: string[];
  existingRubros: string[];
  existingMarcas: string[];
  existingProveedores: string[];
}

export interface ImportResult {
  success: boolean;
  totalRows: number;
  imported: number;
  skipped: number;
  errors: Array<{ row: number; error: string }>;
  rubrosCreated: string[];
  marcasCreated: string[];
  proveedoresCreated: string[];
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

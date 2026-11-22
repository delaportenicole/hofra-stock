import { hofraApi } from './httpClient.js';
import type { ArticuloConRelaciones, PaginatedResponse } from '@hofra/shared';

// Búsqueda de candidatos del catálogo para un ítem normalizado (ver ArticuloRepository.search()
// en el backend: es ILIKE parcial sobre nombre/código/SKU/ETM, sin fuzzy matching real).
export async function buscarArticulos(
  termino: string,
  limit: number = 20
): Promise<ArticuloConRelaciones[]> {
  const response = await hofraApi.get<PaginatedResponse<ArticuloConRelaciones>>('/articulos', {
    params: { busqueda: termino, limit },
  });

  return response.data.data;
}

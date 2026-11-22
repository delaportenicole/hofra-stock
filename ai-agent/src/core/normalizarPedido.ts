import type { AIProvider } from '../ai/AIProvider.js';
import type { ResultadoNormalizacion } from './tipos.js';

// Orquestador puro: no sabe nada de HTTP ni de un proveedor de IA en particular (se lo
// inyectan), y no toca la base de datos — solo interpreta texto y devuelve el JSON estructurado.
export async function normalizarPedido(
  texto: string,
  provider: AIProvider
): Promise<ResultadoNormalizacion> {
  if (!texto.trim()) {
    throw new Error('El texto del pedido está vacío');
  }

  return provider.normalizarPedido(texto);
}

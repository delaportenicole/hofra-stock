import type { ResultadoNormalizacion } from '../core/tipos.js';

// Puerto para el modelo de IA usado en la normalización. Cambiar de proveedor (Claude -> otro)
// significa escribir una nueva clase que implemente esto, sin tocar core/ ni el resto del agente.
export interface AIProvider {
  normalizarPedido(texto: string): Promise<ResultadoNormalizacion>;
}

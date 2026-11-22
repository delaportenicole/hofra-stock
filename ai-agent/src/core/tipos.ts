import { z } from 'zod';

// Contrato de salida de la normalización de un pedido. No se persiste en ningún lado en esta
// etapa (requerimiento explícito: el agente no toca la base de datos todavía) — es el JSON
// que eventualmente alimentaría la pantalla de revisión de Solicitudes de Cotización.
export const itemNormalizadoSchema = z.object({
  descripcionOriginal: z.string(),
  descripcionNormalizada: z.string(),
  cantidad: z.number().nullable(),
  unidad: z.string().nullable(),
  marca: z.string().nullable(),
  modelo: z.string().nullable(),
  caracteristicasTecnicas: z.array(z.string()),
  // Qué datos clave no vinieron en el pedido original (ej. "cantidad", "unidad de medida").
  camposFaltantes: z.array(z.string()),
  // Qué quedó ambiguo y por qué, en texto libre (ej. "no queda claro si son 10 unidades o 10 cajas").
  ambiguedades: z.array(z.string()),
  confianza: z.enum(['alta', 'media', 'baja']),
});

export const resultadoNormalizacionSchema = z.object({
  items: z.array(itemNormalizadoSchema),
  // Notas sobre el pedido completo que no corresponden a un ítem puntual
  // (ej. "el archivo parece mezclar dos pedidos de clientes distintos").
  observacionesGenerales: z.string().nullable(),
});

export type ItemNormalizado = z.infer<typeof itemNormalizadoSchema>;
export type ResultadoNormalizacion = z.infer<typeof resultadoNormalizacionSchema>;

import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import * as z from 'zod/v4';
import { env } from '../config/env.js';
import { AppError } from '../utils/errors.js';
import type { ItemNormalizado } from '@hofra/shared';

const itemNormalizadoSchema = z.object({
  etm: z.string().nullable(),
  descripcion: z.string().min(1),
  descripcionIngles: z.string().nullable(),
  marca: z.string().nullable(),
  modelo: z.string().nullable(),
  unidad: z.string().nullable(),
  cantidad: z.number().int().positive(),
});

const normalizacionSchema = z.object({
  items: z.array(itemNormalizadoSchema),
});

const SYSTEM_PROMPT =
  'Extraé el listado de artículos pedidos por un cliente a partir del texto que te paso. ' +
  'El texto puede venir de un email, WhatsApp o una lista pegada a mano, con formato irregular ' +
  '(numerada, con viñetas, en renglones sueltos, etc). Para cada ítem pedido devolvé: ' +
  'etm (el código ETM o código interno de referencia del artículo, si el texto lo incluye; si no aparece, null), ' +
  'descripcion (el nombre/descripción del artículo, sin repetir ahí la marca, el modelo, la unidad ni la cantidad ' +
  'si se pueden separar del texto), ' +
  'descripcionIngles (la descripción en inglés del artículo, solo si el texto la incluye explícitamente; si no aparece, null), ' +
  'marca (null si no se menciona), modelo (null si no se menciona), ' +
  'unidad (la unidad de medida del ítem si el texto la menciona, por ejemplo "unidades", "cajas", "metros", "litros", "kg", "pares", "rollos"; si no se menciona, null), ' +
  'cantidad (entero positivo; si no se menciona una cantidad para ese ítem, usá 1). ' +
  'El ETM, la descripción en inglés y la unidad no siempre están presentes: no los inventes, usá null si el texto no los trae. ' +
  'Ignorá encabezados, totales, saludos, firmas y cualquier texto que no sea un ítem pedido.';

class NormalizadorItemsService {
  private client: Anthropic | null = null;

  private getClient(): Anthropic {
    if (!env.ANTHROPIC_API_KEY) {
      throw new AppError(503, 'La normalización con IA no está configurada en el servidor');
    }
    if (!this.client) {
      this.client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
    }
    return this.client;
  }

  async normalizarTexto(texto: string): Promise<ItemNormalizado[]> {
    const client = this.getClient();

    const response = await client.messages.parse({
      model: 'claude-sonnet-5',
      max_tokens: 8000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: texto }],
      output_config: { format: zodOutputFormat(normalizacionSchema) },
    });

    if (!response.parsed_output) {
      throw new AppError(502, 'No se pudo interpretar el texto. Revisá el formato e intentá de nuevo.');
    }

    return response.parsed_output.items;
  }
}

export const normalizadorItemsService = new NormalizadorItemsService();

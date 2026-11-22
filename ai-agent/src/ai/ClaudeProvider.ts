import Anthropic from '@anthropic-ai/sdk';
import { env } from '../config/env.js';
import { resultadoNormalizacionSchema, type ResultadoNormalizacion } from '../core/tipos.js';
import { SYSTEM_PROMPT } from './prompts/normalizarPedido.prompt.js';
import type { AIProvider } from './AIProvider.js';

const MODELO = 'claude-sonnet-5';
const TOOL_NAME = 'reportar_normalizacion';

// Tool use forzado: Claude devuelve el JSON directamente en la forma que pedimos, en vez de
// tener que parsear texto libre y adivinar la estructura.
const ITEM_SCHEMA = {
  type: 'object',
  properties: {
    descripcionOriginal: { type: 'string' },
    descripcionNormalizada: { type: 'string' },
    cantidad: { type: ['number', 'null'] },
    unidad: { type: ['string', 'null'] },
    marca: { type: ['string', 'null'] },
    modelo: { type: ['string', 'null'] },
    caracteristicasTecnicas: { type: 'array', items: { type: 'string' } },
    camposFaltantes: { type: 'array', items: { type: 'string' } },
    ambiguedades: { type: 'array', items: { type: 'string' } },
    confianza: { type: 'string', enum: ['alta', 'media', 'baja'] },
  },
  required: [
    'descripcionOriginal',
    'descripcionNormalizada',
    'cantidad',
    'unidad',
    'marca',
    'modelo',
    'caracteristicasTecnicas',
    'camposFaltantes',
    'ambiguedades',
    'confianza',
  ],
};

export class ClaudeProvider implements AIProvider {
  private client: Anthropic;

  constructor() {
    this.client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  }

  async normalizarPedido(texto: string): Promise<ResultadoNormalizacion> {
    const response = await this.client.messages.create({
      model: MODELO,
      max_tokens: 8192,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: texto }],
      tools: [
        {
          name: TOOL_NAME,
          description: 'Reporta la interpretación estructurada del pedido del cliente.',
          input_schema: {
            type: 'object',
            properties: {
              items: { type: 'array', items: ITEM_SCHEMA },
              observacionesGenerales: { type: ['string', 'null'] },
            },
            required: ['items', 'observacionesGenerales'],
          },
        },
      ],
      tool_choice: { type: 'tool', name: TOOL_NAME },
    });

    const toolUse = response.content.find(
      (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use'
    );

    if (!toolUse) {
      throw new Error('Claude no devolvió el resultado estructurado esperado');
    }

    // Nunca confiar ciegamente en la salida de un modelo: se valida con el mismo schema
    // que usa el resto del agente antes de devolverla.
    return resultadoNormalizacionSchema.parse(toolUse.input);
  }
}

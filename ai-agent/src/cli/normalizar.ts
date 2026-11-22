// Prueba manual de la Fase 2: interpreta un pedido de cliente (texto, Excel o Word) con Claude
// y devuelve el JSON estructurado. No toca la base de datos de Hofra Stock en ningún momento.
//
// Uso:
//   npm run cli:normalizar --workspace=ai-agent -- --texto "2 cafeteras industriales de 20 litros, 220V"
//   npm run cli:normalizar --workspace=ai-agent -- --archivo ./pedido.xlsx
//   npm run cli:normalizar --workspace=ai-agent -- --archivo ./pedido.docx
import fs from 'fs';
import path from 'path';
import { ClaudeProvider } from '../ai/ClaudeProvider.js';
import { normalizarPedido } from '../core/normalizarPedido.js';
import { excelATexto } from '../parsers/excelParser.js';
import { wordATexto } from '../parsers/wordParser.js';

function parseArgs(): { texto?: string; archivo?: string } {
  const args = process.argv.slice(2);
  const get = (flag: string): string | undefined => {
    const index = args.indexOf(flag);
    return index >= 0 ? args[index + 1] : undefined;
  };

  return { texto: get('--texto'), archivo: get('--archivo') };
}

async function obtenerTextoDelPedido(): Promise<string> {
  const { texto, archivo } = parseArgs();

  if (texto) return texto;

  if (archivo) {
    const buffer = fs.readFileSync(archivo);
    const extension = path.extname(archivo).toLowerCase();

    if (extension === '.xlsx' || extension === '.xls') return excelATexto(buffer);
    if (extension === '.docx') return wordATexto(buffer);

    throw new Error(`Formato no soportado: "${extension}" (usá .xlsx, .xls o .docx)`);
  }

  throw new Error(
    'Uso: npm run cli:normalizar --workspace=ai-agent -- --texto "..." (o --archivo ruta/al/archivo.xlsx|.docx)'
  );
}

async function main() {
  const texto = await obtenerTextoDelPedido();
  const resultado = await normalizarPedido(texto, new ClaudeProvider());

  console.log(JSON.stringify(resultado, null, 2));
}

main().catch((error) => {
  console.error('Error normalizando el pedido:', error.message);
  process.exit(1);
});

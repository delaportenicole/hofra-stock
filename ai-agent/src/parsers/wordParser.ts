import mammoth from 'mammoth';

export async function wordATexto(buffer: Buffer): Promise<string> {
  const resultado = await mammoth.extractRawText({ buffer });
  return resultado.value;
}

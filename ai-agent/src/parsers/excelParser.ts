import * as XLSX from 'xlsx';

// El Excel es del cliente, no tiene el formato fijo que detecta el módulo de Solicitudes de
// Cotización (que busca headers exactos tipo ETM/DESCRIPCION/CANTIDAD, pensado para el formato
// interno de Hofra). Acá se vuelca todo el contenido a texto plano (hoja por hoja) y se deja
// que el propio modelo infiera la estructura, en vez de mapear columnas de antemano.
export function excelATexto(buffer: Buffer): string {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const partes: string[] = [];

  for (const nombreHoja of workbook.SheetNames) {
    const hoja = workbook.Sheets[nombreHoja];
    const csv = XLSX.utils.sheet_to_csv(hoja).trim();
    if (csv) {
      partes.push(`--- Hoja: ${nombreHoja} ---\n${csv}`);
    }
  }

  return partes.join('\n\n');
}

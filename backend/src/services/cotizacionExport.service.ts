import ExcelJS from 'exceljs';
import type { SolicitudCotizacionConRelaciones, SolicitudCotizacionItemConArticulo } from '@hofra/shared';
import { LOGO_GE_VERNOVA_BASE64, LOGO_HOFRA_GROUP_BASE64 } from '../assets/logos.js';

export interface SheetCellFormula {
  formula: string; // sin el "=" inicial
}

export type SheetCell = string | number | null | SheetCellFormula;

export interface CotizacionSheetData {
  titulo: string;
  rows: SheetCell[][];
}

export type ModoExportacion = 'interno' | 'externo';

type ColorHeader = 'celeste' | 'celesteAmarillo' | 'verde' | 'rojoAmarillo';
type FormatoPrecio = 'pesos' | 'usd';

interface ColumnaConfig {
  key: string;
  header1: SheetCell;
  header2: SheetCell;
  width: number;
  color: ColorHeader | null;
  mergeHeader: boolean;
  soloInterno: boolean;
  formato?: FormatoPrecio;
}

// Definición completa de las 24 columnas del archivo interno (igual que la planilla de
// referencia de Nicole: Downloads/2 - Cristián - TC Argentina - Cotización 8.20 - #274.xlsx).
// El archivo externo (para mandar al cliente) se arma filtrando las marcadas `soloInterno`
// (Proveedor, Costo, Costo Total, Mark Up, Venta con IVA) — todo lo demás (anchos, colores,
// merges, y las columnas de precio final que sí quedan) sale de esta misma lista, para que
// ambos modos no puedan desincronizarse entre sí.
const TODAS_LAS_COLUMNAS: ColumnaConfig[] = [
  { key: 'item', header1: 'ITEM', header2: 'ITEM', width: 9, color: 'celeste', mergeHeader: true, soloInterno: false },
  { key: 'descripcion', header1: 'DESCRIPCION', header2: 'DESCRIPCION', width: 62, color: 'celeste', mergeHeader: true, soloInterno: false },
  { key: 'descripcionIngles', header1: 'DESCRIPCION EN INGLES ', header2: 'DESCRIPCION EN INGLES ', width: 45, color: 'celeste', mergeHeader: true, soloInterno: false },
  { key: 'etm', header1: 'ETM', header2: 'ETM', width: 31.75, color: 'celeste', mergeHeader: true, soloInterno: false },
  { key: 'marca', header1: 'MARCA', header2: 'MARCA', width: 24.25, color: 'celeste', mergeHeader: true, soloInterno: false },
  { key: 'modelo', header1: 'MODELO', header2: 'MODELO', width: 21, color: 'celeste', mergeHeader: true, soloInterno: false },
  { key: 'cantidad', header1: 'CANT', header2: 'CANT', width: 10.25, color: 'verde', mergeHeader: true, soloInterno: false },
  { key: 'itemOfrecido', header1: 'Item Ofrecido - Descripción', header2: 'Item Ofrecido - Descripción', width: 51.25, color: 'verde', mergeHeader: true, soloInterno: false },
  { key: 'unidadMedida', header1: 'Unidad de', header2: 'Medida', width: 16.75, color: 'celesteAmarillo', mergeHeader: false, soloInterno: false },
  { key: 'marcaOfrecida', header1: 'Marca', header2: 'Marca', width: 18, color: 'verde', mergeHeader: true, soloInterno: false },
  { key: 'modeloOfrecido', header1: 'Modelo', header2: 'Modelo', width: 25, color: 'verde', mergeHeader: true, soloInterno: false },
  { key: 'imagen', header1: 'Imagen de', header2: 'lo Ofrecido', width: 28.75, color: 'verde', mergeHeader: false, soloInterno: false },
  { key: 'proveedor', header1: 'Proveedor', header2: 'Proveedor', width: 36, color: 'rojoAmarillo', mergeHeader: true, soloInterno: true },
  { key: 'costo', header1: 'Costo', header2: 'por Unidad', width: 20.25, color: 'rojoAmarillo', mergeHeader: false, soloInterno: true },
  { key: 'costoTotal', header1: 'Costo Total', header2: 'Costo Total', width: 20.25, color: 'rojoAmarillo', mergeHeader: true, soloInterno: true },
  { key: 'markUp', header1: 'Mark Up', header2: 'Mark Up', width: 18.75, color: 'rojoAmarillo', mergeHeader: true, soloInterno: true },
  { key: 'ventaConIva', header1: 'Venta ', header2: 'con iva', width: 21, color: 'rojoAmarillo', mergeHeader: false, soloInterno: true, formato: 'pesos' },
  { key: 'precioUnitSinIva', header1: 'Precio Unit.', header2: 'Sin Iva', width: 21, color: 'celeste', mergeHeader: false, soloInterno: false, formato: 'pesos' },
  { key: 'totalSinIva', header1: 'Total ', header2: 'Sin Iva', width: 22.75, color: 'celeste', mergeHeader: false, soloInterno: false, formato: 'pesos' },
  { key: 'separadora', header1: null, header2: null, width: 9, color: null, mergeHeader: false, soloInterno: false },
  { key: 'precioUnitSinIvaUsd', header1: 'Precio Unit.', header2: 'Sin Iva', width: 21.5, color: 'verde', mergeHeader: false, soloInterno: false, formato: 'usd' },
  { key: 'totalSinIvaUsd', header1: 'Total ', header2: 'Sin Iva', width: 22.75, color: 'verde', mergeHeader: false, soloInterno: false, formato: 'usd' },
  { key: 'plazoEntrega', header1: 'Plazo', header2: 'de Entrega', width: 21.75, color: 'verde', mergeHeader: false, soloInterno: false },
  { key: 'comentarios', header1: 'Comentarios', header2: 'Comentarios', width: 51, color: 'verde', mergeHeader: true, soloInterno: false },
];

function columnasParaModo(modo: ModoExportacion): ColumnaConfig[] {
  return TODAS_LAS_COLUMNAS.filter((col) => modo === 'interno' || !col.soloInterno);
}

interface PreciosCalculados {
  ventaConIva: number;
  precioUnitSinIva: number;
  totalSinIva: number;
  precioUnitSinIvaUsd: number;
  totalSinIvaUsd: number;
}

// Replica en JS la cadena de fórmulas del archivo interno (ver buildCotizacionExcelBuffer),
// para el archivo externo, donde las columnas de costo/mark up no existen y por lo tanto
// no hay celdas de las que colgar una fórmula: acá el resultado final sale calculado como
// valor fijo. INT() de Excel trunca hacia -infinito, igual que Math.floor (costos/cantidades
// siempre son >= 0 en este dominio, así que no hay diferencia práctica con truncar hacia 0).
function calcularPreciosItem(
  costoPorUnidad: number,
  markUpPct: number,
  cantidad: number,
  usdOficialCompra: number
): PreciosCalculados {
  const ventaConIva = costoPorUnidad * ((markUpPct + 100) / 100);
  const precioUnitSinIva = Math.floor(ventaConIva / 1.21);
  const totalSinIva = cantidad * precioUnitSinIva;
  const precioUnitSinIvaUsd = usdOficialCompra > 0 ? Math.floor((precioUnitSinIva / usdOficialCompra) * 100) / 100 : 0;
  const totalSinIvaUsd = Math.floor(cantidad * precioUnitSinIvaUsd * 100) / 100;
  return { ventaConIva, precioUnitSinIva, totalSinIva, precioUnitSinIvaUsd, totalSinIvaUsd };
}

function valorColumnaItem(
  col: ColumnaConfig,
  modo: ModoExportacion,
  ctx: {
    index: number;
    filaNum: number;
    item: SolicitudCotizacionItemConArticulo;
    articulo: SolicitudCotizacionItemConArticulo['articulo'];
    proveedor: string;
    precios: PreciosCalculados;
  }
): SheetCell {
  const { index, filaNum, item, articulo, proveedor, precios } = ctx;
  switch (col.key) {
    case 'item':
      return index + 1;
    case 'descripcion':
      return item.descripcionSolicitada;
    case 'descripcionIngles':
      return item.descripcionInglesSolicitada || '';
    case 'etm':
      return item.etmSolicitado || '';
    case 'marca':
      return item.marcaSolicitada || '';
    case 'modelo':
      return item.modeloSolicitado || '';
    case 'cantidad':
      return item.cantidadSolicitada;
    case 'itemOfrecido':
      return articulo?.nombre || '';
    case 'unidadMedida':
      return articulo ? 'Unidad' : '';
    case 'marcaOfrecida':
      return articulo?.marca || '';
    case 'modeloOfrecido':
      return ''; // Modelo del artículo ofrecido: no lo trackeamos, queda para completar a mano
    case 'imagen':
      return articulo?.imagenUrl ? { formula: `IMAGE("${articulo.imagenUrl}")` } : '';
    case 'proveedor':
      return proveedor;
    case 'costo':
      return item.precioUnitario ?? '';
    case 'costoTotal':
      return { formula: `G${filaNum}*N${filaNum}` };
    case 'markUp':
      return item.markUp ?? '';
    case 'ventaConIva':
      return { formula: `N${filaNum}*((P${filaNum}+100)/100)` };
    case 'precioUnitSinIva':
      return modo === 'interno' ? { formula: `INT(Q${filaNum}/1.21)` } : precios.precioUnitSinIva;
    case 'totalSinIva':
      return modo === 'interno' ? { formula: `G${filaNum}*R${filaNum}` } : precios.totalSinIva;
    case 'separadora':
      return null;
    case 'precioUnitSinIvaUsd':
      return modo === 'interno' ? { formula: `INT(R${filaNum}/$O$4*100)/100` } : precios.precioUnitSinIvaUsd;
    case 'totalSinIvaUsd':
      return modo === 'interno' ? { formula: `INT(G${filaNum}*U${filaNum}*100)/100` } : precios.totalSinIvaUsd;
    case 'plazoEntrega':
      return '';
    case 'comentarios':
      return '';
    default:
      return '';
  }
}

/**
 * Arma la matriz de filas/columnas de la cotización final, replicando el formato
 * de planilla que ya usa Nicole (columnas Solicitado / Ofrecido / Costo-MarkUp-Venta).
 * Es independiente de dónde se escriba después (Excel vía exceljs o Google Sheets vía API).
 *
 * Filas 1-6: cabecera (título, fecha/lugar de entrega, solicitado por, USD oficial
 * compra/venta, logos institucionales). En la versión Excel (buildCotizacionExcelBuffer)
 * esas celdas se pisan después con texto enriquecido, formato de moneda e imágenes; acá
 * van como texto plano simple para que la exportación a Google Sheets (sin esa post-edición)
 * tenga igual el dato, aunque sin el formato rico.
 *
 * `modo`: 'interno' (default, todas las columnas, fórmulas en vivo) o 'externo' (sin
 * Proveedor/Costo/Costo Total/Mark Up/Venta con IVA, precios finales como valor fijo).
 */
export function buildCotizacionSheetData(
  solicitud: SolicitudCotizacionConRelaciones,
  modo: ModoExportacion = 'interno'
): CotizacionSheetData {
  const titulo = `${solicitud.cliente.razonSocial} - Cotización${
    solicitud.numeroReferenciaCliente ? ` - ${solicitud.numeroReferenciaCliente}` : ''
  }`;

  const columnas = columnasParaModo(modo);

  const fechaEntregaTexto = solicitud.fechaEntrega
    ? new Date(solicitud.fechaEntrega).toLocaleDateString('es-AR')
    : '';

  const rows: SheetCell[][] = [
    [null, titulo],
    [null, `Fecha de Entrega: ${fechaEntregaTexto}`],
    [null, `Lugar de Entrega: ${solicitud.lugarEntrega || ''}`],
    [
      null, `Solicitado por: ${solicitud.solicitadoPor || ''}`,
      null, null, null, null, null, null, null, null, null, null, null, // C..M (11 columnas)
      'USD Oficial Compra', solicitud.usdOficialCompra ?? '',
    ],
    [
      null, null,
      null, null, null, null, null, null, null, null, null, null, null,
      'USD Oficial Venta', solicitud.usdOficialVenta ?? '',
    ],
    [],
    columnas.map((col) => col.header1),
    columnas.map((col) => col.header2),
  ];

  const primeraFilaItems = rows.length + 1; // fila 1-indexed donde arranca el primer ítem

  solicitud.items.forEach((item, index) => {
    const filaNum = primeraFilaItems + index;
    const articulo = item.articulo;

    const proveedor =
      articulo?.proveedorNombre ||
      (item.estadoItem === 'no_disponible' ? item.urlExterna : null) ||
      '';

    const precios = calcularPreciosItem(
      item.precioUnitario ?? 0,
      item.markUp ?? 0,
      item.cantidadSolicitada,
      solicitud.usdOficialCompra ?? 0
    );

    rows.push(columnas.map((col) => valorColumnaItem(col, modo, { index, filaNum, item, articulo, proveedor, precios })));
  });

  return { titulo, rows };
}

const COLORES_HEADER: Record<ColorHeader, { fill: string; fontColor: string }> = {
  celeste: { fill: 'FF00B0F0', fontColor: 'FFFFFFFF' },
  celesteAmarillo: { fill: 'FF00B0F0', fontColor: 'FFFFFF00' },
  verde: { fill: 'FF548235', fontColor: 'FFFFFFFF' },
  rojoAmarillo: { fill: 'FFFF0000', fontColor: 'FFFFFF00' },
};

const FORMATOS_PRECIO: Record<FormatoPrecio, string> = {
  pesos: '"$" #,##0.00',
  usd: '"USD" #,##0.00',
};

export async function buildCotizacionExcelBuffer(
  solicitud: SolicitudCotizacionConRelaciones,
  modo: ModoExportacion = 'interno'
): Promise<Buffer> {
  const { titulo, rows } = buildCotizacionSheetData(solicitud, modo);
  const columnas = columnasParaModo(modo);
  const numColumnas = columnas.length;

  const workbook = new ExcelJS.Workbook();
  workbook.title = titulo;
  // El archivo de referencia fija defaultColWidth=9 en la hoja: sin esto, exceljs omite
  // el <col> de las columnas cuyo ancho coincide con el default (A y la separadora) y
  // Excel las renderiza con SU propio default (8.43), más angostas que las 9 reales.
  const sheet = workbook.addWorksheet('Cotización', { properties: { defaultColWidth: 9 } });

  rows.forEach((row, rowIndex) => {
    row.forEach((cell, colIndex) => {
      const excelCell = sheet.getCell(rowIndex + 1, colIndex + 1);
      if (cell !== null && typeof cell === 'object' && 'formula' in cell) {
        excelCell.value = { formula: cell.formula };
      } else {
        excelCell.value = cell;
      }
    });
  });

  // Filas del header de columnas: 7 y 8 (se corrieron una fila hacia abajo respecto de
  // la planilla de referencia original por el agregado de "Lugar de Entrega").
  const FILA_HEADER_COLUMNAS_1 = 7;
  const FILA_HEADER_COLUMNAS_2 = 8;
  sheet.getRow(FILA_HEADER_COLUMNAS_1).font = { bold: true };
  sheet.getRow(FILA_HEADER_COLUMNAS_2).font = { bold: true };
  sheet.getRow(FILA_HEADER_COLUMNAS_1).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  sheet.getRow(FILA_HEADER_COLUMNAS_2).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

  // Columnas de título corto: en el archivo de referencia son una sola celda fusionada
  // verticalmente (dos filas), no texto repetido en dos filas. El resto (Unidad de Medida,
  // Imagen de lo Ofrecido, Costo por Unidad, Venta con IVA, Precio Unit./Total Sin IVA x2,
  // Plazo de Entrega) va partido en dos líneas sin fusionar, tal cual el original.
  columnas.forEach((col, i) => {
    if (col.mergeHeader) {
      sheet.mergeCells(FILA_HEADER_COLUMNAS_1, i + 1, FILA_HEADER_COLUMNAS_2, i + 1);
    }
  });

  // Colores del header de ítems, calcados de la planilla de referencia: celeste para
  // los datos "Solicitado" + el primer par Precio Unit./Total Sin IVA, verde para los
  // datos "Ofrecido" + el segundo par + Plazo/Comentarios, rojo para Proveedor/Costo/
  // Mark Up/Venta con IVA (estas últimas no existen en el modo externo).
  columnas.forEach((col, i) => {
    if (!col.color) return;
    const { fill, fontColor } = COLORES_HEADER[col.color];
    [FILA_HEADER_COLUMNAS_1, FILA_HEADER_COLUMNAS_2].forEach((row) => {
      const cell = sheet.getCell(row, i + 1);
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fill } };
      cell.font = { bold: true, color: { argb: fontColor } };
    });
  });

  columnas.forEach((col, i) => {
    sheet.getColumn(i + 1).width = col.width;
  });

  // Alto de filas calcado del archivo de referencia: título/fecha/lugar/solicitado por/
  // USD venta (20), fila del logo (11), header de columnas en dos líneas (24) y filas de
  // ítems (50). Un renglón más que el original por el agregado de "Lugar de Entrega".
  const primeraFilaItems = rows.length - solicitud.items.length + 1;
  [1, 2, 3, 4, 5].forEach((row) => {
    sheet.getRow(row).height = 20;
  });
  sheet.getRow(6).height = 11;
  sheet.getRow(FILA_HEADER_COLUMNAS_1).height = 24;
  sheet.getRow(FILA_HEADER_COLUMNAS_2).height = 24;
  for (let i = 0; i < solicitud.items.length; i++) {
    sheet.getRow(primeraFilaItems + i).height = 50;
  }

  // Cabecera: título en B1, etiqueta+valor en negrita/subrayado para Fecha/Lugar de
  // Entrega y Solicitado por, y el par etiqueta (N) / valor con formato moneda (O) para
  // USD Oficial Compra/Venta. Se pisan acá (en vez de en buildCotizacionSheetData) porque
  // el texto enriquecido y el numFmt son específicos de xlsx, no de la matriz que también
  // usa la exportación a Google Sheets. Estas celdas (columnas B, N, O) existen igual en
  // ambos modos porque solo se excluyen columnas M-Q, todas posteriores a la B y previas
  // (en valor de índice) a donde vuelven a usarse N/O — es la misma reutilización de
  // columna entre bloques de filas que ya hace el propio archivo interno.
  sheet.getCell('B1').font = { bold: true, size: 14 };

  const fuenteEtiqueta = { bold: true, underline: true, size: 11, name: 'Montserrat' } as const;
  const fuenteValor = { size: 11, name: 'Montserrat' } as const;

  function setEtiquetaValor(direccion: string, etiqueta: string, valor: string): void {
    sheet.getCell(direccion).value = {
      richText: [
        { font: fuenteEtiqueta, text: `${etiqueta}: ` },
        { font: fuenteValor, text: valor },
      ],
    };
  }

  const fechaEntregaTexto = solicitud.fechaEntrega
    ? new Date(solicitud.fechaEntrega).toLocaleDateString('es-AR')
    : '';
  setEtiquetaValor('B2', 'Fecha de Entrega', fechaEntregaTexto);
  setEtiquetaValor('B3', 'Lugar de Entrega', solicitud.lugarEntrega || '');
  setEtiquetaValor('B4', 'Solicitado por', solicitud.solicitadoPor || '');

  ['N4', 'N5'].forEach((direccion) => {
    sheet.getCell(direccion).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    sheet.getCell(direccion).font = fuenteEtiqueta;
  });
  sheet.getCell('O4').value = solicitud.usdOficialCompra ?? null;
  sheet.getCell('O5').value = solicitud.usdOficialVenta ?? null;
  ['O4', 'O5'].forEach((direccion) => {
    sheet.getCell(direccion).numFmt = '"$" #,##0.00';
    sheet.getCell(direccion).font = fuenteValor;
  });

  // Formato moneda en las columnas de precio que correspondan según el modo (en el
  // externo, Venta con IVA no existe; Precio/Total Sin IVA y su par en USD sí).
  for (let i = 0; i < solicitud.items.length; i++) {
    const filaNum = primeraFilaItems + i;
    columnas.forEach((col, colIndex) => {
      if (!col.formato) return;
      sheet.getCell(filaNum, colIndex + 1).numFmt = FORMATOS_PRECIO[col.formato];
    });
  }

  // Logos institucionales (siempre los mismos, ver backend/src/assets/logos.ts). Ocupan
  // las filas 1-6 (una más que en el original) para seguir cubriendo todo el bloque de
  // cabecera ahora que "Lugar de Entrega" agrega un renglón. Columnas H/K (7-8 y 10-11)
  // son iguales en ambos modos porque están antes del bloque M-Q que se excluye.
  // Los tipos de exceljs para addImage piden un Anchor completo (col/row nativos, offsets);
  // en la práctica la librería solo lee col/row para un two-cell anchor, así que se castea.
  const geLogoId = workbook.addImage({ base64: `data:image/png;base64,${LOGO_GE_VERNOVA_BASE64}`, extension: 'png' });
  sheet.addImage(geLogoId, { tl: { col: 7, row: 0 }, br: { col: 8, row: 6 } } as ExcelJS.ImageRange); // H1:H6
  const hofraLogoId = workbook.addImage({ base64: `data:image/png;base64,${LOGO_HOFRA_GROUP_BASE64}`, extension: 'png' });
  sheet.addImage(hofraLogoId, { tl: { col: 10, row: 0 }, br: { col: 11, row: 6 } } as ExcelJS.ImageRange); // K1:K6

  // Centrado global: todos los textos de todas las celdas quedan centrados horizontal y
  // verticalmente, pisando cualquier alineación previa (títulos, etiquetas, valores,
  // header e ítems), preservando el wrapText donde ya estaba activado.
  for (let r = 1; r <= rows.length; r++) {
    for (let c = 1; c <= numColumnas; c++) {
      const cell = sheet.getCell(r, c);
      cell.alignment = { ...cell.alignment, horizontal: 'center', vertical: 'middle' };
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

import ExcelJS from 'exceljs';
import { imageSize } from 'image-size';
import type { SolicitudCotizacionConRelaciones, SolicitudCotizacionItemConArticulo } from '@hofra/shared';
import { LOGO_GE_VERNOVA_BASE64, LOGO_HOFRA_GROUP_BASE64 } from '../assets/logos.js';

// Tamaño máximo de la imagen incrustada en la columna "Imagen de lo Ofrecido": se achica
// manteniendo la proporción original (nunca se agranda ni se deforma) para que entre en el
// alto de fila (ver FILA_ITEM_ALTURA_PT) sin invadir filas vecinas ni desbordar el ancho de
// la columna. Queda más chica que la fila/columna a propósito, para poder centrarla.
const IMAGEN_MAX_WIDTH_PT = 160;
const IMAGEN_MAX_HEIGHT_PT = 40;
const FILA_ITEM_ALTURA_PT = 50;
const PT_A_PX = 96 / 72; // exceljs toma el tamaño de imagen (ext) en píxeles a 96dpi
const PX_A_PT = 72 / 96;

export interface SheetCellFormula {
  formula: string; // sin el "=" inicial
}

export type SheetCell = string | number | null | SheetCellFormula;

export interface CotizacionSheetData {
  titulo: string;
  rows: SheetCell[][];
}

export type ModoExportacion = 'interno' | 'externo';

// 'sheets': Google Sheets soporta la función IMAGE() de forma nativa, así que la columna
// Imagen lleva la fórmula en vivo. 'excel' (xlsx vía exceljs): Excel no tiene esa función —
// al abrir el archivo tira "The formula couldn't be imported" y la reemplaza por el último
// valor calculado (texto plano) — así que ahí la imagen se descarga y se incrusta como
// imagen real en la celda (ver buildCotizacionExcelBuffer), y esta columna queda en blanco.
export type DestinoExportacion = 'sheets' | 'excel';

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

// Definición completa de las columnas del archivo interno (igual que la planilla de
// referencia de Nicole: Downloads/2 - Cristián - TC Argentina - Cotización 8.20 - #274.xlsx,
// salvo Costo/Costo Total, que se sacaron cuando el precio unitario sin IVA pasó a cargarse
// directo a mano en vez de calcularse desde costo + mark up — ver calcularPreciosItem).
// El archivo externo (para mandar al cliente) se arma filtrando las marcadas `soloInterno`
// (Proveedor, Mark Up, Venta con IVA) — todo lo demás (anchos, colores, merges, y las
// columnas de precio final que sí quedan) sale de esta misma lista, para que ambos modos
// no puedan desincronizarse entre sí.
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
  precioUnitSinIva: number;
  totalSinIva: number;
  precioUnitSinIvaUsd: number;
  totalSinIvaUsd: number;
}

// El precio unitario sin IVA (ARS y USD) se carga directo a mano en la grilla de revisión
// (ya no se deriva de costo + mark up ni de la cotización del dólar) — acá solo se
// multiplica por la cantidad para el archivo externo, donde no hay celdas de las que
// colgar una fórmula y el resultado final sale calculado como valor fijo.
function calcularPreciosItem(precioUnitSinIva: number, precioUnitSinIvaUsd: number, cantidad: number): PreciosCalculados {
  const totalSinIva = cantidad * precioUnitSinIva;
  const totalSinIvaUsd = Math.round(cantidad * precioUnitSinIvaUsd * 100) / 100;
  return { precioUnitSinIva, totalSinIva, precioUnitSinIvaUsd, totalSinIvaUsd };
}

function valorColumnaItem(
  col: ColumnaConfig,
  modo: ModoExportacion,
  destino: DestinoExportacion,
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
      // Columna del lado "Solicitado": lo que pidió el cliente, sin pisar con overrides.
      return item.marcaSolicitada || '';
    case 'modelo':
      return item.modeloSolicitado || '';
    case 'cantidad':
      return item.cantidad ?? item.cantidadSolicitada;
    case 'itemOfrecido':
      return item.nombreOfrecido || articulo?.nombre || '';
    case 'unidadMedida':
      return item.unidad || articulo?.presentacion || '';
    case 'marcaOfrecida':
      return item.marca || articulo?.marca || '';
    case 'modeloOfrecido':
      return item.modelo || '';
    case 'imagen':
      // En Excel la imagen se incrusta aparte (ver buildCotizacionExcelBuffer): acá solo
      // corresponde la fórmula para Google Sheets, que sí soporta IMAGE() nativamente.
      return destino === 'sheets' && articulo?.imagenUrl ? { formula: `IMAGE("${articulo.imagenUrl}")` } : '';
    case 'proveedor':
      return proveedor;
    case 'markUp':
      return item.markUp ?? null;
    case 'ventaConIva':
      // Ya no compone costo + mark up: el precio sin IVA se carga directo, acá solo se le suma el IVA.
      return { formula: `P${filaNum}*1.21` };
    case 'precioUnitSinIva':
      return precios.precioUnitSinIva;
    case 'totalSinIva':
      return modo === 'interno' ? { formula: `G${filaNum}*P${filaNum}` } : precios.totalSinIva;
    case 'separadora':
      return null;
    case 'precioUnitSinIvaUsd':
      return precios.precioUnitSinIvaUsd;
    case 'totalSinIvaUsd':
      return modo === 'interno' ? { formula: `G${filaNum}*S${filaNum}` } : precios.totalSinIvaUsd;
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
 * de planilla que ya usa Nicole (columnas Solicitado / Ofrecido / Mark Up-Venta).
 * Es independiente de dónde se escriba después (Excel vía exceljs o Google Sheets vía API).
 *
 * Filas 1-6: cabecera (título, fecha/lugar de entrega, solicitado por, USD oficial
 * compra/venta, logos institucionales). En la versión Excel (buildCotizacionExcelBuffer)
 * esas celdas se pisan después con texto enriquecido, formato de moneda e imágenes; acá
 * van como texto plano simple para que la exportación a Google Sheets (sin esa post-edición)
 * tenga igual el dato, aunque sin el formato rico.
 *
 * `modo`: 'interno' (default, todas las columnas, fórmulas en vivo) o 'externo' (sin
 * Proveedor/Mark Up/Venta con IVA, precios finales como valor fijo).
 */
export function buildCotizacionSheetData(
  solicitud: SolicitudCotizacionConRelaciones,
  modo: ModoExportacion = 'interno',
  destino: DestinoExportacion = 'sheets'
): CotizacionSheetData {
  const titulo = `${solicitud.cliente?.razonSocial || 'Sin Cliente'} - Cotización${
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
      'USD Oficial Compra', solicitud.usdOficialCompra ?? null,
    ],
    [
      null, null,
      null, null, null, null, null, null, null, null, null, null, null,
      'USD Oficial Venta', solicitud.usdOficialVenta ?? null,
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
      item.precioUnitarioUsd ?? 0,
      item.cantidad ?? item.cantidadSolicitada
    );

    rows.push(columnas.map((col) => valorColumnaItem(col, modo, destino, { index, filaNum, item, articulo, proveedor, precios })));
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
  const { titulo, rows } = buildCotizacionSheetData(solicitud, modo, 'excel');
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
  // Imagen de lo Ofrecido, Venta con IVA, Precio Unit./Total Sin IVA x2,
  // Plazo de Entrega) va partido en dos líneas sin fusionar, tal cual el original.
  columnas.forEach((col, i) => {
    if (col.mergeHeader) {
      sheet.mergeCells(FILA_HEADER_COLUMNAS_1, i + 1, FILA_HEADER_COLUMNAS_2, i + 1);
    }
  });

  // Colores del header de ítems, calcados de la planilla de referencia: celeste para
  // los datos "Solicitado" + el primer par Precio Unit./Total Sin IVA, verde para los
  // datos "Ofrecido" + el segundo par + Plazo/Comentarios, rojo para Proveedor/
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
    sheet.getRow(primeraFilaItems + i).height = FILA_ITEM_ALTURA_PT;
  }

  // Cabecera: título en B1, etiqueta+valor en negrita/subrayado para Fecha/Lugar de
  // Entrega y Solicitado por, y el par etiqueta (N) / valor con formato moneda (O) para
  // USD Oficial Compra/Venta. Se pisan acá (en vez de en buildCotizacionSheetData) porque
  // el texto enriquecido y el numFmt son específicos de xlsx, no de la matriz que también
  // usa la exportación a Google Sheets. Estas celdas (columnas B, N, O) existen igual en
  // ambos modos porque solo se excluyen columnas M-O, todas posteriores a la B y previas
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
  // son iguales en ambos modos porque están antes del bloque M-O que se excluye.
  // Los tipos de exceljs para addImage piden un Anchor completo (col/row nativos, offsets);
  // en la práctica la librería solo lee col/row para un two-cell anchor, así que se castea.
  const geLogoId = workbook.addImage({ base64: `data:image/png;base64,${LOGO_GE_VERNOVA_BASE64}`, extension: 'png' });
  sheet.addImage(geLogoId, { tl: { col: 7, row: 0 }, br: { col: 8, row: 6 } } as ExcelJS.ImageRange); // H1:H6
  const hofraLogoId = workbook.addImage({ base64: `data:image/png;base64,${LOGO_HOFRA_GROUP_BASE64}`, extension: 'png' });
  sheet.addImage(hofraLogoId, { tl: { col: 10, row: 0 }, br: { col: 11, row: 6 } } as ExcelJS.ImageRange); // K1:K6

  // Imagen del artículo ofrecido: Excel no soporta la función IMAGE() de Google Sheets (al
  // abrir el archivo tira "The formula couldn't be imported" y la pisa con el último valor
  // calculado), así que acá se descarga cada imagen y se incrusta de verdad en la celda de
  // la columna "Imagen" de cada fila de ítem — un fetch fallido no debe tirar abajo todo el
  // export, solo esa celda queda sin imagen.
  const imagenColIndex = columnas.findIndex((col) => col.key === 'imagen');
  if (imagenColIndex !== -1) {
    // Ancho de la columna "Imagen" en puntos, para poder centrar horizontalmente. exceljs
    // guarda el ancho de columna en "unidades de caracter" de Excel (no en px/pt); se
    // aproxima a píxeles con la fórmula estándar de Excel para la fuente por defecto
    // (Calibri 11, ancho de dígito máximo ≈ 7px) y de ahí a puntos. Es una aproximación
    // (no hay forma exacta sin conocer la fuente real), suficiente para centrar a ojo.
    const anchoColumnaImagenPt = (columnas[imagenColIndex].width * 7 + 5) * PX_A_PT;

    await Promise.all(
      solicitud.items.map(async (item, i) => {
        const url = item.articulo?.imagenUrl;
        if (!url) return;
        try {
          // Timeout corto para que una imagen que no responde no cuelgue todo el export.
          const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
          if (!response.ok) return;
          const buffer = Buffer.from(await response.arrayBuffer());
          const contentType = response.headers.get('content-type') || '';
          const extension = contentType.includes('png') ? 'png' : contentType.includes('gif') ? 'gif' : 'jpeg';
          // exceljs tipa Image.buffer como el Buffer "clásico" (no genérico); el Buffer que
          // devuelve @types/node moderno es Buffer<ArrayBufferLike>, estructuralmente
          // incompatible a nivel de tipos aunque sea el mismo objeto en runtime.
          const imageId = workbook.addImage({ buffer, extension } as unknown as ExcelJS.Image);

          // Se escala manteniendo proporción para entrar en 170x50pt, sin agrandar imágenes
          // que ya sean más chicas (solo reduce, nunca estira ni deforma).
          const maxWidthPx = IMAGEN_MAX_WIDTH_PT * PT_A_PX;
          const maxHeightPx = IMAGEN_MAX_HEIGHT_PT * PT_A_PX;
          let width = maxWidthPx;
          let height = maxHeightPx;
          try {
            const dimensiones = imageSize(buffer);
            if (dimensiones.width && dimensiones.height) {
              const escala = Math.min(maxWidthPx / dimensiones.width, maxHeightPx / dimensiones.height, 1);
              width = dimensiones.width * escala;
              height = dimensiones.height * escala;
            }
          } catch {
            // Si no se puede leer el tamaño real (formato raro, header corrupto, etc.),
            // se usa el máximo como último recurso en vez de no mostrar nada.
          }

          // Centrado: cuánto "sobra" de columna/fila respecto a la imagen ya escalada, repartido
          // mitad arriba/abajo y mitad izquierda/derecha. tl.col/row acepta valores fraccionarios
          // (ej. 2.5 = mitad de la columna 2) — así es como exceljs documenta el offset dentro
          // de una celda, en vez de manipular EMU/colOff a mano.
          const widthPt = width * PX_A_PT;
          const heightPt = height * PX_A_PT;
          const offsetColFraccion = Math.max(0, (anchoColumnaImagenPt - widthPt) / (2 * anchoColumnaImagenPt));
          const offsetRowFraccion = Math.max(0, (FILA_ITEM_ALTURA_PT - heightPt) / (2 * FILA_ITEM_ALTURA_PT));

          const filaIndex0 = primeraFilaItems + i - 1;
          sheet.addImage(imageId, {
            tl: { col: imagenColIndex + offsetColFraccion, row: filaIndex0 + offsetRowFraccion },
            ext: { width, height },
          } as unknown as ExcelJS.ImagePosition);
        } catch (err) {
          console.error(`No se pudo descargar la imagen del artículo (ítem ${i + 1}):`, err);
        }
      })
    );
  }

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

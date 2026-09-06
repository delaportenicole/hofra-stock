import ExcelJS from 'exceljs';
import type { SolicitudCotizacionConRelaciones } from '@hofra/shared';
import { LOGO_GE_VERNOVA_BASE64, LOGO_HOFRA_GROUP_BASE64 } from '../assets/logos.js';

export interface SheetCellFormula {
  formula: string; // sin el "=" inicial
}

export type SheetCell = string | number | null | SheetCellFormula;

export interface CotizacionSheetData {
  titulo: string;
  rows: SheetCell[][];
}

// Header partido en dos filas (igual que la planilla de referencia de Nicole), donde
// las columnas de una sola palabra van fusionadas verticalmente (mismo texto repetido
// en ambas filas) y las de título largo se parten en dos líneas para no ensanchar la
// columna. Ver documentacion.md / módulo Solicitudes de Cotización para el archivo
// de referencia (Downloads/2 - Cristián - TC Argentina - Cotización 8.20 - #274.xlsx).
const COLUMNAS_HEADER_FILA1: SheetCell[] = [
  'ITEM', 'DESCRIPCION', 'DESCRIPCION EN INGLES ', 'ETM', 'MARCA', 'MODELO', 'CANT',
  'Item Ofrecido - Descripción', 'Unidad de', 'Marca', 'Modelo', 'Imagen de', 'Proveedor',
  'Costo', 'Costo Total', 'Mark Up', 'Venta ', 'Precio Unit.', 'Total ',
  null, 'Precio Unit.', 'Total ', 'Plazo', 'Comentarios',
];

const COLUMNAS_HEADER_FILA2: SheetCell[] = [
  'ITEM', 'DESCRIPCION', 'DESCRIPCION EN INGLES ', 'ETM', 'MARCA', 'MODELO', 'CANT',
  'Item Ofrecido - Descripción', 'Medida', 'Marca', 'Modelo', 'lo Ofrecido', 'Proveedor',
  'por Unidad', 'Costo Total', 'Mark Up', 'con iva', 'Sin Iva', 'Sin Iva',
  null, 'Sin Iva', 'Sin Iva', 'de Entrega', 'Comentarios',
];

/**
 * Arma la matriz de filas/columnas de la cotización final, replicando el formato
 * de planilla que ya usa Nicole (columnas Solicitado / Ofrecido / Costo-MarkUp-Venta).
 * Es independiente de dónde se escriba después (Excel vía exceljs o Google Sheets vía API).
 *
 * Filas 1-5: cabecera (título, fecha de entrega, solicitado por, USD oficial compra/venta,
 * logos institucionales). En la versión Excel (buildCotizacionExcelBuffer) esas celdas se
 * pisan después con texto enriquecido, formato de moneda e imágenes; acá van como texto
 * plano simple para que la exportación a Google Sheets (sin esa post-edición) tenga igual
 * el dato, aunque sin el formato rico.
 */
export function buildCotizacionSheetData(solicitud: SolicitudCotizacionConRelaciones): CotizacionSheetData {
  const titulo = `${solicitud.cliente.razonSocial} - Cotización${
    solicitud.numeroReferenciaCliente ? ` - ${solicitud.numeroReferenciaCliente}` : ''
  }`;

  const fechaEntregaTexto = solicitud.fechaEntrega
    ? new Date(solicitud.fechaEntrega).toLocaleDateString('es-AR')
    : '';

  const rows: SheetCell[][] = [
    [null, titulo],
    [null, `Fecha de Entrega: ${fechaEntregaTexto}`],
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
    COLUMNAS_HEADER_FILA1,
    COLUMNAS_HEADER_FILA2,
  ];

  const primeraFilaItems = rows.length + 1; // fila 1-indexed donde arranca el primer ítem

  solicitud.items.forEach((item, index) => {
    const filaNum = primeraFilaItems + index;
    const articulo = item.articulo;

    const proveedor =
      articulo?.proveedorNombre ||
      (item.estadoItem === 'no_disponible' ? item.urlExterna : null) ||
      '';

    // Costo (N), Mark Up (P), Plazo de Entrega (W) y Comentarios (X) se completan a
    // mano en Excel después de descargar, igual que en la planilla original de Nicole.
    // El resto de la cadena de precios es fórmula en vivo, encadenada a partir de esas
    // dos celdas manuales: Costo Total = cant×costo, Venta con IVA = costo con markup
    // aplicado, Precio/Total Sin IVA = Venta sin el 21% de IVA, y el segundo par (U/V)
    // convierte esos mismos valores a USD usando el tipo de cambio Oficial Compra del
    // header ($O$3, referencia absoluta porque es igual para todos los ítems).
    rows.push([
      index + 1,
      item.descripcionSolicitada,
      item.descripcionInglesSolicitada || '',
      item.etmSolicitado || '',
      item.marcaSolicitada || '',
      item.modeloSolicitado || '',
      item.cantidadSolicitada,
      articulo?.nombre || '',
      articulo ? 'Unidad' : '',
      articulo?.marca || '',
      '', // Modelo del artículo ofrecido: no lo trackeamos, queda para completar a mano
      articulo?.imagenUrl ? { formula: `IMAGE("${articulo.imagenUrl}")` } : '',
      proveedor,
      '', // N: Costo por Unidad (manual)
      { formula: `G${filaNum}*N${filaNum}` }, // O: Costo Total
      '', // P: Mark Up % (manual)
      { formula: `N${filaNum}*((P${filaNum}+100)/100)` }, // Q: Venta con IVA
      { formula: `INT(Q${filaNum}/1.21)` }, // R: Precio Unit. Sin IVA
      { formula: `G${filaNum}*R${filaNum}` }, // S: Total Sin IVA
      null, // T: separadora, sin datos
      { formula: `INT(R${filaNum}/$O$3*100)/100` }, // U: Precio Unit. Sin IVA (USD)
      { formula: `INT(G${filaNum}*U${filaNum}*100)/100` }, // V: Total Sin IVA (USD)
      '', // W: Plazo de Entrega (manual)
      '', // X: Comentarios (manual)
    ]);
  });

  return { titulo, rows };
}

export async function buildCotizacionExcelBuffer(solicitud: SolicitudCotizacionConRelaciones): Promise<Buffer> {
  const { titulo, rows } = buildCotizacionSheetData(solicitud);

  const workbook = new ExcelJS.Workbook();
  workbook.title = titulo;
  const sheet = workbook.addWorksheet('Cotización');

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

  sheet.getRow(6).font = { bold: true };
  sheet.getRow(7).font = { bold: true };

  // Columnas de título corto: en el archivo de referencia son una sola celda fusionada
  // verticalmente (filas 6:7), no texto repetido en dos filas. El resto (Unidad de Medida,
  // Imagen de lo Ofrecido, Costo por Unidad, Venta con IVA, Precio Unit./Total Sin IVA x2,
  // Plazo de Entrega) va partido en dos líneas sin fusionar, tal cual el original.
  const columnasFusionHeader = [1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 13, 15, 16, 24];
  columnasFusionHeader.forEach((col) => {
    sheet.mergeCells(6, col, 7, col);
  });

  // Colores del header de ítems, calcados de la planilla de referencia: celeste para
  // los datos "Solicitado" + el primer par Precio Unit./Total Sin IVA, verde para los
  // datos "Ofrecido" + el segundo par + Plazo/Comentarios, rojo para Proveedor/Costo/
  // Mark Up/Venta con IVA. La columna T queda sin color (es la separadora en blanco).
  const gruposColorHeader: Array<{ cols: number[]; fill: string; fontColor: string }> = [
    { cols: [1, 2, 3, 4, 5, 6, 18, 19], fill: 'FF00B0F0', fontColor: 'FFFFFFFF' }, // A-F, R, S: celeste
    { cols: [9], fill: 'FF00B0F0', fontColor: 'FFFFFF00' }, // I (Unidad de Medida): celeste, texto amarillo
    { cols: [7, 8, 10, 11, 12, 21, 22, 23, 24], fill: 'FF548235', fontColor: 'FFFFFFFF' }, // G,H,J,K,L,U,V,W,X: verde
    { cols: [13, 14, 15, 16, 17], fill: 'FFFF0000', fontColor: 'FFFFFF00' }, // M-Q: rojo, texto amarillo
  ];
  gruposColorHeader.forEach(({ cols, fill, fontColor }) => {
    cols.forEach((col) => {
      [6, 7].forEach((row) => {
        const cell = sheet.getCell(row, col);
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fill } };
        cell.font = { bold: true, color: { argb: fontColor } };
      });
    });
  });

  const anchoColumnas: Record<number, number> = {
    1: 9, 2: 62, 3: 45, 4: 31.75, 5: 24.25, 6: 21, 7: 10.25, 8: 51.25,
    9: 16.75, 10: 18, 11: 25, 12: 28.75, 13: 36, 14: 20.25, 15: 20.25,
    16: 18.75, 17: 21, 18: 21, 19: 22.75, 20: 9, 21: 21.5, 22: 22.75,
    23: 21.75, 24: 51,
  };
  Object.entries(anchoColumnas).forEach(([col, width]) => {
    sheet.getColumn(Number(col)).width = width;
  });

  // Cabecera: título en B1, etiqueta+valor en negrita/subrayado para Fecha de Entrega
  // y Solicitado por, y el par etiqueta (N) / valor con formato moneda (O) para USD
  // Oficial Compra/Venta. Se pisan acá (en vez de en buildCotizacionSheetData) porque
  // el texto enriquecido y el numFmt son específicos de xlsx, no de la matriz que
  // también usa la exportación a Google Sheets.
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
  setEtiquetaValor('B3', 'Solicitado por', solicitud.solicitadoPor || '');

  ['N3', 'N4'].forEach((direccion) => {
    sheet.getCell(direccion).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    sheet.getCell(direccion).font = fuenteEtiqueta;
  });
  sheet.getCell('O3').value = solicitud.usdOficialCompra ?? null;
  sheet.getCell('O4').value = solicitud.usdOficialVenta ?? null;
  ['O3', 'O4'].forEach((direccion) => {
    sheet.getCell(direccion).numFmt = '"$" #,##0.00';
    sheet.getCell(direccion).font = fuenteValor;
  });

  // Logos institucionales (siempre los mismos, ver backend/src/assets/logos.ts).
  // Los tipos de exceljs para addImage piden un Anchor completo (col/row nativos, offsets);
  // en la práctica la librería solo lee col/row para un two-cell anchor, así que se castea.
  const geLogoId = workbook.addImage({ base64: `data:image/png;base64,${LOGO_GE_VERNOVA_BASE64}`, extension: 'png' });
  sheet.addImage(geLogoId, { tl: { col: 7, row: 0 }, br: { col: 8, row: 5 } } as ExcelJS.ImageRange); // H1:H5
  const hofraLogoId = workbook.addImage({ base64: `data:image/png;base64,${LOGO_HOFRA_GROUP_BASE64}`, extension: 'png' });
  sheet.addImage(hofraLogoId, { tl: { col: 10, row: 0 }, br: { col: 11, row: 5 } } as ExcelJS.ImageRange); // K1:K5

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

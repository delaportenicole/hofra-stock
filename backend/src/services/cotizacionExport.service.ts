import ExcelJS from 'exceljs';
import type { SolicitudCotizacionConRelaciones } from '@hofra/shared';

export interface SheetCellFormula {
  formula: string; // sin el "=" inicial
}

export type SheetCell = string | number | null | SheetCellFormula;

export interface CotizacionSheetData {
  titulo: string;
  rows: SheetCell[][];
}

const COLUMNAS_HEADER: SheetCell[] = [
  'ITEM',
  'DESCRIPCION',
  'DESCRIPCION EN INGLES',
  'ETM',
  'MARCA',
  'MODELO',
  'CANT',
  'Item Ofrecido - Descripción',
  'Unidad de Medida',
  'Marca',
  'Modelo',
  'Imagen de lo Ofrecido',
  'Proveedor',
  'Costo por Unidad',
  'Costo Total',
  'Mark Up',
  'Venta con IVA',
  'Precio Unit. Sin IVA',
  'Total Sin IVA',
];

/**
 * Arma la matriz de filas/columnas de la cotización final, replicando el formato
 * de planilla que ya usa Nicole (columnas Solicitado / Ofrecido / Costo-MarkUp-Venta).
 * Es independiente de dónde se escriba después (Excel vía exceljs o Google Sheets vía API).
 */
export function buildCotizacionSheetData(solicitud: SolicitudCotizacionConRelaciones): CotizacionSheetData {
  const titulo = `${solicitud.cliente.razonSocial} - Cotización${
    solicitud.numeroReferenciaCliente ? ` - ${solicitud.numeroReferenciaCliente}` : ''
  }`;

  const rows: SheetCell[][] = [
    [titulo],
    [],
    ['Fecha de Entrega:', ''],
    ['Lugar de Entrega:', ''],
    ['Solicitado por:', solicitud.cliente.contacto || ''],
    COLUMNAS_HEADER,
  ];

  const primeraFilaItems = rows.length + 1; // fila 1-indexed donde arranca el primer ítem

  solicitud.items.forEach((item, index) => {
    const filaNum = primeraFilaItems + index;
    const articulo = item.articulo;

    const proveedor =
      articulo?.proveedorNombre ||
      (item.estadoItem === 'no_disponible' ? item.urlExterna : null) ||
      '';

    const totalSinIva: SheetCell =
      item.precioUnitario != null ? { formula: `G${filaNum}*R${filaNum}` } : '';

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
      '', // Costo por Unidad
      '', // Costo Total
      '', // Mark Up
      '', // Venta con IVA
      item.precioUnitario ?? '',
      totalSinIva,
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

  sheet.getRow(1).font = { bold: true, size: 14 };
  sheet.getRow(6).font = { bold: true };
  sheet.getColumn(2).width = 40; // Descripción
  sheet.getColumn(8).width = 40; // Item Ofrecido - Descripción
  sheet.getColumn(13).width = 30; // Proveedor

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

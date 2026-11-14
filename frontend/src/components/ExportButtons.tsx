import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';

export type ExportColumnType = 'text' | 'number' | 'currency' | 'date';

export interface ExportColumn<T> {
  key: string;
  header: string;
  // Tipo de dato real de la celda en Excel. Default 'text'.
  // 'number'/'currency' generan celdas numéricas reales (permiten SUMA, ordenar, filtrar).
  // 'currency' además aplica formato de moneda a la celda sin tocar el valor numérico.
  // 'date' genera una celda de fecha real de Excel a partir de un Date o string/number parseable.
  type?: ExportColumnType;
  // Extrae el valor crudo de la fila. Si no se da, se usa item[key] directamente.
  // Útil para campos anidados (ej. item.rubro.nombre).
  value?: (item: T) => unknown;
}

interface ExportButtonsProps<T> {
  data: T[];
  filename: string;
  columns: ExportColumn<T>[];
  // Si se provee, se usa para traer el set completo que coincide con los filtros
  // actuales (no solo la página cargada en la grilla) al momento de exportar.
  getExportData?: () => Promise<T[]>;
}

const CURRENCY_FORMAT = '"$" #,##0.00';
const DATE_FORMAT = 'dd/mm/yyyy';

function toCellValue(raw: unknown, type: ExportColumnType): string | number | Date | null {
  if (raw === undefined || raw === null || raw === '') return null;

  switch (type) {
    case 'number':
    case 'currency': {
      const num = typeof raw === 'number' ? raw : Number(raw);
      return Number.isNaN(num) ? null : num;
    }
    case 'date': {
      const date = raw instanceof Date ? raw : new Date(raw as string | number);
      return Number.isNaN(date.getTime()) ? null : date;
    }
    default:
      return String(raw);
  }
}

function buildRows<T>(items: T[], columns: ExportColumn<T>[]) {
  return items.map((item) => {
    const row: Record<string, string | number | Date | null> = {};
    columns.forEach((col) => {
      const raw = col.value ? col.value(item) : (item as Record<string, unknown>)[col.key];
      row[col.header] = toCellValue(raw, col.type ?? 'text');
    });
    return row;
  });
}

// json_to_sheet ya tipa correctamente number/Date como celdas numéricas/fecha reales;
// acá solo agregamos el formato de visualización (moneda/fecha) sin alterar el valor.
function applyColumnFormats<T>(worksheet: XLSX.WorkSheet, columns: ExportColumn<T>[], rowCount: number) {
  columns.forEach((col, colIndex) => {
    if (col.type !== 'currency' && col.type !== 'date') return;
    const format = col.type === 'currency' ? CURRENCY_FORMAT : DATE_FORMAT;
    for (let r = 0; r < rowCount; r++) {
      const ref = XLSX.utils.encode_cell({ r: r + 1, c: colIndex }); // +1: la fila 0 es el header
      const cell = worksheet[ref];
      if (cell && cell.t === 'n') cell.z = format;
    }
  });
}

export function ExportButtons<T>({
  data,
  filename,
  columns,
  getExportData,
}: ExportButtonsProps<T>) {
  const [isExporting, setIsExporting] = useState(false);

  const resolveData = async (): Promise<T[]> => {
    if (!getExportData) return data;

    setIsExporting(true);
    try {
      return await getExportData();
    } finally {
      setIsExporting(false);
    }
  };

  const buildWorksheet = (items: T[]) => {
    const rows = buildRows(items, columns);
    const worksheet = XLSX.utils.json_to_sheet(rows);
    applyColumnFormats(worksheet, columns, items.length);
    return worksheet;
  };

  const exportToExcel = async () => {
    const worksheet = buildWorksheet(await resolveData());
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Datos');
    XLSX.writeFile(workbook, `${filename}.xlsx`);
  };

  const exportToCSV = async () => {
    const worksheet = buildWorksheet(await resolveData());
    const csv = XLSX.utils.sheet_to_csv(worksheet);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}.csv`;
    link.click();
  };

  return (
    <div className="flex gap-2">
      <button onClick={exportToExcel} disabled={isExporting} className="btn-secondary btn-sm">
        {isExporting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Download className="w-4 h-4 mr-1" />}
        Excel
      </button>
      <button onClick={exportToCSV} disabled={isExporting} className="btn-secondary btn-sm">
        {isExporting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Download className="w-4 h-4 mr-1" />}
        CSV
      </button>
    </div>
  );
}

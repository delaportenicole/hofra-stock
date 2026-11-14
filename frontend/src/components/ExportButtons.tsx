import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';

interface ExportButtonsProps<T> {
  data: T[];
  filename: string;
  columns: Array<{
    key: string;
    header: string;
    format?: (value: unknown) => string;
  }>;
  // Si se provee, se usa para traer el set completo que coincide con los filtros
  // actuales (no solo la página cargada en la grilla) al momento de exportar.
  getExportData?: () => Promise<T[]>;
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

  const toRows = (items: T[]) =>
    items.map((item) => {
      const row: Record<string, string> = {};
      columns.forEach((col) => {
        const value = (item as Record<string, unknown>)[col.key];
        row[col.header] = col.format ? col.format(value) : String(value ?? '');
      });
      return row;
    });

  const exportToExcel = async () => {
    const exportData = toRows(await resolveData());
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Datos');
    XLSX.writeFile(workbook, `${filename}.xlsx`);
  };

  const exportToCSV = async () => {
    const exportData = toRows(await resolveData());
    const worksheet = XLSX.utils.json_to_sheet(exportData);
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

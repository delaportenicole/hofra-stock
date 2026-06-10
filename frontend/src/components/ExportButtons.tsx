import { Download } from 'lucide-react';
import * as XLSX from 'xlsx';

interface ExportButtonsProps<T> {
  data: T[];
  filename: string;
  columns: Array<{
    key: string;
    header: string;
    format?: (value: unknown) => string;
  }>;
}

export function ExportButtons<T>({
  data,
  filename,
  columns,
}: ExportButtonsProps<T>) {
  const exportToExcel = () => {
    const exportData = data.map((item) => {
      const row: Record<string, string> = {};
      columns.forEach((col) => {
        const value = (item as Record<string, unknown>)[col.key];
        row[col.header] = col.format ? col.format(value) : String(value ?? '');
      });
      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Datos');
    XLSX.writeFile(workbook, `${filename}.xlsx`);
  };

  const exportToCSV = () => {
    const exportData = data.map((item) => {
      const row: Record<string, string> = {};
      columns.forEach((col) => {
        const value = (item as Record<string, unknown>)[col.key];
        row[col.header] = col.format ? col.format(value) : String(value ?? '');
      });
      return row;
    });

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
      <button onClick={exportToExcel} className="btn-secondary btn-sm">
        <Download className="w-4 h-4 mr-1" />
        Excel
      </button>
      <button onClick={exportToCSV} className="btn-secondary btn-sm">
        <Download className="w-4 h-4 mr-1" />
        CSV
      </button>
    </div>
  );
}

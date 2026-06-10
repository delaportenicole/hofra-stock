import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { LoadingSpinner } from './LoadingSpinner';

export interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  className?: string;
  sortable?: boolean;
  sortKey?: string; // Key to use for sorting if different from key
  getSortValue?: (item: T) => string | number | null; // Custom function to get sort value
}

export type SortDirection = 'asc' | 'desc';

export interface SortConfig {
  key: string;
  direction: SortDirection;
}

const LIMIT_OPTIONS = [10, 50, 100];

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  isLoading?: boolean;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  onPageChange?: (page: number) => void;
  onLimitChange?: (limit: number) => void;
  onRowClick?: (item: T) => void;
  getRowHref?: (item: T) => string;
  emptyMessage?: string;
  defaultSort?: SortConfig;
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  isLoading = false,
  pagination,
  onPageChange,
  onLimitChange,
  onRowClick,
  getRowHref,
  emptyMessage = 'No hay datos para mostrar',
  defaultSort,
}: DataTableProps<T>) {
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(defaultSort || null);

  const handleSort = (column: Column<T>) => {
    if (!column.sortable) return;

    const sortKey = column.sortKey || column.key;

    setSortConfig((current) => {
      if (current?.key === sortKey) {
        // Toggle direction or remove sort
        if (current.direction === 'asc') {
          return { key: sortKey, direction: 'desc' };
        }
        return { key: sortKey, direction: 'asc' };
      }
      // New sort column, default to ascending
      return { key: sortKey, direction: 'asc' };
    });
  };

  const sortedData = useMemo(() => {
    if (!sortConfig) return data;

    const column = columns.find(c => (c.sortKey || c.key) === sortConfig.key);
    if (!column) return data;

    return [...data].sort((a, b) => {
      let aValue: string | number | null;
      let bValue: string | number | null;

      if (column.getSortValue) {
        aValue = column.getSortValue(a);
        bValue = column.getSortValue(b);
      } else {
        const key = column.sortKey || column.key;
        aValue = (a as Record<string, unknown>)[key] as string | number | null;
        bValue = (b as Record<string, unknown>)[key] as string | number | null;
      }

      // Handle null/undefined
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return sortConfig.direction === 'asc' ? 1 : -1;
      if (bValue == null) return sortConfig.direction === 'asc' ? -1 : 1;

      // Compare values
      let comparison = 0;
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        comparison = aValue.localeCompare(bValue, 'es', { sensitivity: 'base' });
      } else {
        comparison = aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      }

      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });
  }, [data, sortConfig, columns]);

  const handleRowClick = (item: T, event: React.MouseEvent) => {
    // Si hay un href, abrir en nueva pestaña
    if (getRowHref) {
      // Evitar que se dispare si el click fue en un botón o link
      const target = event.target as HTMLElement;
      if (target.closest('button') || target.closest('a')) {
        return;
      }
      window.open(getRowHref(item), '_blank');
      return;
    }
    // Si hay onRowClick, usarlo
    if (onRowClick) {
      onRowClick(item);
    }
  };

  const getSortIcon = (column: Column<T>) => {
    if (!column.sortable) return null;

    const sortKey = column.sortKey || column.key;

    if (sortConfig?.key !== sortKey) {
      return <ArrowUpDown className="w-4 h-4 text-gray-400" />;
    }

    return sortConfig.direction === 'asc'
      ? <ArrowUp className="w-4 h-4 text-primary-600" />
      : <ArrowDown className="w-4 h-4 text-primary-600" />;
  };

  const isClickable = !!getRowHref || !!onRowClick;

  if (isLoading) {
    return (
      <div className="card p-8">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`${column.className || ''} ${column.sortable ? 'cursor-pointer select-none hover:bg-gray-100' : ''}`}
                  onClick={() => handleSort(column)}
                >
                  <div className="flex items-center gap-1">
                    <span>{column.header}</span>
                    {getSortIcon(column)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {sortedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-8 text-gray-500">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              sortedData.map((item) => (
                <tr
                  key={keyExtractor(item)}
                  onClick={(e) => handleRowClick(item, e)}
                  className={isClickable ? 'cursor-pointer hover:bg-gray-50' : ''}
                >
                  {columns.map((column) => (
                    <td key={column.key} className={column.className}>
                      {column.render
                        ? column.render(item)
                        : (item as Record<string, unknown>)[column.key]?.toString()}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination && (
        <div className="px-6 py-3 border-t border-gray-200 flex items-center justify-between bg-gray-50">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Mostrar</span>
              <select
                value={pagination.limit}
                onChange={(e) => onLimitChange?.(Number(e.target.value))}
                className="text-sm border border-gray-300 rounded px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {LIMIT_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <span className="text-sm text-gray-500">por página</span>
            </div>
            <div className="text-sm text-gray-500">
              {pagination.total > 0 ? (
                <>
                  Mostrando {(pagination.page - 1) * pagination.limit + 1} -{' '}
                  {Math.min(pagination.page * pagination.limit, pagination.total)} de{' '}
                  {pagination.total}
                </>
              ) : (
                'Sin registros'
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange?.(1)}
              disabled={pagination.page === 1}
              className="p-1 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronsLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => onPageChange?.(pagination.page - 1)}
              disabled={pagination.page === 1}
              className="p-1 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <span className="px-3 py-1 text-sm">
              Página {pagination.page} de {pagination.totalPages || 1}
            </span>

            <button
              onClick={() => onPageChange?.(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="p-1 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <button
              onClick={() => onPageChange?.(pagination.totalPages)}
              disabled={pagination.page >= pagination.totalPages}
              className="p-1 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronsRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

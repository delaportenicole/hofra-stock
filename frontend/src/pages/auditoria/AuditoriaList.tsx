import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Filter,
  ChevronDown,
  ChevronUp,
  Plus,
  Edit,
  Trash2,
  Package,
  RefreshCw,
  ArrowRight,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { auditLogService } from '../../services/auditLog.service';
import { usuariosService } from '../../services/usuarios.service';
import { Badge } from '../../components/Badge';
import { usePagination } from '../../hooks/usePagination';
import { getErrorMessage } from '../../services/api';
import toast from 'react-hot-toast';
import type { AuditLogConUsuario, UsuarioConRoles } from '@hofra/shared';

// Acciones que se registran
const ACCION_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  crear: { label: 'Creación', icon: <Plus className="w-3.5 h-3.5" />, color: 'bg-success-100 text-success-700' },
  actualizar: { label: 'Actualización', icon: <Edit className="w-3.5 h-3.5" />, color: 'bg-primary-100 text-primary-700' },
  eliminar: { label: 'Eliminación', icon: <Trash2 className="w-3.5 h-3.5" />, color: 'bg-danger-100 text-danger-700' },
};

// Entidades que se auditan
const ENTIDADES_AUDITADAS = ['articulos', 'entregas', 'reposiciones'];

const ENTIDAD_LABELS: Record<string, string> = {
  articulos: 'Artículos',
  entregas: 'Entregas',
  reposiciones: 'Reposiciones',
};

// Labels legibles para campos
const FIELD_LABELS: Record<string, string> = {
  id: 'ID',
  codigo: 'Código',
  nombre: 'Nombre',
  descripcion: 'Descripción',
  rubroId: 'Rubro',
  proveedorId: 'Proveedor',
  stock: 'Stock',
  stockMinimo: 'Stock Mínimo',
  stockDisponible: 'Stock Disponible',
  stockIncrementado: 'Stock Incrementado',
  stockDescontado: 'Stock Descontado',
  unidad: 'Unidad',
  presentacion: 'Presentación',
  marca: 'Marca',
  sku: 'SKU',
  etm: 'ETM',
  ubicacion: 'Ubicación',
  costoInicialEstimado: 'Costo Inicial Estimado',
  activo: 'Activo',
  articuloId: 'Artículo',
  clienteId: 'Cliente',
  numeroCotizacionInterna: 'N° Cotización',
  purchaseOrder: 'Purchase Order',
  observaciones: 'Observaciones',
  fechaEntrega: 'Fecha de Entrega',
  cantidad: 'Cantidad',
  costoReposicion: 'Costo (ARS)',
  valorDolarOficial: 'Valor Dólar',
  costoReposicionDolares: 'Costo (USD)',
  fechaVencimiento: 'Fecha Vencimiento',
  lotePartida: 'Lote/Partida',
  linkCompra: 'Link de Compra',
  lugarCompra: 'Lugar de Compra',
  estado: 'Estado',
  fechaReposicion: 'Fecha de Reposición',
};

interface Filters {
  usuarioId?: string;
  accion?: string;
  entidad?: string;
  fechaDesde?: string;
  fechaHasta?: string;
}

export function AuditoriaListPage() {
  const [logs, setLogs] = useState<AuditLogConUsuario[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  // Filter options
  const [usuarios, setUsuarios] = useState<UsuarioConRoles[]>([]);

  // Current filters
  const [filters, setFilters] = useState<Filters>({});

  const { page, limit, setPage, setLimit } = usePagination();

  useEffect(() => {
    loadFilters();
  }, []);

  useEffect(() => {
    loadLogs();
  }, [page, limit, filters]);

  const loadFilters = async () => {
    try {
      const usuariosData = await usuariosService.getAll({ limit: 100 });
      setUsuarios(usuariosData.data);
    } catch (error) {
      console.error('Error loading filters:', error);
    }
  };

  const loadLogs = async () => {
    setIsLoading(true);
    try {
      const result = await auditLogService.getAll({
        page,
        limit,
        ...filters,
        // Si no hay filtro de entidad específico, filtrar por las entidades auditadas
        entidades: filters.entidad ? undefined : ENTIDADES_AUDITADAS,
      });
      setLogs(result.data);
      setTotal(result.pagination.total);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (key: keyof Filters, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value || undefined,
    }));
    setPage(1);
  };

  const clearFilters = () => {
    setFilters({});
    setPage(1);
  };

  const hasActiveFilters = Object.values(filters).some((v) => v);

  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'boolean') return value ? 'Sí' : 'No';
    if (typeof value === 'number') return value.toLocaleString('es-AR');
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  const getFieldLabel = (key: string): string => {
    return FIELD_LABELS[key] || key;
  };

  // Get all unique fields from both objects
  const getChangedFields = (
    anterior: Record<string, unknown> | null,
    nuevo: Record<string, unknown> | null
  ): string[] => {
    const allKeys = new Set<string>();
    if (anterior) Object.keys(anterior).forEach(k => allKeys.add(k));
    if (nuevo) Object.keys(nuevo).forEach(k => allKeys.add(k));
    // Filter out 'id' as it's always shown separately
    return Array.from(allKeys).filter(k => k !== 'id');
  };

  const renderExpandedRow = (item: AuditLogConUsuario) => {
    if (expandedRow !== item.id) return null;

    const anterior = item.datosAnteriores as Record<string, unknown> | null;
    const nuevo = item.datosNuevos as Record<string, unknown> | null;
    const changedFields = getChangedFields(anterior, nuevo);

    return (
      <tr className="bg-gray-50">
        <td colSpan={5} className="px-6 py-4">
          <div className="space-y-4">
            {/* Header with ID */}
            {item.entidadId && (
              <div className="text-sm text-gray-500">
                <span className="font-medium">ID del registro:</span>{' '}
                <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">
                  {item.entidadId}
                </span>
              </div>
            )}

            {/* Changes table */}
            {changedFields.length > 0 ? (
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium text-gray-600 w-1/4">Campo</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-600 w-5/12">
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 bg-red-400 rounded-full"></span>
                          Estado Anterior
                        </span>
                      </th>
                      <th className="px-4 py-2 text-center w-1/12">
                        <ArrowRight className="w-4 h-4 text-gray-400 mx-auto" />
                      </th>
                      <th className="px-4 py-2 text-left font-medium text-gray-600 w-5/12">
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                          Estado Nuevo
                        </span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {changedFields.map((field) => {
                      const valorAnterior = anterior?.[field];
                      const valorNuevo = nuevo?.[field];
                      const hasChanged = formatValue(valorAnterior) !== formatValue(valorNuevo);

                      return (
                        <tr key={field} className={hasChanged ? 'bg-yellow-50/50' : ''}>
                          <td className="px-4 py-2 font-medium text-gray-700">
                            {getFieldLabel(field)}
                          </td>
                          <td className="px-4 py-2 text-gray-600">
                            {anterior ? formatValue(valorAnterior) : '-'}
                          </td>
                          <td className="px-4 py-2 text-center">
                            {hasChanged && (
                              <ArrowRight className="w-4 h-4 text-primary-500 mx-auto" />
                            )}
                          </td>
                          <td className="px-4 py-2 text-gray-900">
                            {nuevo ? (
                              <span className={hasChanged ? 'font-medium text-primary-700' : ''}>
                                {formatValue(valorNuevo)}
                              </span>
                            ) : '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic">
                No hay detalles disponibles para este registro
              </p>
            )}
          </div>
        </td>
      </tr>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Auditoría</h1>
          <p className="text-sm text-gray-500 mt-1">
            Registro de movimientos de Artículos, Entregas y Reposiciones
          </p>
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`btn-secondary ${hasActiveFilters ? 'ring-2 ring-primary-500' : ''}`}
        >
          <Filter className="w-5 h-5 mr-2" />
          Filtros
          {hasActiveFilters && (
            <span className="ml-2 px-1.5 py-0.5 bg-primary-100 text-primary-700 text-xs rounded-full">
              {Object.values(filters).filter((v) => v).length}
            </span>
          )}
        </button>
      </div>

      {/* Filters panel */}
      {showFilters && (
        <div className="card p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="label">Usuario</label>
              <select
                value={filters.usuarioId || ''}
                onChange={(e) => handleFilterChange('usuarioId', e.target.value)}
                className="input"
              >
                <option value="">Todos los usuarios</option>
                {usuarios.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nombre} {u.apellido}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Acción</label>
              <select
                value={filters.accion || ''}
                onChange={(e) => handleFilterChange('accion', e.target.value)}
                className="input"
              >
                <option value="">Todas las acciones</option>
                {Object.entries(ACCION_CONFIG).map(([key, config]) => (
                  <option key={key} value={key}>
                    {config.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Módulo</label>
              <select
                value={filters.entidad || ''}
                onChange={(e) => handleFilterChange('entidad', e.target.value)}
                className="input"
              >
                <option value="">Todos los módulos</option>
                {ENTIDADES_AUDITADAS.map((e) => (
                  <option key={e} value={e}>
                    {ENTIDAD_LABELS[e]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Desde</label>
              <input
                type="date"
                value={filters.fechaDesde || ''}
                onChange={(e) => handleFilterChange('fechaDesde', e.target.value)}
                className="input"
              />
            </div>

            <div>
              <label className="label">Hasta</label>
              <input
                type="date"
                value={filters.fechaHasta || ''}
                onChange={(e) => handleFilterChange('fechaHasta', e.target.value)}
                className="input"
              />
            </div>
          </div>

          {hasActiveFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <button
                onClick={clearFilters}
                className="text-sm text-primary-600 hover:text-primary-700"
              >
                Limpiar filtros
              </button>
            </div>
          )}
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Fecha
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Usuario
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acción
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Módulo
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                Detalle
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                  Cargando...
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                  No se encontraron registros de auditoría
                </td>
              </tr>
            ) : (
              logs.map((log) => {
                const config = ACCION_CONFIG[log.accion] || {
                  label: log.accion,
                  icon: <RefreshCw className="w-3.5 h-3.5" />,
                  color: 'bg-gray-100 text-gray-700',
                };
                const hasDetails = log.datosAnteriores || log.datosNuevos;
                const isExpanded = expandedRow === log.id;

                return (
                  <>
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="text-sm">
                          <p className="font-medium">
                            {format(new Date(log.createdAt), 'dd/MM/yyyy', { locale: es })}
                          </p>
                          <p className="text-gray-500">
                            {format(new Date(log.createdAt), 'HH:mm:ss', { locale: es })}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {log.usuario ? (
                            <>
                              <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                                <span className="text-primary-600 font-medium text-xs">
                                  {log.usuario.nombre[0]}{log.usuario.apellido[0]}
                                </span>
                              </div>
                              <div>
                                <p className="font-medium text-sm">
                                  {log.usuario.nombre} {log.usuario.apellido}
                                </p>
                                <p className="text-xs text-gray-500">{log.usuario.email}</p>
                              </div>
                            </>
                          ) : (
                            <span className="text-gray-400 italic">Sistema</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={`${config.color} flex items-center gap-1.5 w-fit`}>
                          {config.icon}
                          {config.label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4 text-gray-400" />
                          <span className="text-sm font-medium">
                            {ENTIDAD_LABELS[log.entidad] || log.entidad}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {hasDetails && (
                          <button
                            onClick={() => setExpandedRow(isExpanded ? null : log.id)}
                            className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded"
                            title="Ver detalles"
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </button>
                        )}
                      </td>
                    </tr>
                    {renderExpandedRow(log)}
                  </>
                );
              })
            )}
          </tbody>
        </table>

        {/* Pagination */}
        <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between bg-gray-50">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Mostrar</span>
              <select
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                className="text-sm border border-gray-300 rounded px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value={10}>10</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span className="text-sm text-gray-500">por página</span>
            </div>
            <p className="text-sm text-gray-500">
              {total > 0 ? (
                <>Mostrando {(page - 1) * limit + 1} a {Math.min(page * limit, total)} de {total} registros</>
              ) : (
                'Sin registros'
              )}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
              className="btn-secondary btn-sm"
            >
              Anterior
            </button>
            <button
              onClick={() => setPage(page + 1)}
              disabled={page * limit >= total}
              className="btn-secondary btn-sm"
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

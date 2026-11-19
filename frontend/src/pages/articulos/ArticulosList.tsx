import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus, Copy, Trash2, X, Image as ImageIcon } from 'lucide-react';
import { articulosService } from '../../services/articulos.service';
import { rubrosService } from '../../services/rubros.service';
import { proveedoresService } from '../../services/proveedores.service';
import { DataTable } from '../../components/DataTable';
import { SearchInput } from '../../components/SearchInput';
import { Badge, StockBadge } from '../../components/Badge';
import { PermissionGuard } from '../../components/PermissionGuard';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { ExportButtons } from '../../components/ExportButtons';
import { usePagination } from '../../hooks/usePagination';
import { useDebounce } from '../../hooks/useDebounce';
import { getErrorMessage } from '../../services/api';
import toast from 'react-hot-toast';
import type { ArticuloConRelaciones, Rubro, Proveedor, ArticuloFiltros, ResumenReposicion } from '@hofra/shared';

const getCantidadAReponer = (item: ArticuloConRelaciones) => Math.max(0, item.stockMinimo - item.stock);

const getCostoEstimadoReposicion = (item: ArticuloConRelaciones): number | null =>
  item.ultimoCosto != null ? getCantidadAReponer(item) * item.ultimoCosto : null;

const formatMoneda = (valor: number) => `$${valor.toLocaleString('es-AR', { maximumFractionDigits: 0 })}`;

export function ArticulosListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [articulos, setArticulos] = useState<ArticuloConRelaciones[]>([]);
  const [rubros, setRubros] = useState<Rubro[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [imagenAmpliada, setImagenAmpliada] = useState<{ url: string; nombre: string } | null>(null);
  const [resumenReposicion, setResumenReposicion] = useState<ResumenReposicion | null>(null);

  const { page, limit, setPage, setLimit } = usePagination();
  const [busqueda, setBusqueda] = useState(searchParams.get('busqueda') || '');
  const [rubroId, setRubroId] = useState(searchParams.get('rubroId') || '');
  const [proveedorId, setProveedorId] = useState(searchParams.get('proveedorId') || '');
  const [stockBajo, setStockBajo] = useState(searchParams.get('stockBajo') === 'true');
  const [estadoFiltro, setEstadoFiltro] = useState<string>(searchParams.get('activo') || '');
  const [sortBy, setSortBy] = useState<string>('nombre');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const debouncedBusqueda = useDebounce(busqueda, 300);

  useEffect(() => {
    rubrosService.getActive().then(setRubros);
    proveedoresService.getActive().then(setProveedores);
  }, []);

  useEffect(() => {
    loadArticulos();
  }, [page, limit, debouncedBusqueda, rubroId, proveedorId, stockBajo, estadoFiltro, sortBy, sortOrder]);

  // El resumen de reposición (totales) debe reflejar TODOS los artículos que cumplen el
  // filtro, no solo la página actual, por eso se pide aparte en lugar de derivarlo de `articulos`.
  useEffect(() => {
    if (!stockBajo) {
      setResumenReposicion(null);
      return;
    }
    articulosService
      .getResumenReposicion(buildFiltros())
      .then(setResumenReposicion)
      .catch((error) => toast.error(getErrorMessage(error)));
  }, [stockBajo, debouncedBusqueda, rubroId, proveedorId, estadoFiltro]);

  const buildFiltros = (): ArticuloFiltros & { sortBy?: string; sortOrder?: 'asc' | 'desc' } => ({
    busqueda: debouncedBusqueda || undefined,
    rubroId: rubroId || undefined,
    proveedorId: proveedorId || undefined,
    stockBajo: stockBajo || undefined,
    activo: estadoFiltro === '' ? undefined : estadoFiltro === 'true',
    sortBy,
    sortOrder,
  });

  const loadArticulos = async () => {
    setIsLoading(true);
    try {
      const result = await articulosService.getAll({ ...buildFiltros(), page, limit });
      setArticulos(result.data);
      setTotal(result.pagination.total);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      await articulosService.delete(deleteId);
      toast.success('Artículo eliminado');
      loadArticulos();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  const columns = [
    {
      key: 'imagen',
      header: 'Imagen',
      render: (item: ArticuloConRelaciones) => (
        item.imagenUrl ? (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setImagenAmpliada({ url: item.imagenUrl!, nombre: item.nombre });
            }}
            className="w-10 h-10 rounded border border-gray-200 overflow-hidden hover:border-primary-500 hover:shadow-md transition-all cursor-pointer"
            title="Click para ampliar"
          >
            <img
              src={item.imagenUrl}
              alt={item.nombre}
              className="w-full h-full object-cover"
            />
          </button>
        ) : (
          <div className="w-10 h-10 rounded border border-gray-200 bg-gray-50 flex items-center justify-center">
            <ImageIcon className="w-4 h-4 text-gray-300" />
          </div>
        )
      ),
    },
    {
      key: 'codigo',
      header: 'Código',
      sortable: true,
      render: (item: ArticuloConRelaciones) => (
        <span className="font-mono text-sm">{item.codigo}</span>
      ),
    },
    {
      key: 'sku',
      header: 'SKU',
      className: 'max-w-[110px]',
      render: (item: ArticuloConRelaciones) => (
        <span className="font-mono text-sm text-gray-600 truncate block" title={item.sku || undefined}>
          {item.sku || '-'}
        </span>
      ),
    },
    {
      key: 'nombre',
      header: 'Nombre',
      sortable: true,
      className: 'max-w-[280px] !whitespace-normal',
      render: (item: ArticuloConRelaciones) => (
        <p className="font-medium">{item.nombre}</p>
      ),
    },
    {
      key: 'rubro',
      header: 'Rubro',
      className: 'max-w-[130px]',
      render: (item: ArticuloConRelaciones) => (
        <span title={item.rubro.nombre}>
          <Badge variant="primary" className="max-w-full truncate">
            {item.rubro.nombre}
          </Badge>
        </span>
      ),
    },
    {
      key: 'stock',
      header: 'Stock actual',
      className: 'max-w-[100px]',
      render: (item: ArticuloConRelaciones) => (
        item.stock === 0
          ? <Badge variant="danger">0</Badge>
          : <StockBadge stock={item.stock} stockMinimo={item.stockMinimo} />
      ),
    },
    {
      key: 'presentacion',
      header: 'Presentación',
      className: 'max-w-[140px]',
      render: (item: ArticuloConRelaciones) => (
        <span className="text-gray-600 truncate block" title={item.presentacion || undefined}>
          {item.presentacion || '-'}
        </span>
      ),
    },
    ...(stockBajo
      ? [
          {
            key: 'ultimoCosto',
            header: 'Último costo',
            className: 'max-w-[120px]',
            render: (item: ArticuloConRelaciones) =>
              item.ultimoCosto != null ? (
                <span>{formatMoneda(item.ultimoCosto)}</span>
              ) : (
                <span className="text-gray-400 text-sm">Sin costo registrado</span>
              ),
          },
          {
            key: 'cantidadAReponer',
            header: 'Cantidad a reponer',
            className: 'max-w-[110px]',
            render: (item: ArticuloConRelaciones) => (
              <span className="font-medium">{getCantidadAReponer(item).toLocaleString('es-AR')}</span>
            ),
          },
          {
            key: 'costoEstimadoReposicion',
            header: 'Costo estimado de reposición',
            className: 'max-w-[150px]',
            render: (item: ArticuloConRelaciones) => {
              const costo = getCostoEstimadoReposicion(item);
              return costo != null ? (
                <span className="font-medium">{formatMoneda(costo)}</span>
              ) : (
                <span className="text-gray-400 text-sm">Sin costo registrado</span>
              );
            },
          },
        ]
      : []),
    {
      key: 'acciones',
      header: 'Acciones',
      className: 'w-20',
      render: (item: ArticuloConRelaciones) => (
        <div className="flex items-center gap-2">
          <PermissionGuard modulo="articulos" accion="crear">
            <Link
              to={`/articulos/nuevo?duplicarDe=${item.id}`}
              className="p-1 text-gray-400 hover:text-primary-600"
              title="Duplicar artículo"
            >
              <Copy className="w-5 h-5" />
            </Link>
          </PermissionGuard>
          <PermissionGuard modulo="articulos" accion="eliminar">
            <button
              onClick={() => setDeleteId(item.id)}
              className="p-1 text-gray-400 hover:text-danger-600"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </PermissionGuard>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Artículos</h1>
        <div className="flex items-center gap-3">
          <ExportButtons
            data={articulos}
            filename="articulos"
            columns={[
              { key: 'codigo', header: 'Código', type: 'text' },
              { key: 'nombre', header: 'Nombre', type: 'text' },
              { key: 'rubro', header: 'Rubro', type: 'text', value: (item) => item.rubro?.nombre },
              { key: 'proveedor', header: 'Proveedor', type: 'text', value: (item) => item.proveedor?.razonSocial },
              { key: 'stock', header: 'Stock', type: 'number' },
              { key: 'stockMinimo', header: 'Stock Mínimo', type: 'number' },
              { key: 'presentacion', header: 'Presentación', type: 'text' },
              ...(stockBajo
                ? [
                    {
                      key: 'ultimoCosto',
                      header: 'Último costo',
                      type: 'currency' as const,
                      value: (item: ArticuloConRelaciones) => item.ultimoCosto ?? null,
                    },
                    {
                      key: 'cantidadAReponer',
                      header: 'Cantidad a reponer',
                      type: 'number' as const,
                      value: (item: ArticuloConRelaciones) => getCantidadAReponer(item),
                    },
                    {
                      key: 'costoEstimadoReposicion',
                      header: 'Costo estimado de reposición',
                      type: 'currency' as const,
                      value: (item: ArticuloConRelaciones) => getCostoEstimadoReposicion(item),
                    },
                  ]
                : []),
            ]}
            footerRows={
              stockBajo && resumenReposicion
                ? [
                    {
                      'Código': 'TOTAL',
                      'Nombre': null,
                      'Rubro': null,
                      'Proveedor': null,
                      'Stock': null,
                      'Stock Mínimo': null,
                      'Presentación': null,
                      'Último costo': null,
                      'Cantidad a reponer': resumenReposicion.totalUnidadesAReponer,
                      'Costo estimado de reposición': resumenReposicion.costoTotalEstimado,
                    },
                  ]
                : undefined
            }
            getExportData={async () => {
              const result = await articulosService.getAll({ ...buildFiltros(), page: 1, limit: 1000 });
              return result.data;
            }}
          />
          <PermissionGuard modulo="articulos" accion="crear">
            <Link to="/articulos/nuevo" className="btn-primary">
              <Plus className="w-5 h-5 mr-2" />
              Nuevo Artículo
            </Link>
          </PermissionGuard>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <SearchInput
            value={busqueda}
            onChange={setBusqueda}
            placeholder="Buscar por código, nombre, SKU o ETM..."
          />
          <select
            value={rubroId}
            onChange={(e) => setRubroId(e.target.value)}
            className="input"
          >
            <option value="">Todos los rubros</option>
            {rubros.map((rubro) => (
              <option key={rubro.id} value={rubro.id}>
                {rubro.nombre}
              </option>
            ))}
          </select>
          <select
            value={proveedorId}
            onChange={(e) => setProveedorId(e.target.value)}
            className="input"
          >
            <option value="">Todos los proveedores</option>
            {proveedores.map((proveedor) => (
              <option key={proveedor.id} value={proveedor.id}>
                {proveedor.nombreFantasia || proveedor.razonSocial}
              </option>
            ))}
          </select>
          <select
            value={estadoFiltro}
            onChange={(e) => setEstadoFiltro(e.target.value)}
            className="input"
          >
            <option value="">Todos los estados</option>
            <option value="true">Activos</option>
            <option value="false">Inactivos</option>
          </select>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={stockBajo}
              onChange={(e) => setStockBajo(e.target.checked)}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm text-gray-700">Solo stock bajo</span>
          </label>
        </div>
      </div>

      {stockBajo && resumenReposicion && (
        <div className="card p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-gray-500">Total de artículos con stock bajo</p>
            <p className="text-2xl font-bold text-gray-900">
              {resumenReposicion.totalArticulos.toLocaleString('es-AR')}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Total de unidades a reponer</p>
            <p className="text-2xl font-bold text-gray-900">
              {resumenReposicion.totalUnidadesAReponer.toLocaleString('es-AR')}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Costo total estimado de reposición</p>
            <p className="text-2xl font-bold text-gray-900">
              {formatMoneda(resumenReposicion.costoTotalEstimado)}
            </p>
            {resumenReposicion.articulosSinCosto > 0 && (
              <p className="text-xs text-gray-400 mt-1">
                {resumenReposicion.articulosSinCosto} artículo(s) sin costo registrado no incluido(s) en el total
              </p>
            )}
          </div>
        </div>
      )}

      <DataTable
        columns={columns}
        data={articulos}
        keyExtractor={(item) => item.id}
        isLoading={isLoading}
        pagination={{
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        }}
        onPageChange={setPage}
        onLimitChange={setLimit}
        sortConfig={{ key: sortBy, direction: sortOrder }}
        onSortChange={(config) => {
          setSortBy(config.key);
          setSortOrder(config.direction);
        }}
        getRowHref={(item) => `/articulos/${item.id}`}
        emptyMessage="No se encontraron artículos"
      />

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Eliminar artículo"
        message="¿Está seguro de eliminar este artículo? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        isLoading={isDeleting}
      />

      {/* Modal de imagen ampliada */}
      {imagenAmpliada && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4"
          onClick={() => setImagenAmpliada(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <button
              type="button"
              onClick={() => setImagenAmpliada(null)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300 transition-colors"
            >
              <X className="w-8 h-8" />
            </button>
            <img
              src={imagenAmpliada.url}
              alt={imagenAmpliada.nombre}
              className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
            <p className="text-white text-center mt-3 text-sm">{imagenAmpliada.nombre}</p>
          </div>
        </div>
      )}
    </div>
  );
}

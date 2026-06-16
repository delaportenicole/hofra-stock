import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus, Eye, Edit, Trash2, X, Image as ImageIcon } from 'lucide-react';
import { articulosService } from '../../services/articulos.service';
import { rubrosService } from '../../services/rubros.service';
import { DataTable } from '../../components/DataTable';
import { SearchInput } from '../../components/SearchInput';
import { Badge, StockBadge, StatusBadge } from '../../components/Badge';
import { PermissionGuard } from '../../components/PermissionGuard';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { ExportButtons } from '../../components/ExportButtons';
import { usePagination } from '../../hooks/usePagination';
import { useDebounce } from '../../hooks/useDebounce';
import { getErrorMessage } from '../../services/api';
import toast from 'react-hot-toast';
import type { ArticuloConRelaciones, Rubro, ArticuloFiltros } from '@hofra/shared';

export function ArticulosListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [articulos, setArticulos] = useState<ArticuloConRelaciones[]>([]);
  const [rubros, setRubros] = useState<Rubro[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [imagenAmpliada, setImagenAmpliada] = useState<{ url: string; nombre: string } | null>(null);

  const { page, limit, setPage, setLimit } = usePagination();
  const [busqueda, setBusqueda] = useState(searchParams.get('busqueda') || '');
  const [rubroId, setRubroId] = useState(searchParams.get('rubroId') || '');
  const [stockBajo, setStockBajo] = useState(searchParams.get('stockBajo') === 'true');

  const debouncedBusqueda = useDebounce(busqueda, 300);

  useEffect(() => {
    rubrosService.getActive().then(setRubros);
  }, []);

  useEffect(() => {
    loadArticulos();
  }, [page, limit, debouncedBusqueda, rubroId, stockBajo]);

  const loadArticulos = async () => {
    setIsLoading(true);
    try {
      const filtros: ArticuloFiltros & { page: number; limit: number; sortBy?: string; sortOrder?: 'asc' | 'desc' } = {
        page,
        limit,
        busqueda: debouncedBusqueda || undefined,
        rubroId: rubroId || undefined,
        stockBajo: stockBajo || undefined,
        sortBy: 'nombre',
        sortOrder: 'asc',
      };
      const result = await articulosService.getAll(filtros);
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
      render: (item: ArticuloConRelaciones) => (
        <span className="font-mono text-sm">{item.codigo}</span>
      ),
    },
    {
      key: 'sku',
      header: 'SKU',
      render: (item: ArticuloConRelaciones) => (
        <span className="font-mono text-sm text-gray-600">{item.sku || '-'}</span>
      ),
    },
    {
      key: 'nombre',
      header: 'Nombre',
      render: (item: ArticuloConRelaciones) => (
        <p className="font-medium">{item.nombre}</p>
      ),
    },
    {
      key: 'rubro',
      header: 'Rubro',
      render: (item: ArticuloConRelaciones) => (
        <Badge variant="primary">{item.rubro.nombre}</Badge>
      ),
    },
    {
      key: 'stock',
      header: 'Stock',
      render: (item: ArticuloConRelaciones) => (
        <StockBadge stock={item.stock} stockMinimo={item.stockMinimo} />
      ),
    },
    {
      key: 'presentacion',
      header: 'Presentación',
      render: (item: ArticuloConRelaciones) => (
        <span className="text-gray-600">{item.presentacion || '-'}</span>
      ),
    },
    {
      key: 'activo',
      header: 'Estado',
      render: (item: ArticuloConRelaciones) => <StatusBadge activo={item.activo} />,
    },
    {
      key: 'acciones',
      header: 'Acciones',
      render: (item: ArticuloConRelaciones) => (
        <div className="flex items-center gap-2">
          <Link
            to={`/articulos/${item.id}`}
            className="p-1 text-gray-400 hover:text-primary-600"
          >
            <Eye className="w-5 h-5" />
          </Link>
          <PermissionGuard modulo="articulos" accion="actualizar">
            <Link
              to={`/articulos/${item.id}/editar`}
              className="p-1 text-gray-400 hover:text-primary-600"
            >
              <Edit className="w-5 h-5" />
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
              { key: 'codigo', header: 'Código' },
              { key: 'nombre', header: 'Nombre' },
              { key: 'rubro', header: 'Rubro', format: (v: unknown) => (v as { nombre: string })?.nombre || '' },
              { key: 'stock', header: 'Stock' },
              { key: 'stockMinimo', header: 'Stock Mínimo' },
              { key: 'presentacion', header: 'Presentación' },
            ]}
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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

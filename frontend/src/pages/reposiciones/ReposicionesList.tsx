import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Eye, Edit, XCircle, CheckCircle, MoreVertical, Search } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { stockService } from '../../services/stock.service';
import { DataTable } from '../../components/DataTable';
import { Badge } from '../../components/Badge';
import { PermissionGuard } from '../../components/PermissionGuard';
import { usePagination } from '../../hooks/usePagination';
import { useDebounce } from '../../hooks/useDebounce';
import { getErrorMessage } from '../../services/api';
import toast from 'react-hot-toast';
import type { ReposicionConRelaciones, EstadoReposicion } from '@hofra/shared';

const estadoLabels: Record<EstadoReposicion, string> = {
  en_curso: 'En Curso',
  confirmada: 'Confirmada',
  cancelada: 'Cancelada',
};

const estadoVariants: Record<EstadoReposicion, 'warning' | 'success' | 'secondary'> = {
  en_curso: 'warning',
  confirmada: 'success',
  cancelada: 'secondary',
};

export function ReposicionesListPage() {
  const [reposiciones, setReposiciones] = useState<ReposicionConRelaciones[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const debouncedBusqueda = useDebounce(busqueda, 300);
  const { page, limit, setPage, setLimit } = usePagination();

  useEffect(() => {
    loadReposiciones();
  }, [page, limit, debouncedBusqueda]);

  // Reset to page 1 when search changes
  useEffect(() => {
    if (debouncedBusqueda !== '') {
      setPage(1);
    }
  }, [debouncedBusqueda]);

  useEffect(() => {
    const handleClickOutside = () => setOpenMenuId(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const loadReposiciones = async () => {
    setIsLoading(true);
    try {
      const result = await stockService.getReposiciones({
        page,
        limit,
        busqueda: debouncedBusqueda || undefined,
      });
      setReposiciones(result.data);
      setTotal(result.pagination.total);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = async (id: string) => {
    try {
      await stockService.confirmReposicion(id);
      toast.success('Reposicion confirmada');
      loadReposiciones();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleCancel = async (id: string, cantidad: number, estado: string) => {
    const mensaje = estado === 'confirmada'
      ? `¿Esta seguro de cancelar esta reposicion?\n\nEl stock se descontara en ${cantidad} unidades.`
      : `¿Esta seguro de cancelar esta reposicion?\n\nEl stock no sera afectado (la reposicion aun no estaba confirmada).`;

    if (!confirm(mensaje)) {
      return;
    }

    try {
      await stockService.cancelReposicion(id);
      toast.success('Reposicion cancelada');
      loadReposiciones();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const columns = [
    {
      key: 'fecha',
      header: 'Fecha',
      render: (item: ReposicionConRelaciones) => (
        <span className="whitespace-nowrap">
          {format(new Date(item.fechaReposicion), 'dd/MM/yyyy HH:mm', { locale: es })}
        </span>
      ),
    },
    {
      key: 'articulo',
      header: 'Articulo',
      render: (item: ReposicionConRelaciones) => (
        <div>
          <p className="font-medium">{item.articulo.nombre}</p>
          <p className="text-sm text-gray-500 font-mono">{item.articulo.codigo}</p>
        </div>
      ),
    },
    {
      key: 'cantidad',
      header: 'Cant.',
      render: (item: ReposicionConRelaciones) => {
        const variant = item.estado === 'confirmada' ? 'success'
          : item.estado === 'en_curso' ? 'warning'
          : 'secondary';
        const prefix = item.estado === 'confirmada' ? '+' : '';
        return (
          <Badge variant={variant}>
            {prefix}{item.cantidad}
          </Badge>
        );
      },
    },
    {
      key: 'costo',
      header: 'Costo',
      render: (item: ReposicionConRelaciones) => (
        <div className="text-sm">
          {item.costoReposicion ? (
            <>
              <p className="font-medium">${item.costoReposicion.toLocaleString('es-AR')}</p>
              {item.costoReposicionDolares && (
                <p className="text-gray-500">USD {item.costoReposicionDolares}</p>
              )}
            </>
          ) : (
            <span className="text-gray-400">-</span>
          )}
        </div>
      ),
    },
    {
      key: 'estado',
      header: 'Estado',
      render: (item: ReposicionConRelaciones) => (
        <Badge variant={estadoVariants[item.estado]}>
          {estadoLabels[item.estado]}
        </Badge>
      ),
    },
    {
      key: 'acciones',
      header: '',
      render: (item: ReposicionConRelaciones) => (
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setOpenMenuId(openMenuId === item.id ? null : item.id);
            }}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <MoreVertical className="w-5 h-5 text-gray-500" />
          </button>

          {openMenuId === item.id && (
            <div className="absolute right-0 z-50 mt-1 w-44 bg-white rounded-md shadow-lg border border-gray-200">
              <Link
                to={`/reposiciones/${item.id}`}
                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                <Eye className="w-4 h-4" />
                Ver detalle
              </Link>

              {item.estado === 'en_curso' && (
                <>
                  <Link
                    to={`/reposiciones/${item.id}/editar`}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <Edit className="w-4 h-4" />
                    Editar
                  </Link>
                  <button
                    onClick={() => handleConfirm(item.id)}
                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-green-600 hover:bg-green-50"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Confirmar
                  </button>
                  <button
                    onClick={() => handleCancel(item.id, item.cantidad, item.estado)}
                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    <XCircle className="w-4 h-4" />
                    Cancelar
                  </button>
                </>
              )}

              {item.estado === 'confirmada' && (
                <button
                  onClick={() => handleCancel(item.id, item.cantidad, item.estado)}
                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  <XCircle className="w-4 h-4" />
                  Cancelar
                </button>
              )}
            </div>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Reposiciones</h1>
        <PermissionGuard modulo="reposiciones" accion="crear">
          <Link to="/reposiciones/nueva" className="btn-success">
            <Plus className="w-5 h-5 mr-2" />
            Nueva Reposicion
          </Link>
        </PermissionGuard>
      </div>

      {/* Busqueda */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar por codigo, nombre o descripcion..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="input w-full pl-10"
        />
      </div>

      <DataTable
        columns={columns}
        data={reposiciones}
        keyExtractor={(item) => item.id}
        isLoading={isLoading}
        pagination={{ page, limit, total, totalPages: Math.ceil(total / limit) }}
        onPageChange={setPage}
        onLimitChange={setLimit}
        getRowHref={(item) => `/reposiciones/${item.id}`}
        emptyMessage="No hay reposiciones registradas"
      />
    </div>
  );
}

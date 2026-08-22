import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Eye, XCircle, MoreVertical, Search } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { solicitudesCotizacionService } from '../../services/solicitudesCotizacion.service';
import { DataTable } from '../../components/DataTable';
import { Badge } from '../../components/Badge';
import { PermissionGuard } from '../../components/PermissionGuard';
import { usePagination } from '../../hooks/usePagination';
import { useDebounce } from '../../hooks/useDebounce';
import { getErrorMessage } from '../../services/api';
import toast from 'react-hot-toast';
import type { SolicitudCotizacionConRelaciones, EstadoSolicitudCotizacion } from '@hofra/shared';

const estadoLabels: Record<EstadoSolicitudCotizacion, string> = {
  en_revision: 'En Revisión',
  cotizada: 'Cotizada',
  cancelada: 'Cancelada',
};

const estadoVariants: Record<EstadoSolicitudCotizacion, 'warning' | 'success' | 'secondary'> = {
  en_revision: 'warning',
  cotizada: 'success',
  cancelada: 'secondary',
};

export function SolicitudesCotizacionListPage() {
  const [solicitudes, setSolicitudes] = useState<SolicitudCotizacionConRelaciones[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const debouncedBusqueda = useDebounce(busqueda, 300);
  const { page, limit, setPage, setLimit } = usePagination();

  useEffect(() => {
    loadSolicitudes();
  }, [page, limit, debouncedBusqueda]);

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

  const loadSolicitudes = async () => {
    setIsLoading(true);
    try {
      const result = await solicitudesCotizacionService.getAll({
        page,
        limit,
        busqueda: debouncedBusqueda || undefined,
      });
      setSolicitudes(result.data);
      setTotal(result.pagination.total);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelar = async (id: string) => {
    if (!confirm('¿Cancelar esta solicitud de cotización?')) return;

    try {
      await solicitudesCotizacionService.cancelar(id);
      toast.success('Solicitud cancelada');
      loadSolicitudes();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const columns = [
    {
      key: 'fecha',
      header: 'Fecha',
      render: (item: SolicitudCotizacionConRelaciones) => (
        <span className="whitespace-nowrap">
          {format(new Date(item.fechaSolicitud), 'dd/MM/yyyy HH:mm', { locale: es })}
        </span>
      ),
    },
    {
      key: 'cliente',
      header: 'Cliente',
      render: (item: SolicitudCotizacionConRelaciones) => (
        <div>
          <p className="font-medium">{item.cliente.razonSocial}</p>
          {item.cliente.cuit && <p className="text-sm text-gray-500">{item.cliente.cuit}</p>}
        </div>
      ),
    },
    {
      key: 'referencia',
      header: 'Referencia',
      render: (item: SolicitudCotizacionConRelaciones) => item.numeroReferenciaCliente || <span className="text-gray-400">-</span>,
    },
    {
      key: 'items',
      header: 'Ítems',
      render: (item: SolicitudCotizacionConRelaciones) => item.items.length,
    },
    {
      key: 'estado',
      header: 'Estado',
      render: (item: SolicitudCotizacionConRelaciones) => (
        <Badge variant={estadoVariants[item.estado]}>{estadoLabels[item.estado]}</Badge>
      ),
    },
    {
      key: 'acciones',
      header: '',
      render: (item: SolicitudCotizacionConRelaciones) => (
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
            <div className="absolute right-0 z-10 mt-1 w-44 bg-white rounded-md shadow-lg border border-gray-200">
              <Link
                to={`/solicitudes-cotizacion/${item.id}`}
                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                <Eye className="w-4 h-4" />
                Ver detalle
              </Link>

              {item.estado !== 'cancelada' && (
                <button
                  onClick={() => handleCancelar(item.id)}
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
        <h1 className="text-2xl font-bold text-gray-900">Solicitudes de Cotización</h1>
        <PermissionGuard modulo="solicitudes_cotizacion" accion="crear">
          <Link to="/solicitudes-cotizacion/nueva" className="btn-success">
            <Plus className="w-5 h-5 mr-2" />
            Nueva Solicitud
          </Link>
        </PermissionGuard>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar por cliente o referencia..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="input w-full pl-10"
        />
      </div>

      <DataTable
        columns={columns}
        data={solicitudes}
        keyExtractor={(item) => item.id}
        isLoading={isLoading}
        pagination={{ page, limit, total, totalPages: Math.ceil(total / limit) }}
        onPageChange={setPage}
        onLimitChange={setLimit}
        getRowHref={(item) => `/solicitudes-cotizacion/${item.id}`}
        emptyMessage="No hay solicitudes de cotización registradas"
        minRows={10}
      />
    </div>
  );
}

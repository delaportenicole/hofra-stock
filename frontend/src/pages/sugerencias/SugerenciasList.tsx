import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2, Lightbulb } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { sugerenciasService } from '../../services/sugerencias.service';
import { DataTable } from '../../components/DataTable';
import { Badge } from '../../components/Badge';
import { usePagination } from '../../hooks/usePagination';
import { getErrorMessage } from '../../services/api';
import toast from 'react-hot-toast';
import type { SugerenciaConUsuario, PrioridadSugerencia, EstadoSugerencia } from '@hofra/shared';

const prioridadLabels: Record<PrioridadSugerencia, string> = {
  alta: 'Alta',
  media: 'Media',
  baja: 'Baja',
};

const prioridadVariants: Record<PrioridadSugerencia, 'danger' | 'warning' | 'secondary'> = {
  alta: 'danger',
  media: 'warning',
  baja: 'secondary',
};

const estadoLabels: Record<EstadoSugerencia, string> = {
  nueva: 'Nueva',
  en_progreso: 'En Progreso',
  resuelta: 'Resuelta',
  cancelada: 'Cancelada',
};

const estadoVariants: Record<EstadoSugerencia, 'primary' | 'warning' | 'success' | 'secondary'> = {
  nueva: 'primary',
  en_progreso: 'warning',
  resuelta: 'success',
  cancelada: 'secondary',
};

export function SugerenciasListPage() {
  const navigate = useNavigate();
  const [sugerencias, setSugerencias] = useState<SugerenciaConUsuario[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState<string>('');
  const [filtroPrioridad, setFiltroPrioridad] = useState<string>('');
  const { page, limit, setPage, setLimit } = usePagination();

  useEffect(() => {
    loadSugerencias();
  }, [page, limit, filtroEstado, filtroPrioridad]);

  const loadSugerencias = async () => {
    setIsLoading(true);
    try {
      const result = await sugerenciasService.getAll({
        page,
        limit,
        estado: filtroEstado || undefined,
        prioridad: filtroPrioridad || undefined,
      });
      setSugerencias(result.data);
      setTotal(result.pagination.total);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar esta sugerencia?')) return;

    try {
      await sugerenciasService.delete(id);
      toast.success('Sugerencia eliminada');
      loadSugerencias();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const columns = [
    {
      key: 'prioridad',
      header: 'Prioridad',
      render: (item: SugerenciaConUsuario) => (
        <Badge variant={prioridadVariants[item.prioridad]}>
          {prioridadLabels[item.prioridad]}
        </Badge>
      ),
    },
    {
      key: 'titulo',
      header: 'Título',
      render: (item: SugerenciaConUsuario) => (
        <div>
          <p className="font-medium text-gray-900">{item.titulo}</p>
          <p className="text-sm text-gray-500 truncate max-w-md">{item.descripcion}</p>
        </div>
      ),
    },
    {
      key: 'estado',
      header: 'Estado',
      render: (item: SugerenciaConUsuario) => (
        <Badge variant={estadoVariants[item.estado]}>
          {estadoLabels[item.estado]}
        </Badge>
      ),
    },
    {
      key: 'creador',
      header: 'Creado por',
      render: (item: SugerenciaConUsuario) => (
        <span className="text-sm text-gray-600">
          {item.creador ? `${item.creador.nombre} ${item.creador.apellido}` : '-'}
        </span>
      ),
    },
    {
      key: 'fecha',
      header: 'Fecha',
      render: (item: SugerenciaConUsuario) => (
        <span className="text-sm text-gray-600">
          {format(new Date(item.createdAt), 'dd/MM/yyyy', { locale: es })}
        </span>
      ),
    },
    {
      key: 'acciones',
      header: 'Acciones',
      render: (item: SugerenciaConUsuario) => (
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/sugerencias/${item.id}/editar`);
            }}
            className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-gray-100 rounded"
            title="Editar"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(item.id);
            }}
            className="p-1.5 text-gray-500 hover:text-danger-600 hover:bg-gray-100 rounded"
            title="Eliminar"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Lightbulb className="w-8 h-8 text-yellow-500" />
          <h1 className="text-2xl font-bold text-gray-900">Sugerencias</h1>
        </div>
        <Link to="/sugerencias/nueva" className="btn-primary">
          <Plus className="w-5 h-5 mr-2" />
          Nueva Sugerencia
        </Link>
      </div>

      {/* Filtros */}
      <div className="card p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
            <select
              value={filtroEstado}
              onChange={(e) => {
                setFiltroEstado(e.target.value);
                setPage(1);
              }}
              className="input"
            >
              <option value="">Todos</option>
              <option value="nueva">Nueva</option>
              <option value="en_progreso">En Progreso</option>
              <option value="resuelta">Resuelta</option>
              <option value="cancelada">Cancelada</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Prioridad</label>
            <select
              value={filtroPrioridad}
              onChange={(e) => {
                setFiltroPrioridad(e.target.value);
                setPage(1);
              }}
              className="input"
            >
              <option value="">Todas</option>
              <option value="alta">Alta</option>
              <option value="media">Media</option>
              <option value="baja">Baja</option>
            </select>
          </div>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={sugerencias}
        keyExtractor={(item) => item.id}
        isLoading={isLoading}
        pagination={{ page, limit, total, totalPages: Math.ceil(total / limit) }}
        onPageChange={setPage}
        onLimitChange={setLimit}
        onRowClick={(item) => navigate(`/sugerencias/${item.id}/editar`)}
        emptyMessage="No hay sugerencias registradas"
      />

    </div>
  );
}

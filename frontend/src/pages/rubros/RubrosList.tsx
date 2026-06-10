import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { rubrosService } from '../../services/rubros.service';
import { DataTable } from '../../components/DataTable';
import { SearchInput } from '../../components/SearchInput';
import { StatusBadge } from '../../components/Badge';
import { PermissionGuard } from '../../components/PermissionGuard';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { usePagination } from '../../hooks/usePagination';
import { useDebounce } from '../../hooks/useDebounce';
import { getErrorMessage } from '../../services/api';
import toast from 'react-hot-toast';
import type { Rubro } from '@hofra/shared';

export function RubrosListPage() {
  const [rubros, setRubros] = useState<Rubro[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [busqueda, setBusqueda] = useState('');

  const { page, limit, setPage } = usePagination();
  const debouncedBusqueda = useDebounce(busqueda, 300);

  useEffect(() => {
    loadRubros();
  }, [page, debouncedBusqueda]);

  const loadRubros = async () => {
    setIsLoading(true);
    try {
      const result = await rubrosService.getAll({ page, limit, sortBy: 'nombre', sortOrder: 'asc' });
      // Filter locally if searching (simple search for rubros)
      let filteredData = result.data;
      if (debouncedBusqueda) {
        const search = debouncedBusqueda.toLowerCase();
        filteredData = result.data.filter(
          (r) =>
            r.nombre.toLowerCase().includes(search) ||
            r.prefijo.toLowerCase().includes(search) ||
            (r.descripcion && r.descripcion.toLowerCase().includes(search))
        );
      }
      setRubros(filteredData);
      setTotal(debouncedBusqueda ? filteredData.length : result.pagination.total);
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
      await rubrosService.delete(deleteId);
      toast.success('Rubro eliminado');
      loadRubros();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  const columns = [
    {
      key: 'nombre',
      header: 'Nombre',
      render: (item: Rubro) => <span className="font-medium">{item.nombre}</span>,
    },
    {
      key: 'prefijo',
      header: 'Prefijo',
      render: (item: Rubro) => (
        <span className="font-mono text-primary-600 bg-primary-50 px-2 py-0.5 rounded">
          {item.prefijo}
        </span>
      ),
    },
    {
      key: 'descripcion',
      header: 'Descripción',
      render: (item: Rubro) => (
        <span className="text-gray-600">{item.descripcion || '-'}</span>
      ),
    },
    {
      key: 'activo',
      header: 'Estado',
      render: (item: Rubro) => <StatusBadge activo={item.activo} />,
    },
    {
      key: 'acciones',
      header: 'Acciones',
      render: (item: Rubro) => (
        <div className="flex items-center gap-2">
          <PermissionGuard modulo="rubros" accion="actualizar">
            <Link
              to={`/rubros/${item.id}/editar`}
              className="p-1 text-gray-400 hover:text-primary-600"
            >
              <Edit className="w-5 h-5" />
            </Link>
          </PermissionGuard>
          <PermissionGuard modulo="rubros" accion="eliminar">
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
        <h1 className="text-2xl font-bold text-gray-900">Rubros</h1>
        <PermissionGuard modulo="rubros" accion="crear">
          <Link to="/rubros/nuevo" className="btn-primary">
            <Plus className="w-5 h-5 mr-2" />
            Nuevo Rubro
          </Link>
        </PermissionGuard>
      </div>

      <div className="card p-4">
        <SearchInput
          value={busqueda}
          onChange={setBusqueda}
          placeholder="Buscar por nombre, prefijo o descripción..."
          className="max-w-md"
        />
      </div>

      <DataTable
        columns={columns}
        data={rubros}
        keyExtractor={(item) => item.id}
        isLoading={isLoading}
        pagination={{ page, limit, total, totalPages: Math.ceil(total / limit) }}
        onPageChange={setPage}
        getRowHref={(item) => `/rubros/${item.id}/editar`}
        emptyMessage="No se encontraron rubros"
      />

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Eliminar rubro"
        message="¿Está seguro de eliminar este rubro? Los artículos asociados quedarán sin rubro."
        confirmText="Eliminar"
        isLoading={isDeleting}
      />
    </div>
  );
}

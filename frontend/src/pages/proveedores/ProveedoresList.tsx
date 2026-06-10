import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { proveedoresService } from '../../services/proveedores.service';
import { DataTable } from '../../components/DataTable';
import { SearchInput } from '../../components/SearchInput';
import { StatusBadge } from '../../components/Badge';
import { PermissionGuard } from '../../components/PermissionGuard';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { usePagination } from '../../hooks/usePagination';
import { useDebounce } from '../../hooks/useDebounce';
import { getErrorMessage } from '../../services/api';
import toast from 'react-hot-toast';
import type { Proveedor } from '@hofra/shared';

export function ProveedoresListPage() {
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [busqueda, setBusqueda] = useState('');

  const { page, limit, setPage, setLimit } = usePagination();
  const debouncedBusqueda = useDebounce(busqueda, 300);

  useEffect(() => {
    loadProveedores();
  }, [page, limit, debouncedBusqueda]);

  const loadProveedores = async () => {
    setIsLoading(true);
    try {
      const result = debouncedBusqueda
        ? await proveedoresService.search(debouncedBusqueda, { page, limit, sortBy: 'razon_social', sortOrder: 'asc' })
        : await proveedoresService.getAll({ page, limit, sortBy: 'razon_social', sortOrder: 'asc' });
      setProveedores(result.data);
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
      await proveedoresService.delete(deleteId);
      toast.success('Proveedor eliminado');
      loadProveedores();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  const formatCuit = (cuit: string) => {
    if (cuit.length === 11) {
      return `${cuit.slice(0, 2)}-${cuit.slice(2, 10)}-${cuit.slice(10)}`;
    }
    return cuit;
  };

  const columns = [
    {
      key: 'razonSocial',
      header: 'Razón Social',
      render: (item: Proveedor) => <span className="font-medium">{item.razonSocial}</span>,
    },
    {
      key: 'cuit',
      header: 'CUIT',
      render: (item: Proveedor) => <span className="font-mono text-sm">{item.cuit ? formatCuit(item.cuit) : '-'}</span>,
    },
    { key: 'telefono', header: 'Teléfono' },
    { key: 'email', header: 'Email' },
    { key: 'contacto', header: 'Contacto' },
    {
      key: 'activo',
      header: 'Estado',
      render: (item: Proveedor) => <StatusBadge activo={item.activo} />,
    },
    {
      key: 'acciones',
      header: 'Acciones',
      render: (item: Proveedor) => (
        <div className="flex items-center gap-2">
          <PermissionGuard modulo="proveedores" accion="actualizar">
            <Link
              to={`/proveedores/${item.id}/editar`}
              className="p-1 text-gray-400 hover:text-primary-600"
            >
              <Edit className="w-5 h-5" />
            </Link>
          </PermissionGuard>
          <PermissionGuard modulo="proveedores" accion="eliminar">
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
        <h1 className="text-2xl font-bold text-gray-900">Proveedores</h1>
        <PermissionGuard modulo="proveedores" accion="crear">
          <Link to="/proveedores/nuevo" className="btn-primary">
            <Plus className="w-5 h-5 mr-2" />
            Nuevo Proveedor
          </Link>
        </PermissionGuard>
      </div>

      <div className="card p-4">
        <SearchInput
          value={busqueda}
          onChange={setBusqueda}
          placeholder="Buscar por razón social o CUIT..."
          className="max-w-md"
        />
      </div>

      <DataTable
        columns={columns}
        data={proveedores}
        keyExtractor={(item) => item.id}
        isLoading={isLoading}
        pagination={{ page, limit, total, totalPages: Math.ceil(total / limit) }}
        onPageChange={setPage}
        onLimitChange={setLimit}
        getRowHref={(item) => `/proveedores/${item.id}/editar`}
        emptyMessage="No se encontraron proveedores"
      />

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Eliminar proveedor"
        message="¿Está seguro de eliminar este proveedor?"
        confirmText="Eliminar"
        isLoading={isDeleting}
      />
    </div>
  );
}

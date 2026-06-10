import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Edit, Trash2, Key, Shield } from 'lucide-react';
import { usuariosService } from '../../services/usuarios.service';
import { DataTable } from '../../components/DataTable';
import { SearchInput } from '../../components/SearchInput';
import { StatusBadge, Badge } from '../../components/Badge';
import { PermissionGuard } from '../../components/PermissionGuard';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { usePagination } from '../../hooks/usePagination';
import { useDebounce } from '../../hooks/useDebounce';
import { getErrorMessage } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';
import type { UsuarioConRoles } from '@hofra/shared';
import { ResetPasswordModal } from './ResetPasswordModal';

export function UsuariosListPage() {
  const { usuario: currentUser } = useAuth();
  const [usuarios, setUsuarios] = useState<UsuarioConRoles[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [resetPasswordUser, setResetPasswordUser] = useState<UsuarioConRoles | null>(null);

  const { page, limit, setPage, setLimit } = usePagination();
  const debouncedBusqueda = useDebounce(busqueda, 300);

  useEffect(() => {
    loadUsuarios();
  }, [page, limit, debouncedBusqueda]);

  const loadUsuarios = async () => {
    setIsLoading(true);
    try {
      const result = await usuariosService.getAll({ page, limit });
      // Filter client-side if there's a search term (API doesn't support search)
      let filtered = result.data;
      if (debouncedBusqueda) {
        const term = debouncedBusqueda.toLowerCase();
        filtered = result.data.filter(
          (u) =>
            u.nombre.toLowerCase().includes(term) ||
            u.apellido.toLowerCase().includes(term) ||
            u.email.toLowerCase().includes(term)
        );
      }
      setUsuarios(filtered);
      setTotal(debouncedBusqueda ? filtered.length : result.pagination.total);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    // Prevent self-deletion
    if (deleteId === currentUser?.id) {
      toast.error('No puede eliminar su propio usuario');
      setDeleteId(null);
      return;
    }

    setIsDeleting(true);
    try {
      await usuariosService.delete(deleteId);
      toast.success('Usuario eliminado');
      loadUsuarios();
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
      render: (item: UsuarioConRoles) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-primary-600 font-medium text-sm">
              {item.nombre[0]}{item.apellido[0]}
            </span>
          </div>
          <div>
            <p className="font-medium">{item.nombre} {item.apellido}</p>
            <p className="text-sm text-gray-500">{item.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'roles',
      header: 'Roles',
      render: (item: UsuarioConRoles) => (
        <div className="flex flex-wrap gap-1">
          {item.roles.map((rol) => (
            <Badge key={rol.id} variant="primary" className="text-xs">
              <Shield className="w-3 h-3 mr-1" />
              {rol.nombre}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      key: 'ultimoAcceso',
      header: 'Último Acceso',
      render: (item: UsuarioConRoles) => (
        <span className="text-sm text-gray-500">
          {item.ultimoAcceso
            ? new Date(item.ultimoAcceso).toLocaleDateString('es-AR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })
            : 'Nunca'}
        </span>
      ),
    },
    {
      key: 'activo',
      header: 'Estado',
      render: (item: UsuarioConRoles) => <StatusBadge activo={item.activo} />,
    },
    {
      key: 'acciones',
      header: '',
      render: (item: UsuarioConRoles) => (
        <div className="flex items-center justify-end gap-1">
          <PermissionGuard modulo="usuarios" accion="actualizar">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setResetPasswordUser(item);
              }}
              className="p-1.5 text-gray-500 hover:text-warning-600 hover:bg-warning-50 rounded"
              title="Resetear contraseña"
            >
              <Key className="w-4 h-4" />
            </button>
            <Link
              to={`/usuarios/${item.id}/editar`}
              onClick={(e) => e.stopPropagation()}
              className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded"
              title="Editar"
            >
              <Edit className="w-4 h-4" />
            </Link>
          </PermissionGuard>
          <PermissionGuard modulo="usuarios" accion="eliminar">
            {item.id !== currentUser?.id && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteId(item.id);
                }}
                className="p-1.5 text-gray-500 hover:text-danger-600 hover:bg-danger-50 rounded"
                title="Eliminar"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </PermissionGuard>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Usuarios</h1>
        <PermissionGuard modulo="usuarios" accion="crear">
          <Link to="/usuarios/nuevo" className="btn-primary">
            <Plus className="w-5 h-5 mr-2" />
            Nuevo Usuario
          </Link>
        </PermissionGuard>
      </div>

      <div className="card p-4">
        <SearchInput
          value={busqueda}
          onChange={setBusqueda}
          placeholder="Buscar por nombre o email..."
          className="max-w-md"
        />
      </div>

      <DataTable
        columns={columns}
        data={usuarios}
        keyExtractor={(item) => item.id}
        isLoading={isLoading}
        pagination={{ page, limit, total, totalPages: Math.ceil(total / limit) }}
        onPageChange={setPage}
        onLimitChange={setLimit}
        getRowHref={(item) => `/usuarios/${item.id}/editar`}
        emptyMessage="No se encontraron usuarios"
      />

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Eliminar usuario"
        message="¿Está seguro de eliminar este usuario? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        isLoading={isDeleting}
      />

      <ResetPasswordModal
        isOpen={!!resetPasswordUser}
        onClose={() => setResetPasswordUser(null)}
        usuario={resetPasswordUser}
        onSuccess={() => {
          setResetPasswordUser(null);
          toast.success('Contraseña reseteada correctamente');
        }}
      />
    </div>
  );
}

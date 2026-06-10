import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Edit, Trash2, Shield, Lock } from 'lucide-react';
import { rolesService } from '../../services/roles.service';
import { DataTable } from '../../components/DataTable';
import { Badge } from '../../components/Badge';
import { PermissionGuard } from '../../components/PermissionGuard';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { usePagination } from '../../hooks/usePagination';
import { getErrorMessage } from '../../services/api';
import toast from 'react-hot-toast';
import type { RolConPermisos } from '@hofra/shared';

// Roles del sistema que no se pueden eliminar
const SYSTEM_ROLES = ['Administrador'];

export function RolesListPage() {
  const [roles, setRoles] = useState<RolConPermisos[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteRoleName, setDeleteRoleName] = useState<string>('');
  const [isDeleting, setIsDeleting] = useState(false);

  const { page, limit, setPage, setLimit } = usePagination();

  useEffect(() => {
    loadRoles();
  }, [page, limit]);

  const loadRoles = async () => {
    setIsLoading(true);
    try {
      const data = await rolesService.getAllWithPermisos();
      setRoles(data);
      setTotal(data.length);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteClick = (rol: RolConPermisos) => {
    if (SYSTEM_ROLES.includes(rol.nombre)) {
      toast.error('No se puede eliminar un rol del sistema');
      return;
    }
    setDeleteId(rol.id);
    setDeleteRoleName(rol.nombre);
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    setIsDeleting(true);
    try {
      await rolesService.delete(deleteId);
      toast.success('Rol eliminado');
      loadRoles();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
      setDeleteRoleName('');
    }
  };

  const groupPermisosByModulo = (permisos: RolConPermisos['permisos']) => {
    const grouped: Record<string, string[]> = {};
    permisos.forEach((p) => {
      if (!grouped[p.modulo]) {
        grouped[p.modulo] = [];
      }
      grouped[p.modulo].push(p.accion);
    });
    return grouped;
  };

  const columns = [
    {
      key: 'nombre',
      header: 'Rol',
      render: (item: RolConPermisos) => (
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${SYSTEM_ROLES.includes(item.nombre) ? 'bg-warning-100' : 'bg-primary-100'}`}>
            <Shield className={`w-5 h-5 ${SYSTEM_ROLES.includes(item.nombre) ? 'text-warning-600' : 'text-primary-600'}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-medium">{item.nombre}</p>
              {SYSTEM_ROLES.includes(item.nombre) && (
                <Lock className="w-3.5 h-3.5 text-warning-500" title="Rol del sistema" />
              )}
            </div>
            {item.descripcion && (
              <p className="text-sm text-gray-500">{item.descripcion}</p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'permisos',
      header: 'Permisos',
      render: (item: RolConPermisos) => {
        const grouped = groupPermisosByModulo(item.permisos);
        const moduloCount = Object.keys(grouped).length;
        const permisoCount = item.permisos.length;

        return (
          <div className="flex flex-wrap gap-1">
            <Badge variant="secondary" className="text-xs">
              {moduloCount} módulos
            </Badge>
            <Badge variant="primary" className="text-xs">
              {permisoCount} permisos
            </Badge>
          </div>
        );
      },
    },
    {
      key: 'acciones',
      header: '',
      render: (item: RolConPermisos) => (
        <div className="flex items-center justify-end gap-1">
          <PermissionGuard modulo="roles" accion="actualizar">
            <Link
              to={`/roles/${item.id}/editar`}
              onClick={(e) => e.stopPropagation()}
              className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded"
              title="Editar"
            >
              <Edit className="w-4 h-4" />
            </Link>
          </PermissionGuard>
          <PermissionGuard modulo="roles" accion="eliminar">
            {!SYSTEM_ROLES.includes(item.nombre) && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteClick(item);
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
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Roles y Permisos</h1>
          <p className="text-sm text-gray-500 mt-1">
            Gestiona los roles del sistema y sus permisos asociados
          </p>
        </div>
        <PermissionGuard modulo="roles" accion="crear">
          <Link to="/roles/nuevo" className="btn-primary">
            <Plus className="w-5 h-5 mr-2" />
            Nuevo Rol
          </Link>
        </PermissionGuard>
      </div>

      <DataTable
        columns={columns}
        data={roles}
        keyExtractor={(item) => item.id}
        isLoading={isLoading}
        pagination={{ page, limit, total, totalPages: Math.ceil(total / limit) }}
        onPageChange={setPage}
        onLimitChange={setLimit}
        getRowHref={(item) => `/roles/${item.id}/editar`}
        emptyMessage="No hay roles registrados"
      />

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => {
          setDeleteId(null);
          setDeleteRoleName('');
        }}
        onConfirm={handleDelete}
        title="Eliminar rol"
        message={`¿Está seguro de eliminar el rol "${deleteRoleName}"? Los usuarios con este rol perderán los permisos asociados.`}
        confirmText="Eliminar"
        isLoading={isDeleting}
      />
    </div>
  );
}

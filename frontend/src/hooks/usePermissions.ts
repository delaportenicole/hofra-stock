import { useAuthStore } from '../stores/authStore';

export function usePermissions() {
  const { permisos, hasPermission, hasAnyPermission } = useAuthStore();

  const canRead = (modulo: string) => hasPermission(modulo, 'leer');
  const canCreate = (modulo: string) => hasPermission(modulo, 'crear');
  const canUpdate = (modulo: string) => hasPermission(modulo, 'actualizar');
  const canDelete = (modulo: string) => hasPermission(modulo, 'eliminar');

  return {
    permisos,
    hasPermission,
    hasAnyPermission,
    canRead,
    canCreate,
    canUpdate,
    canDelete,
  };
}

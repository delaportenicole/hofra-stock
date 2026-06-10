import { usePermissions } from '../hooks/usePermissions';

interface PermissionGuardProps {
  modulo: string;
  accion: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function PermissionGuard({
  modulo,
  accion,
  children,
  fallback = null,
}: PermissionGuardProps) {
  const { hasPermission } = usePermissions();

  if (!hasPermission(modulo, accion)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

interface AnyPermissionGuardProps {
  permisos: Array<{ modulo: string; accion: string }>;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function AnyPermissionGuard({
  permisos,
  children,
  fallback = null,
}: AnyPermissionGuardProps) {
  const { hasAnyPermission } = usePermissions();

  if (!hasAnyPermission(permisos)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

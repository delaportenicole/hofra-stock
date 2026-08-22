import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Users,
  Truck,
  Building2,
  ArrowDownToLine,
  ArrowUpFromLine,
  Shield,
  FileText,
  LogOut,
  Menu,
  X,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Settings,
  Upload,
  BarChart3,
  Key,
  Lightbulb,
  ClipboardList,
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { usePermissions } from '../hooks/usePermissions';
import { useUIStore } from '../stores/uiStore';
import { ChangePasswordModal } from '../components/ChangePasswordModal';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  permiso?: { modulo: string; accion: string };
}

const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, permiso: { modulo: 'dashboard', accion: 'leer' } },
  { name: 'Artículos', href: '/articulos', icon: Package, permiso: { modulo: 'articulos', accion: 'leer' } },
  { name: 'Solicitudes de Cotización', href: '/solicitudes-cotizacion', icon: ClipboardList, permiso: { modulo: 'solicitudes_cotizacion', accion: 'leer' } },
  { name: 'Entregas', href: '/entregas', icon: ArrowUpFromLine, permiso: { modulo: 'entregas', accion: 'leer' } },
  { name: 'Reposiciones', href: '/reposiciones', icon: ArrowDownToLine, permiso: { modulo: 'reposiciones', accion: 'leer' } },
  { name: 'Clientes', href: '/clientes', icon: Building2, permiso: { modulo: 'clientes', accion: 'leer' } },
  { name: 'Proveedores', href: '/proveedores', icon: Truck, permiso: { modulo: 'proveedores', accion: 'leer' } },
  { name: 'Configuraciones', href: '/configuraciones', icon: Settings },
];

const adminNavigation: NavItem[] = [
  { name: 'Usuarios', href: '/usuarios', icon: Users, permiso: { modulo: 'usuarios', accion: 'leer' } },
  { name: 'Roles', href: '/roles', icon: Shield, permiso: { modulo: 'roles', accion: 'leer' } },
  { name: 'Auditoría', href: '/auditoria', icon: FileText, permiso: { modulo: 'auditoria', accion: 'leer' } },
  { name: 'Reportes', href: '/reportes', icon: BarChart3, permiso: { modulo: 'reportes', accion: 'leer' } },
  { name: 'Sugerencias', href: '/sugerencias', icon: Lightbulb },
  { name: 'Importar', href: '/importar', icon: Upload },
];

export function AdminLayout() {
  const { usuario, logout, changePassword } = useAuth();
  const { hasPermission } = usePermissions();
  const { sidebarOpen, setSidebarOpen } = useUIStore();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const filteredNavigation = navigation.filter(
    (item) => !item.permiso || hasPermission(item.permiso.modulo, item.permiso.accion)
  );

  const filteredAdminNavigation = adminNavigation.filter(
    (item) => !item.permiso || hasPermission(item.permiso.modulo, item.permiso.accion)
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full bg-white border-r border-gray-200 transform transition-all duration-300 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } ${sidebarCollapsed ? 'w-16' : 'w-64'}`}
      >
        <div className={`flex items-center h-16 border-b border-gray-200 ${sidebarCollapsed ? 'justify-center px-2' : 'justify-between px-4'}`}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-lg">H</span>
            </div>
            {!sidebarCollapsed && (
              <span className="font-semibold text-gray-900">Hofra Stock</span>
            )}
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className={`p-2 space-y-1 ${sidebarCollapsed ? 'px-2' : 'px-4'} relative`}>
          {/* Collapse toggle button - positioned at Dashboard height */}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="hidden lg:flex absolute -right-3 top-3 p-1.5 rounded-full bg-white border border-gray-200 hover:bg-gray-100 text-gray-500 shadow-sm z-10"
            title={sidebarCollapsed ? 'Expandir menú' : 'Colapsar menú'}
          >
            {sidebarCollapsed ? (
              <ChevronRight className="w-3.5 h-3.5" />
            ) : (
              <ChevronLeft className="w-3.5 h-3.5" />
            )}
          </button>

          {filteredNavigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              onClick={() => setSidebarOpen(false)}
              title={sidebarCollapsed ? item.name : undefined}
              className={({ isActive }) =>
                `sidebar-link ${isActive ? 'sidebar-link-active' : ''} ${sidebarCollapsed ? 'justify-center px-2' : ''}`
              }
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {!sidebarCollapsed && <span>{item.name}</span>}
            </NavLink>
          ))}

          {filteredAdminNavigation.length > 0 && (
            <>
              <div className="pt-4 pb-2">
                {!sidebarCollapsed && (
                  <span className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Administración
                  </span>
                )}
                {sidebarCollapsed && (
                  <div className="border-t border-gray-200 mx-2"></div>
                )}
              </div>
              {filteredAdminNavigation.map((item) => (
                <NavLink
                  key={item.name}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  title={sidebarCollapsed ? item.name : undefined}
                  className={({ isActive }) =>
                    `sidebar-link ${isActive ? 'sidebar-link-active' : ''} ${sidebarCollapsed ? 'justify-center px-2' : ''}`
                  }
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  {!sidebarCollapsed && <span>{item.name}</span>}
                </NavLink>
              ))}
            </>
          )}
        </nav>

      </aside>

      {/* Main content */}
      <div className={`transition-all duration-300 ${sidebarCollapsed ? 'lg:pl-16' : 'lg:pl-64'}`}>
        {/* Header */}
        <header className="sticky top-0 z-30 h-16 bg-white border-b border-gray-200">
          <div className="flex items-center justify-between h-full px-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex-1" />

            {/* User menu */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100"
              >
                <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                  <span className="text-primary-600 font-medium text-sm">
                    {usuario?.nombre?.[0]}
                    {usuario?.apellido?.[0]}
                  </span>
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-medium text-gray-900">
                    {usuario?.nombre} {usuario?.apellido}
                  </p>
                  <p className="text-xs text-gray-500">{usuario?.email}</p>
                </div>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </button>

              {userMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setUserMenuOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
                    <div className="py-1">
                      <button
                        onClick={() => {
                          setUserMenuOpen(false);
                          setChangePasswordOpen(true);
                        }}
                        className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <Key className="w-4 h-4" />
                        Cambiar contraseña
                      </button>
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <LogOut className="w-4 h-4" />
                        Cerrar sesión
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-6">
          <Outlet />
        </main>
      </div>

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={changePasswordOpen}
        onClose={() => setChangePasswordOpen(false)}
      />
    </div>
  );
}

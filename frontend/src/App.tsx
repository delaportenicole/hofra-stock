import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';

// Layouts
import { AdminLayout } from './layouts/AdminLayout';

// Pages
import { LoginPage } from './pages/Login';
import { DashboardPage } from './pages/Dashboard';
import { ArticulosListPage } from './pages/articulos/ArticulosList';
import { ArticuloFormPage } from './pages/articulos/ArticuloForm';
import { ArticuloDetailPage } from './pages/articulos/ArticuloDetail';
import { ClientesListPage } from './pages/clientes/ClientesList';
import { ClienteFormPage } from './pages/clientes/ClienteForm';
import { ProveedoresListPage } from './pages/proveedores/ProveedoresList';
import { ProveedorFormPage } from './pages/proveedores/ProveedorForm';
import { EntregasListPage } from './pages/entregas/EntregasList';
import { EntregaFormPage } from './pages/entregas/EntregaForm';
import { EntregaDetailPage } from './pages/entregas/EntregaDetail';
import { EntregaEditPage } from './pages/entregas/EntregaEdit';
import { ReposicionesListPage } from './pages/reposiciones/ReposicionesList';
import { ReposicionFormPage } from './pages/reposiciones/ReposicionForm';
import { ReposicionDetailPage } from './pages/reposiciones/ReposicionDetail';
import { ReposicionEditPage } from './pages/reposiciones/ReposicionEdit';
import { SolicitudesCotizacionListPage } from './pages/solicitudesCotizacion/SolicitudesCotizacionList';
import { SolicitudCotizacionUploadPage } from './pages/solicitudesCotizacion/SolicitudCotizacionUpload';
import { SolicitudCotizacionDetailPage } from './pages/solicitudesCotizacion/SolicitudCotizacionDetail';
import { UnidadesListPage } from './pages/unidades/UnidadesList';
import { UsuariosListPage } from './pages/usuarios/UsuariosList';
import { UsuarioFormPage } from './pages/usuarios/UsuarioForm';
import { RolesListPage } from './pages/roles/RolesList';
import { RoleFormPage } from './pages/roles/RoleForm';
import { AuditoriaListPage } from './pages/auditoria/AuditoriaList';
import { ImportarPage } from './pages/importar/ImportarPage';
import { ReportesPage } from './pages/reportes/ReportesPage';
import { SugerenciasListPage } from './pages/sugerencias/SugerenciasList';
import { SugerenciaFormPage } from './pages/sugerencias/SugerenciaForm';

// Protected Route Component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const hasHydrated = useAuthStore((state) => state._hasHydrated);

  // Wait for hydration before checking auth
  if (!hasHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

// Public Route Component (redirect if authenticated)
function PublicRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const hasHydrated = useAuthStore((state) => state._hasHydrated);

  // Wait for hydration before checking auth
  if (!hasHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

// Placeholder pages for routes not yet implemented
function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
      <div className="card p-8 text-center text-gray-500">
        Página en construcción
      </div>
    </div>
  );
}

function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />

      {/* Protected routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />

        {/* Artículos */}
        <Route path="articulos" element={<ArticulosListPage />} />
        <Route path="articulos/nuevo" element={<ArticuloFormPage />} />
        <Route path="articulos/:id" element={<ArticuloDetailPage />} />
        <Route path="articulos/:id/editar" element={<ArticuloFormPage />} />


        {/* Clientes */}
        <Route path="clientes" element={<ClientesListPage />} />
        <Route path="clientes/nuevo" element={<ClienteFormPage />} />
        <Route path="clientes/:id/editar" element={<ClienteFormPage />} />

        {/* Proveedores */}
        <Route path="proveedores" element={<ProveedoresListPage />} />
        <Route path="proveedores/nuevo" element={<ProveedorFormPage />} />
        <Route path="proveedores/:id/editar" element={<ProveedorFormPage />} />

        {/* Entregas */}
        <Route path="entregas" element={<EntregasListPage />} />
        <Route path="entregas/nueva" element={<EntregaFormPage />} />
        <Route path="entregas/:id" element={<EntregaDetailPage />} />
        <Route path="entregas/:id/editar" element={<EntregaEditPage />} />

        {/* Reposiciones */}
        <Route path="reposiciones" element={<ReposicionesListPage />} />
        <Route path="reposiciones/nueva" element={<ReposicionFormPage />} />
        <Route path="reposiciones/:id" element={<ReposicionDetailPage />} />
        <Route path="reposiciones/:id/editar" element={<ReposicionEditPage />} />

        {/* Solicitudes de Cotización */}
        <Route path="solicitudes-cotizacion" element={<SolicitudesCotizacionListPage />} />
        <Route path="solicitudes-cotizacion/nueva" element={<SolicitudCotizacionUploadPage />} />
        <Route path="solicitudes-cotizacion/:id" element={<SolicitudCotizacionDetailPage />} />

        {/* Configuraciones */}
        <Route path="configuraciones" element={<UnidadesListPage />} />

        {/* Usuarios (Admin) */}
        <Route path="usuarios" element={<UsuariosListPage />} />
        <Route path="usuarios/nuevo" element={<UsuarioFormPage />} />
        <Route path="usuarios/:id/editar" element={<UsuarioFormPage />} />

        {/* Roles (Admin) */}
        <Route path="roles" element={<RolesListPage />} />
        <Route path="roles/nuevo" element={<RoleFormPage />} />
        <Route path="roles/:id/editar" element={<RoleFormPage />} />

        {/* Auditoría (Admin) */}
        <Route path="auditoria" element={<AuditoriaListPage />} />

        {/* Importar (Admin) */}
        <Route path="importar" element={<ImportarPage />} />

        {/* Reportes (Admin) */}
        <Route path="reportes" element={<ReportesPage />} />

        {/* Sugerencias (Admin) */}
        <Route path="sugerencias" element={<SugerenciasListPage />} />
        <Route path="sugerencias/nueva" element={<SugerenciaFormPage />} />
        <Route path="sugerencias/:id/editar" element={<SugerenciaFormPage />} />
      </Route>

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default App;

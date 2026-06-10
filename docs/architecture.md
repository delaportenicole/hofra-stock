# Architecture Documentation

## Visión General

Hofra Stock es un sistema de gestión de inventario construido con una arquitectura monorepo que separa claramente el frontend, backend y código compartido.

```
┌──────────────────────────────────────────────────────────┐
│                         Cliente                          │
│                    (Browser/Mobile)                      │
└─────────────────────────┬────────────────────────────────┘
                          │
                          │ HTTPS
                          ▼
┌──────────────────────────────────────────────────────────┐
│                     Vercel Edge                          │
│              (CDN + Serverless Functions)                │
├────────────────────────┬─────────────────────────────────┤
│     Static Assets      │      API Routes                 │
│   (frontend/dist)      │    (/api/*)                     │
└────────────────────────┴─────────────────────────────────┘
                                    │
                          ┌─────────┴─────────┐
                          │                   │
                          ▼                   ▼
              ┌───────────────────┐  ┌───────────────────┐
              │   Neon PostgreSQL │  │   Cloudinary CDN  │
              │   (Database)      │  │   (Images)        │
              └───────────────────┘  └───────────────────┘
```

## Estructura del Monorepo

```
hofra-stock/
├── frontend/              # Aplicación React
│   ├── src/
│   │   ├── components/   # Componentes reutilizables
│   │   ├── pages/        # Páginas/vistas
│   │   ├── layouts/      # Layouts (Admin)
│   │   ├── hooks/        # Custom hooks
│   │   ├── services/     # Llamadas a API
│   │   ├── stores/       # Estado global (Zustand)
│   │   ├── types/        # TypeScript types
│   │   └── utils/        # Utilidades
│   └── package.json
│
├── backend/               # Servidor Express
│   ├── src/
│   │   ├── controllers/  # Controladores REST
│   │   ├── services/     # Lógica de negocio
│   │   ├── repositories/ # Acceso a datos
│   │   ├── middlewares/  # Auth, validation, audit
│   │   ├── validators/   # Esquemas Zod
│   │   ├── routes/       # Definición de rutas
│   │   ├── types/        # TypeScript types
│   │   ├── utils/        # Utilidades
│   │   ├── config/       # Configuración
│   │   └── app.ts        # Entry point
│   └── package.json
│
├── shared/                # Código compartido
│   ├── src/
│   │   ├── types/        # Interfaces TypeScript
│   │   ├── constants/    # Constantes
│   │   └── validators/   # Esquemas Zod compartidos
│   └── package.json
│
└── database/              # Scripts SQL
    ├── schema.sql
    └── seeds/
```

## Capas del Backend

```
Request
   │
   ▼
┌──────────────────┐
│     Router       │  Define endpoints y middlewares
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│   Middleware     │  Auth, Validation, Audit
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│   Controller     │  Maneja request/response
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│    Service       │  Lógica de negocio
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│   Repository     │  Acceso a base de datos
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│   PostgreSQL     │  Persistencia
└──────────────────┘
```

## Flujo de Autenticación

```
┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐
│ Cliente │────>│  Login  │────>│ Verify  │────>│ Generate│
│         │     │ Request │     │ Password│     │  Tokens │
└─────────┘     └─────────┘     └─────────┘     └────┬────┘
                                                     │
    ┌────────────────────────────────────────────────┘
    │
    ▼
┌─────────┐     ┌─────────┐     ┌─────────┐
│  Store  │────>│ Include │────>│  Verify │
│ Tokens  │     │ in Req  │     │   JWT   │
└─────────┘     └─────────┘     └─────────┘
```

### JWT Structure

**Access Token (15 min):**
```json
{
  "userId": "uuid",
  "email": "user@email.com",
  "roles": ["Administrador"],
  "permisos": ["articulos:leer", "articulos:crear"],
  "iat": 1234567890,
  "exp": 1234568790
}
```

**Refresh Token (7 días):**
- Almacenado hasheado en base de datos
- Se invalida al usarse (rotation)

## Sistema de Permisos

```
┌──────────────────────────────────────────┐
│               Usuario                     │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  │
│  │  Rol 1  │  │  Rol 2  │  │  Rol 3  │  │
│  └────┬────┘  └────┬────┘  └────┬────┘  │
│       │            │            │        │
│       ▼            ▼            ▼        │
│  ┌─────────────────────────────────────┐ │
│  │           Permisos                  │ │
│  │  modulo:accion (ej: articulos:leer) │ │
│  └─────────────────────────────────────┘ │
└──────────────────────────────────────────┘
```

### Verificación en Backend
```typescript
// Middleware de permiso
requirePermission('articulos', 'crear')
```

### Verificación en Frontend
```tsx
// Componente guard
<PermissionGuard modulo="articulos" accion="crear">
  <CreateButton />
</PermissionGuard>
```

## Flujo de Stock

### Reposición (Ingreso)
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Crear     │────>│ Incrementar │────>│   Audit     │
│ Reposición  │     │    Stock    │     │    Log      │
└─────────────┘     └─────────────┘     └─────────────┘
```

### Entrega (Egreso)
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Verificar  │────>│   Crear     │────>│ Decrementar │────>│   Audit     │
│    Stock    │     │   Entrega   │     │    Stock    │     │    Log      │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
       │
       │ Stock insuficiente
       ▼
┌─────────────┐
│    Error    │
│  400/409    │
└─────────────┘
```

## Estado del Frontend (Zustand)

```
┌──────────────────────────────────────────┐
│              Zustand Stores              │
├─────────────────┬────────────────────────┤
│    authStore    │       uiStore          │
├─────────────────┼────────────────────────┤
│ - usuario       │ - sidebarOpen          │
│ - accessToken   │ - sidebarCollapsed     │
│ - refreshToken  │                        │
│ - permisos      │                        │
│ - isAuthenticated                        │
└─────────────────┴────────────────────────┘
         │
         │ persist (localStorage)
         ▼
    ┌─────────┐
    │ Browser │
    │ Storage │
    └─────────┘
```

## Manejo de Errores

### Backend
```typescript
// Errores custom
throw new ValidationError('Mensaje', { campo: ['error'] });
throw new NotFoundError('Recurso');
throw new UnauthorizedError();
throw new ForbiddenError();
throw new InsufficientStockError(available, requested);

// Middleware centralizado
app.use(errorHandler);
```

### Frontend
```typescript
// Interceptor de errores
api.interceptors.response.use(
  response => response,
  error => {
    // Auto-refresh token en 401
    // Redirect a login si falla
  }
);
```

## Auditoría

Toda operación de escritura se registra automáticamente:

```typescript
// Middleware automático
app.use(auditMiddleware('entidad'));

// O manual para casos especiales
await createAuditLog(req, {
  accion: 'entrega',
  entidad: 'articulos',
  entidadId: articuloId,
  datosNuevos: { cantidad, clienteId }
});
```

## Seguridad

1. **Autenticación**: JWT con refresh tokens
2. **Autorización**: RBAC (Role-Based Access Control)
3. **Passwords**: bcrypt con salt rounds 12
4. **SQL Injection**: Queries parametrizadas
5. **XSS**: React escapa automáticamente
6. **CORS**: Configurado solo para frontend
7. **Headers**: Helmet.js para headers de seguridad
8. **Validación**: Zod en backend y frontend

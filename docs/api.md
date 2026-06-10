# API Documentation

## Base URL

- Desarrollo: `http://localhost:3000/api`
- Producción: `https://your-domain.vercel.app/api`

## Autenticación

La API utiliza JWT para autenticación. Incluir el token en el header:

```
Authorization: Bearer <access_token>
```

## Respuestas

### Éxito
```json
{
  "success": true,
  "data": { ... },
  "message": "Operación exitosa"
}
```

### Error
```json
{
  "success": false,
  "message": "Descripción del error",
  "errors": { "campo": ["error1", "error2"] }
}
```

### Paginación
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

---

## Auth

### POST /auth/login
Iniciar sesión.

**Body:**
```json
{
  "email": "admin@hofra.com",
  "password": "Admin123!"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "usuario": { ... },
    "tokens": {
      "accessToken": "...",
      "refreshToken": "..."
    }
  }
}
```

### POST /auth/refresh
Renovar tokens.

**Body:**
```json
{
  "refreshToken": "..."
}
```

### POST /auth/logout
Cerrar sesión. Requiere autenticación.

**Body:**
```json
{
  "refreshToken": "..."
}
```

### POST /auth/change-password
Cambiar contraseña. Requiere autenticación.

**Body:**
```json
{
  "currentPassword": "...",
  "newPassword": "...",
  "confirmPassword": "..."
}
```

### GET /auth/profile
Obtener perfil del usuario actual. Requiere autenticación.

---

## Usuarios

Requiere permiso `usuarios:leer`, `usuarios:crear`, etc.

### GET /usuarios
Listar usuarios con paginación.

**Query params:** `page`, `limit`, `sortBy`, `sortOrder`

### GET /usuarios/:id
Obtener usuario por ID.

### POST /usuarios
Crear usuario.

**Body:**
```json
{
  "email": "usuario@email.com",
  "password": "Password123!",
  "nombre": "Juan",
  "apellido": "Pérez",
  "roleIds": ["uuid-rol-1", "uuid-rol-2"]
}
```

### PUT /usuarios/:id
Actualizar usuario.

### DELETE /usuarios/:id
Eliminar usuario (soft delete).

### POST /usuarios/:id/reset-password
Resetear contraseña de usuario.

---

## Roles

Requiere permiso `roles:*`

### GET /roles
Listar roles.

### GET /roles/with-permisos
Listar roles con sus permisos.

### GET /roles/permisos
Listar todos los permisos.

### GET /roles/permisos/grouped
Permisos agrupados por módulo.

### POST /roles
Crear rol.

**Body:**
```json
{
  "nombre": "Nombre del rol",
  "descripcion": "Descripción",
  "permisoIds": ["uuid-1", "uuid-2"]
}
```

### PUT /roles/:id
Actualizar rol.

### DELETE /roles/:id
Eliminar rol.

---

## Rubros

### GET /rubros
Listar rubros con paginación.

### GET /rubros/active
Listar solo rubros activos.

### GET /rubros/:id
Obtener rubro por ID.

### POST /rubros
Crear rubro.

**Body:**
```json
{
  "nombre": "Ferretería",
  "descripcion": "Herramientas y elementos"
}
```

### PUT /rubros/:id
Actualizar rubro.

### DELETE /rubros/:id
Eliminar rubro (falla si tiene artículos asociados).

---

## Clientes

### GET /clientes
Listar clientes con paginación.

### GET /clientes/active
Listar solo clientes activos.

### GET /clientes/search?q=term
Buscar clientes por razón social o CUIT.

### GET /clientes/:id
Obtener cliente por ID.

### POST /clientes
Crear cliente.

**Body:**
```json
{
  "razonSocial": "Empresa S.A.",
  "cuit": "30-12345678-9",
  "direccion": "Av. Corrientes 1234",
  "telefono": "011-4555-1234",
  "email": "contacto@empresa.com",
  "contacto": "Juan Pérez"
}
```

### PUT /clientes/:id
Actualizar cliente.

### DELETE /clientes/:id
Eliminar cliente.

---

## Proveedores

Misma estructura que Clientes.

### GET /proveedores/:id/reposiciones
Historial de reposiciones del proveedor.

---

## Artículos

### GET /articulos
Listar artículos con filtros.

**Query params:**
- `page`, `limit`, `sortBy`, `sortOrder`
- `busqueda`: búsqueda por código/nombre
- `rubroId`: filtrar por rubro
- `proveedorId`: filtrar por proveedor
- `stockBajo`: solo artículos con stock bajo
- `activo`: filtrar por estado

### GET /articulos/stock-bajo
Artículos con stock <= stock mínimo.

### GET /articulos/:id
Obtener artículo con relaciones.

### GET /articulos/:id/historial
Historial de movimientos (entregas y reposiciones).

### POST /articulos
Crear artículo.

**Body:**
```json
{
  "codigo": "FER-001",
  "nombre": "Martillo carpintero",
  "descripcion": "Martillo 500g",
  "rubroId": "uuid-rubro",
  "proveedorId": "uuid-proveedor",
  "stockMinimo": 10,
  "unidad": "Unidad"
}
```

### PUT /articulos/:id
Actualizar artículo.

### POST /articulos/:id/imagen
Subir imagen (multipart/form-data, campo: `imagen`).

### DELETE /articulos/:id/imagen
Eliminar imagen.

### DELETE /articulos/:id
Eliminar artículo.

---

## Stock

### GET /stock/reposiciones
Listar reposiciones.

### POST /stock/reposiciones
Crear reposición (incrementa stock automáticamente).

**Body:**
```json
{
  "articuloId": "uuid",
  "proveedorId": "uuid",
  "cantidad": 50,
  "observaciones": "Pedido #123"
}
```

### GET /stock/entregas
Listar entregas.

### POST /stock/entregas
Crear entrega (decrementa stock automáticamente).

**Body:**
```json
{
  "articuloId": "uuid",
  "clienteId": "uuid",
  "cantidad": 10,
  "observaciones": "Pedido cliente"
}
```

**Error si stock insuficiente:**
```json
{
  "success": false,
  "message": "Stock insuficiente. Disponible: 5, Solicitado: 10",
  "code": "INSUFFICIENT_STOCK"
}
```

---

## Dashboard

### GET /dashboard
Todos los datos del dashboard en una sola llamada.

### GET /dashboard/stats
Estadísticas principales.

**Response:**
```json
{
  "totalArticulos": 150,
  "articulosStockBajo": 12,
  "totalClientes": 45,
  "totalProveedores": 20,
  "entregasHoy": 5,
  "reposicionesHoy": 3,
  "entregasMes": 85,
  "reposicionesMes": 42
}
```

### GET /dashboard/movimientos-recientes
Últimos movimientos (entregas y reposiciones).

### GET /dashboard/articulos-stock-bajo
Artículos con stock bajo.

### GET /dashboard/stock-por-rubro
Distribución de artículos por rubro.

### GET /dashboard/movimientos-por-mes
Movimientos mensuales (últimos 6 meses).

---

## Auditoría

Requiere permiso `auditoria:leer`.

### GET /audit
Listar logs de auditoría.

**Query params:**
- `page`, `limit`
- `usuarioId`: filtrar por usuario
- `accion`: filtrar por acción (crear, actualizar, eliminar, login, etc.)
- `entidad`: filtrar por entidad (usuarios, articulos, etc.)
- `fechaDesde`, `fechaHasta`: rango de fechas

### GET /audit/filters
Obtener valores disponibles para filtros (entidades, acciones).

---

## Health Check

### GET /health
Estado del servidor.

```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

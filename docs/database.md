# Database Documentation

## PostgreSQL (Neon Serverless)

El sistema utiliza PostgreSQL como base de datos, hostedo en Neon para compatibilidad serverless.

## Diagrama de Entidades

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   usuarios  │────<│usuarios_roles│>────│    roles    │
└─────────────┘     └─────────────┘     └─────────────┘
                                              │
                                              │
                                        ┌─────────────┐
                                        │roles_permisos│
                                        └─────────────┘
                                              │
                                        ┌─────────────┐
                                        │   permisos  │
                                        └─────────────┘

┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   rubros    │<────│  articulos  │────>│ proveedores │
└─────────────┘     └─────────────┘     └─────────────┘
                          │
         ┌────────────────┼────────────────┐
         │                │                │
    ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
    │ reposiciones│  │  entregas   │  │  audit_log  │
    └─────────────┘  └─────────────┘  └─────────────┘
         │                │
    ┌─────────────┐  ┌─────────────┐
    │ proveedores │  │  clientes   │
    └─────────────┘  └─────────────┘
```

## Tablas

### usuarios
Usuarios del sistema.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | UUID | PK, auto-generado |
| email | VARCHAR(255) | Único, no nulo |
| password_hash | VARCHAR(255) | Hash bcrypt |
| nombre | VARCHAR(100) | |
| apellido | VARCHAR(100) | |
| activo | BOOLEAN | Default: true |
| ultimo_acceso | TIMESTAMPTZ | |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |
| deleted_at | TIMESTAMPTZ | Soft delete |

### roles
Roles del sistema.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | UUID | PK |
| nombre | VARCHAR(50) | Único |
| descripcion | VARCHAR(255) | |

### permisos
Permisos granulares por módulo y acción.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | UUID | PK |
| modulo | VARCHAR(50) | ej: "articulos" |
| accion | VARCHAR(20) | crear, leer, actualizar, eliminar |
| descripcion | VARCHAR(255) | |

### usuarios_roles
Relación many-to-many usuarios <-> roles.

### roles_permisos
Relación many-to-many roles <-> permisos.

### rubros
Categorías de artículos.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | UUID | PK |
| nombre | VARCHAR(100) | Único |
| descripcion | VARCHAR(255) | |
| activo | BOOLEAN | |

### clientes
Clientes para entregas.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | UUID | PK |
| razon_social | VARCHAR(200) | |
| cuit | VARCHAR(11) | Único, sin guiones |
| direccion | VARCHAR(255) | |
| telefono | VARCHAR(50) | |
| email | VARCHAR(255) | |
| contacto | VARCHAR(100) | |
| activo | BOOLEAN | |

### proveedores
Proveedores para reposiciones.

Misma estructura que clientes.

### articulos
Artículos del inventario.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | UUID | PK |
| codigo | VARCHAR(50) | Único |
| nombre | VARCHAR(200) | |
| descripcion | VARCHAR(500) | |
| rubro_id | UUID | FK -> rubros |
| proveedor_id | UUID | FK -> proveedores (nullable) |
| stock | INTEGER | >= 0 |
| stock_minimo | INTEGER | >= 0 |
| unidad | VARCHAR(20) | |
| imagen_url | VARCHAR(500) | URL de Cloudinary |
| imagen_public_id | VARCHAR(255) | ID para eliminar |
| activo | BOOLEAN | |

**Constraints:**
- `chk_stock_positive`: stock >= 0
- `chk_stock_minimo_positive`: stock_minimo >= 0

**Índices:**
- `idx_articulos_busqueda`: Búsqueda full-text en español

### reposiciones
Ingresos de stock desde proveedores.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | UUID | PK |
| articulo_id | UUID | FK -> articulos |
| proveedor_id | UUID | FK -> proveedores |
| cantidad | INTEGER | > 0 |
| observaciones | VARCHAR(500) | |
| fecha_reposicion | TIMESTAMPTZ | |

### entregas
Salidas de stock a clientes.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | UUID | PK |
| articulo_id | UUID | FK -> articulos |
| cliente_id | UUID | FK -> clientes |
| cantidad | INTEGER | > 0 |
| observaciones | VARCHAR(500) | |
| fecha_entrega | TIMESTAMPTZ | |

### audit_log
Registro de todas las acciones del sistema.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | UUID | PK |
| usuario_id | UUID | FK -> usuarios (nullable) |
| accion | VARCHAR(20) | crear, actualizar, eliminar, login, logout, reposicion, entrega |
| entidad | VARCHAR(50) | Tabla afectada |
| entidad_id | UUID | ID del registro afectado |
| datos_anteriores | JSONB | Estado antes del cambio |
| datos_nuevos | JSONB | Estado después del cambio |
| ip | VARCHAR(45) | IP del cliente |
| user_agent | VARCHAR(500) | |

### refresh_tokens
Tokens de refresco para autenticación.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | UUID | PK |
| usuario_id | UUID | FK -> usuarios |
| token_hash | VARCHAR(255) | Hash SHA-256 |
| expires_at | TIMESTAMPTZ | |
| revoked | BOOLEAN | |

## Campos Comunes

Todas las tablas principales incluyen:

- `created_at`: Fecha de creación
- `updated_at`: Fecha de última modificación (trigger automático)
- `deleted_at`: Soft delete
- `created_by`: Usuario que creó el registro
- `updated_by`: Usuario que modificó el registro

## Triggers

### update_updated_at_column()
Actualiza automáticamente `updated_at` en cada UPDATE.

## Migraciones

```bash
# Aplicar schema
npm run db:migrate

# Cargar datos iniciales
npm run db:seed
```

## Conexión

```typescript
import { Pool } from '@neondatabase/serverless';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});
```

Usar `@neondatabase/serverless` para compatibilidad con Vercel Serverless.

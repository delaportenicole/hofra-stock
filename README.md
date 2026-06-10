# Hofra Stock - Sistema de Gestión de Inventario

Sistema completo de gestión de inventario desarrollado para Grupo Hofra, con arquitectura monorepo, frontend React, backend Express y PostgreSQL.

## Características

- **Gestión de Artículos**: CRUD completo con imágenes, categorización por rubros y control de stock
- **Control de Stock**: Reposiciones desde proveedores y entregas a clientes
- **Sistema de Alertas**: Notificaciones de stock bajo
- **Dashboard**: Estadísticas y gráficos con KPIs principales
- **Autenticación JWT**: Sistema de roles y permisos granulares
- **Auditoría**: Registro completo de todas las acciones del sistema

## Stack Tecnológico

| Componente | Tecnología |
|------------|------------|
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS |
| Backend | Express + TypeScript |
| Base de Datos | PostgreSQL (Neon Serverless) |
| Autenticación | JWT (Access + Refresh tokens) |
| Imágenes | Cloudinary CDN |
| Hosting | Vercel Serverless |
| Gráficos | Recharts |
| Validación | Zod |
| Estado | Zustand |

## Estructura del Proyecto

```
hofra-stock/
├── frontend/           # React + Vite + TypeScript
├── backend/            # Express + TypeScript
├── shared/             # Tipos y validaciones compartidas
├── database/           # Scripts SQL (schema, seeds)
├── docs/               # Documentación técnica
├── api/                # Entry point para Vercel Serverless
├── package.json        # Root package con workspaces
└── vercel.json         # Configuración de deployment
```

## Inicio Rápido

### Prerrequisitos

- Node.js 18+
- PostgreSQL (o cuenta en Neon)
- Cuenta en Cloudinary (opcional, para imágenes)

### Instalación

1. Clonar el repositorio:
```bash
git clone <repository-url>
cd hofra-stock
```

2. Instalar dependencias:
```bash
npm install
```

3. Configurar variables de entorno:
```bash
cp .env.example .env
# Editar .env con tus credenciales
```

4. Crear la base de datos:
```bash
npm run db:migrate
npm run db:seed
```

5. Iniciar en desarrollo:
```bash
npm run dev
```

El frontend estará en http://localhost:5173 y el backend en http://localhost:3000.

### Usuario por defecto

- **Email**: admin@hofra.com
- **Contraseña**: Admin123!

## Scripts Disponibles

```bash
# Desarrollo
npm run dev              # Inicia frontend y backend
npm run dev:frontend     # Solo frontend
npm run dev:backend      # Solo backend

# Base de datos
npm run db:migrate       # Ejecuta migraciones
npm run db:seed          # Carga datos iniciales

# Build
npm run build            # Build de producción
npm run typecheck        # Verifica tipos
npm run lint             # Ejecuta linter
```

## API Endpoints

Ver [docs/api.md](docs/api.md) para la documentación completa de la API.

### Resumen de endpoints principales:

| Módulo | Endpoint Base | Descripción |
|--------|---------------|-------------|
| Auth | `/api/auth` | Login, logout, refresh token |
| Usuarios | `/api/usuarios` | Gestión de usuarios |
| Roles | `/api/roles` | Gestión de roles y permisos |
| Rubros | `/api/rubros` | Categorías de artículos |
| Clientes | `/api/clientes` | Gestión de clientes |
| Proveedores | `/api/proveedores` | Gestión de proveedores |
| Artículos | `/api/articulos` | Gestión de inventario |
| Stock | `/api/stock` | Reposiciones y entregas |
| Dashboard | `/api/dashboard` | Estadísticas |
| Auditoría | `/api/audit` | Logs de auditoría |

## Roles y Permisos

| Rol | Permisos |
|-----|----------|
| Administrador | Acceso completo |
| Compras | Proveedores, Reposiciones, ver Artículos |
| Depósito | Clientes, Entregas, Artículos |
| Consulta | Solo lectura (excepto usuarios/roles) |

## Deployment

El proyecto está configurado para deployment en Vercel:

1. Conectar repositorio a Vercel
2. Configurar variables de entorno en Vercel Dashboard
3. Deploy automático en cada push a main

Ver [docs/deployment.md](docs/deployment.md) para instrucciones detalladas.

## Licencia

Proyecto privado - Grupo Hofra © 2024

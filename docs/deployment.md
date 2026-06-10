# Deployment Guide

## Vercel Deployment

El proyecto está configurado para deployment en Vercel con:
- Frontend: Vite build estático
- Backend: Serverless Functions

### Configuración

El archivo `vercel.json` ya está configurado:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "frontend/dist",
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api" }
  ],
  "functions": {
    "api/index.ts": {
      "memory": 1024,
      "maxDuration": 10
    }
  }
}
```

### Pasos para Deploy

1. **Crear cuenta en Vercel** (si no tienes)
   - https://vercel.com

2. **Conectar repositorio**
   - Import Project desde GitHub/GitLab/Bitbucket
   - Seleccionar el repositorio `hofra-stock`

3. **Configurar variables de entorno**

   En Vercel Dashboard > Settings > Environment Variables:

   | Variable | Valor |
   |----------|-------|
   | `DATABASE_URL` | `postgresql://user:pass@ep-xxx.neon.tech/hofra_stock?sslmode=require` |
   | `JWT_SECRET` | String aleatorio de 32+ caracteres |
   | `JWT_REFRESH_SECRET` | String aleatorio de 32+ caracteres |
   | `CLOUDINARY_CLOUD_NAME` | Tu cloud name |
   | `CLOUDINARY_API_KEY` | Tu API key |
   | `CLOUDINARY_API_SECRET` | Tu API secret |
   | `FRONTEND_URL` | `https://tu-dominio.vercel.app` |
   | `NODE_ENV` | `production` |

4. **Deploy**
   - Vercel detectará la configuración automáticamente
   - Cada push a `main` triggerea un nuevo deploy

### Base de Datos en Neon

1. **Crear cuenta en Neon**
   - https://neon.tech

2. **Crear proyecto**
   - Region: us-east-1 (más cercano a Vercel)
   - Nombre: hofra-stock

3. **Obtener connection string**
   - Dashboard > Connection Details
   - Copiar "Connection string"

4. **Ejecutar migraciones**
   ```bash
   # Localmente con la DATABASE_URL de producción
   DATABASE_URL="postgresql://..." npm run db:migrate
   DATABASE_URL="postgresql://..." npm run db:seed
   ```

### Cloudinary

1. **Crear cuenta gratuita**
   - https://cloudinary.com

2. **Obtener credenciales**
   - Dashboard > Account Details
   - Cloud name, API Key, API Secret

3. **Configurar carpeta**
   - Las imágenes se guardan en `hofra-stock/articulos/`

## Monitoreo

### Vercel Dashboard
- Logs de funciones serverless
- Métricas de uso
- Errores y deployments

### Logs
- En desarrollo: console del terminal
- En producción: Vercel Functions Logs

## Troubleshooting

### Error de conexión a base de datos
- Verificar que la IP de Vercel esté permitida en Neon
- Neon por defecto permite todas las IPs

### Timeout en funciones
- Límite de 10 segundos configurado
- Optimizar queries si hay timeouts

### Imágenes no cargan
- Verificar credenciales de Cloudinary
- Verificar que el folder existe

### Build falla
- Verificar que todas las dependencias estén en package.json
- Verificar tipos de TypeScript

## Rollback

En Vercel Dashboard:
- Deployments > Seleccionar deployment anterior > "Promote to Production"

## Custom Domain

1. En Vercel: Settings > Domains
2. Agregar dominio personalizado
3. Configurar DNS según instrucciones
4. Actualizar `FRONTEND_URL` en variables de entorno

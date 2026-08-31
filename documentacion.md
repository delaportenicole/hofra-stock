# Documentación del Sistema de Gestión de Stock - Grupo Hofra

## Resumen del Proyecto

Sistema completo de gestión de inventario con arquitectura monorepo, desarrollado con:
- **Frontend**: React 18 + Vite 4 + TypeScript + Tailwind CSS
- **Backend**: Express + TypeScript
- **Base de Datos**: PostgreSQL (Supabase)
- **Autenticación**: JWT con access/refresh tokens

---

## Estructura del Proyecto

```
hofra-stock/
├── frontend/           # React + Vite + TypeScript
├── backend/            # Express + TypeScript
├── shared/             # Tipos y validadores compartidos
├── database/           # Scripts SQL y migraciones
└── docs/               # Documentación técnica
```

---

## Módulos Implementados

### 1. Autenticación
- **Login con username** (no email)
- Refresh tokens con JWT
- Middleware de autenticación
- Sistema de permisos por roles

### 2. Artículos
- **Campos**: código (autogenerado), nombre, rubro, proveedor, stock, stockMinimo, presentación (texto libre), marca, SKU, ETM, stockActual, ubicación, url, imagen, costoInicialEstimado, valorDolarCostoInicial, costoInicialEstimadoUsd, activo
- CRUD completo
- **Búsqueda avanzada**: Permite buscar por código, nombre, SKU o ETM
- Subida de imágenes (Cloudinary o local)
- Historial de movimientos
- **Valuación de stock** con detalle por capas (ver sección 11. Valuación FIFO)
- **Código autogenerado**: Al crear un artículo, el código se genera automáticamente basado en el **prefijo del rubro**:
  - Cada rubro tiene un campo "Prefijo" (solo letras, ej: "ELE" para Electrónica)
  - El código es: PREFIJO + "-" + número secuencial (ej: ELE-0001, ELE-0002)
  - Cada rubro tiene su propia secuencia numérica

### 3. Rubros
- **Ubicación**: Tab dentro del módulo **Configuraciones** (`/configuraciones`)
- **Campos**: nombre, descripción, prefijo, activo
- **Prefijo**: Campo obligatorio, solo letras (A-Z), se convierte automáticamente a mayúsculas
- El prefijo se usa para generar el código de los artículos de ese rubro
- CRUD completo vía modal
- Ordenamiento alfabético
- Usado como categoría de artículos

### 4. Clientes
- **Campos**: razónSocial, cuit, dirección, teléfono, email, contacto, notas, activo
- CRUD completo
- Búsqueda por razón social o CUIT
- Campo de notas para información interna

### 5. Proveedores
- **Campos**: razónSocial, nombreFantasia, cuit (opcional), dirección, teléfono, email, contacto, notas, activo
- CRUD completo
- CUIT es opcional
- Nombre de Fantasía agregado
- Campo de notas para información interna

### 6. Entregas (Multi-Artículo)

Una entrega puede contener múltiples artículos, similar a un ticket de supermercado.

#### Estructura
- **Cabecera de Entrega**: clienteId, numeroCotizacionInterna, purchaseOrder, observaciones, fechaEntrega, estado
- **Items de Entrega**: articuloId, cantidad (uno o más por entrega)

#### Estados
- **`en_curso`**: Entrega creada pero no confirmada. El stock NO se descuenta.
- **`confirmada`**: Entrega confirmada. El stock se descuenta usando método FIFO.
- **`cancelada`**: Entrega cancelada. Si estaba confirmada, el stock se restaura.

#### Campos por Entrega
- **Cliente**: Obligatorio, se selecciona una vez
- **N° Cotización Interna**: Obligatorio, debe comenzar con # (ej: #12345)
- **Purchase Order**: Opcional, número de orden de compra del cliente (ej: PO-12345)
- **Observaciones**: Opcional, al final del formulario
- **Artículos**: Lista de artículos con sus cantidades

#### Flujo de Creación
1. Seleccionar cliente
2. Ingresar número de cotización interna
3. Opcionalmente ingresar Purchase Order
4. Agregar artículos usando:
   - **Búsqueda por código**: Ingresar código del artículo y presionar Enter (más rápido)
   - **Dropdown**: Seleccionar de la lista desplegable
5. Los artículos se muestran en una tabla tipo ticket
6. Se puede modificar cantidad o eliminar artículos del ticket
7. Agregar observaciones (opcional)
8. Registrar entrega

#### Búsqueda por Código
- Campo de búsqueda con icono de lupa
- Se convierte automáticamente a mayúsculas
- Busca coincidencias exactas o parciales
- Al encontrar el artículo, lo selecciona automáticamente
- El foco se mueve al campo de cantidad para agilizar el ingreso

#### Comportamiento
- Al **crear**: La entrega queda en estado `en_curso`, el stock NO se modifica
- Al **confirmar**: Descuenta automáticamente el stock de cada artículo usando **método FIFO**
  - El stock se descuenta de las reposiciones más antiguas primero
  - Validación de stock suficiente por cada artículo
- Al **cancelar desde `en_curso`**: El stock NO se modifica
- Al **cancelar desde `confirmada`**: El stock se restaura
- **Edición**: Solo disponible para entregas en estado `en_curso`
- Registro en auditoría para todas las operaciones

### 7. Reposiciones
- **Campos**: articuloId, proveedorId, cantidad, stockDisponible, observaciones, fechaReposicion, costoReposicion (requerido), valorDolarOficial (requerido), costoReposicionDolares (autocalculado), fechaVencimiento, lotePartida, linkCompra, lugarCompra, estado
- **Campos obligatorios**: articulo, proveedor, cantidad, costo de reposicion, valor dolar oficial
- **Campos opcionales**: lote/partida, fecha vencimiento, lugar de compra, link de compra, observaciones
- **Stock Disponible**: Cantidad de esta reposición aún en inventario (para valuación FIFO)
- **Costos clarificados en UI**:
  - "Costo Unitario por Artículo (ARS)" - Costo por unidad
  - "Importe Total de Reposición" = cantidad × costo unitario (panel de resumen)
- Registro de reposiciones de stock con trazabilidad completa
- Calculo automatico del costo en dolares
- Alertas visuales para productos vencidos o proximos a vencer
- Vinculacion con el detalle del articulo para ver historial de reposiciones
- **Estados**: `en_curso` (default), `confirmada` o `cancelada`
- **Flujo de estados**:
  - Al crear una reposicion: estado `en_curso`, **stock NO se modifica**
  - Al confirmar: estado `confirmada`, **stock se incrementa**
  - Al cancelar desde `en_curso`: estado `cancelada`, **stock NO se modifica**
  - Al cancelar desde `confirmada`: estado `cancelada`, **stock se descuenta**
- **Acciones disponibles**:
  - **Ver**: Detalle completo de la reposicion (`/reposiciones/:id`)
  - **Editar**: Modificar proveedor, costos, lote, vencimiento, lugar/link de compra (`/reposiciones/:id/editar`) - Solo en estado `en_curso`
  - **Confirmar**: Cambia estado a `confirmada` e incrementa stock - Solo en estado `en_curso`
  - **Cancelar**: Cambia estado a `cancelada` y descuenta stock solo si estaba `confirmada`
- Las reposiciones canceladas no pueden editarse ni confirmarse
- Todas las reposiciones (en_curso, confirmada, cancelada) se muestran en el historial del articulo
- **Busqueda por Codigo Interno**: En el formulario de nueva reposicion:
  - Campo de busqueda para ingresar el codigo del articulo directamente
  - Busqueda exacta (case-insensitive)
  - Soporta Enter para buscar rapidamente
  - Al encontrar, selecciona automaticamente el articulo y su proveedor asociado
  - **Sincronización bidireccional**: El campo de código y el dropdown se actualizan mutuamente
- **Dropdown ordenado alfabeticamente**: Los articulos se muestran ordenados de A-Z por nombre
- **Layout optimizado**: Código y Artículo en la misma fila, Proveedor y Cantidad en la siguiente
- **Búsqueda en grilla**: Buscar reposiciones por código, nombre o descripción del artículo
- **Historial de Cambios**: En la vista de detalle se muestra el historial completo de cambios:
  - Fecha y hora de cada cambio
  - Usuario que realizo el cambio
  - Tipo de accion (Creacion, Actualizacion)
  - Campos modificados con valores anteriores y nuevos
  - Registro de cambios de estado y afectacion de stock
- Registro en auditoria

### 8. Dashboard

Panel principal con estadísticas del sistema.

#### Tarjetas de Estadísticas
- **Total Artículos**: Cantidad de artículos activos
- **Stock Bajo**: Artículos con stock <= stock mínimo (alerta visual si > 0)
- **Valuación del Stock**: Valor total del inventario en ARS y USD
- **Entregas del Mes**: Cantidad de entregas realizadas en el mes actual
- **Reposiciones del Mes**: Cantidad de reposiciones del mes actual

#### Gráficos
- **Movimientos por Mes**: Gráfico de barras comparando entregas vs reposiciones (últimos 6 meses)
- **Artículos por Rubro**: Gráfico de torta mostrando distribución de artículos por rubro

#### Tablas
- **Artículos con Stock Bajo**: Lista de los 5 artículos más críticos con link al detalle
- **Movimientos Recientes**: Últimas 5 entregas y reposiciones

#### Cálculo de Valuación
La valuación total del stock se calcula sumando:
1. Stock disponible de reposiciones confirmadas × costo unitario
2. Stock sin reposición × costo inicial estimado (si está definido)

### 10. Usuarios

Módulo de administración de usuarios del sistema.

#### Acceso
- Menú lateral: **Usuarios** (sección Administración)
- URL: `/usuarios`
- Requiere permiso: `usuarios:leer`

#### Funcionalidades
- **Lista de usuarios** con avatar, nombre, email, roles asignados y último acceso
- **Búsqueda** por nombre o email
- **Paginación** de resultados
- **Crear usuario**: nombre, email, contraseña, roles
- **Editar usuario**: modificar datos y roles (contraseña no se edita aquí)
- **Resetear contraseña**: Los administradores pueden establecer una nueva contraseña
- **Eliminar usuario**: Soft delete (marca como eliminado)

#### Campos del Usuario
- **Nombre**: Nombre del usuario (requerido)
- **Apellido**: Apellido del usuario (requerido)
- **Username**: Nombre de usuario único para login (requerido, 3-50 caracteres, solo letras, números, puntos, guiones)
- **Email**: Email del usuario (requerido)
- **Contraseña**: Solo en creación (requerido, mínimo 8 caracteres)
- **Roles**: Uno o más roles del sistema

#### API
```
GET    /api/usuarios              # Lista paginada con búsqueda
GET    /api/usuarios/:id          # Ver detalle
POST   /api/usuarios              # Crear usuario
PUT    /api/usuarios/:id          # Actualizar usuario
DELETE /api/usuarios/:id          # Eliminar (soft delete)
POST   /api/usuarios/:id/reset-password  # Resetear contraseña
```

#### Archivos Frontend
- `frontend/src/pages/usuarios/UsuariosList.tsx`: Lista de usuarios
- `frontend/src/pages/usuarios/UsuarioForm.tsx`: Formulario crear/editar
- `frontend/src/pages/usuarios/ResetPasswordModal.tsx`: Modal para resetear contraseña
- `frontend/src/services/usuarios.service.ts`: Llamadas API

---

### 11. Roles y Permisos

Módulo de gestión de roles y sus permisos asociados.

#### Acceso
- Menú lateral: **Roles** (sección Administración)
- URL: `/roles`
- Requiere permiso: `roles:leer`

#### Funcionalidades
- **Lista de roles** con cantidad de módulos y permisos asignados
- **Crear rol**: nombre, descripción, selección de permisos
- **Editar rol**: modificar nombre, descripción y permisos
- **Eliminar rol**: Solo roles personalizados (no del sistema)

#### Roles del Sistema
- **Administrador**: Rol protegido con todos los permisos, no se puede eliminar

#### Estructura de Permisos
Los permisos se organizan por **módulo** y **acción**:
- **Módulos**: dashboard, articulos, rubros, clientes, proveedores, entregas, reposiciones, usuarios, roles, auditoria, solicitudes_cotizacion
- **Acciones**: leer, crear, actualizar, eliminar

#### Interfaz de Selección de Permisos
- Permisos agrupados por módulo (cards expandibles)
- Checkbox por módulo para seleccionar/deseleccionar todos sus permisos
- Botones de acciones como chips seleccionables
- Contadores de permisos seleccionados por módulo
- Botones globales: "Seleccionar todos" / "Limpiar"

#### API
```
GET    /api/roles                  # Lista todos los roles con permisos
GET    /api/roles/:id              # Ver rol con permisos
POST   /api/roles                  # Crear rol
PUT    /api/roles/:id              # Actualizar rol
DELETE /api/roles/:id              # Eliminar rol
GET    /api/permisos               # Lista todos los permisos disponibles
```

#### Archivos Frontend
- `frontend/src/pages/roles/RolesList.tsx`: Lista de roles
- `frontend/src/pages/roles/RoleForm.tsx`: Formulario crear/editar con selector de permisos
- `frontend/src/services/roles.service.ts`: Llamadas API

---

### 12. Auditoría

Módulo para visualizar el registro de movimientos de Artículos, Entregas y Reposiciones.

#### Acceso
- Menú lateral: **Auditoría** (sección Administración)
- URL: `/auditoria`
- Requiere permiso: `auditoria:leer`

#### Entidades Auditadas
El sistema registra automáticamente las operaciones sobre:
- **Artículos**: Creación, actualización y eliminación
- **Entregas**: Creación de entregas (descuento de stock)
- **Reposiciones**: Creación, actualización, confirmación y cancelación

**NO se auditan**: Clientes, Proveedores, Configuraciones (Rubros, Marcas), Usuarios, Roles.

#### Funcionalidades
- **Listado de eventos** con fecha, usuario, acción y módulo afectado
- **Filtros avanzados**:
  - Por usuario (dropdown)
  - Por tipo de acción (Creación, Actualización, Eliminación)
  - Por módulo (Artículos, Entregas, Reposiciones)
  - Por rango de fechas (desde/hasta)
- **Filas expandibles** para ver comparación antes/después
- **Paginación** de resultados

#### Información Registrada
Cada evento de auditoría contiene:
- **Fecha y hora** del evento
- **Usuario** que realizó la acción
- **Tipo de acción**: crear, actualizar, eliminar
- **Módulo** afectado (Artículos, Entregas, Reposiciones)
- **ID de registro** (UUID del elemento modificado)
- **Estado anterior** (valores antes del cambio)
- **Estado nuevo** (valores después del cambio)

#### Detalle Expandible
Al hacer click en el botón de detalle, se muestra una tabla comparativa:
- **Campo**: Nombre del campo modificado
- **Estado Anterior**: Valor antes del cambio (indicador rojo)
- **Estado Nuevo**: Valor después del cambio (indicador verde)
- Los campos que cambiaron se resaltan visualmente

#### Ejemplos de Auditoría
- **Crear artículo**: Muestra todos los campos del nuevo artículo
- **Actualizar artículo**: Muestra campos antes y después, resaltando cambios
- **Crear entrega**: Muestra cliente, cotización, items entregados
- **Confirmar reposición**: Muestra cambio de estado y stock incrementado
- **Cancelar reposición**: Muestra cambio de estado y stock descontado (si aplica)

#### API
```
GET /api/audit                    # Lista paginada con filtros
    ?page=1
    &limit=10
    &usuarioId=uuid
    &accion=crear|actualizar|eliminar
    &entidad=articulos                      # Filtro por una entidad
    &entidades=articulos&entidades=entregas # Filtro por múltiples entidades
    &fechaDesde=2024-01-01
    &fechaHasta=2024-12-31
```

**Nota**: El filtrado por entidades se realiza en el backend para garantizar paginación correcta.

---

### 13. Importación de Artículos

Módulo para importar artículos masivamente desde archivos Excel.

#### Acceso
- Menú lateral: **Importar** (sección Operaciones)
- URL: `/importar`
- Requiere permiso: `articulos:crear`

#### Formato del Archivo Excel

| Columna | Campo | Notas |
|---------|-------|-------|
| A - Nombre | nombre | **Requerido** |
| B - Marca | marca | Se crea automáticamente si no existe |
| C - Codigo | codigo | Opcional, se genera automáticamente si está vacío |
| D - SKU | sku | |
| E - ETM | etm | |
| F - Presentacion | presentacion | |
| G - Stock Actual | stockActual | |
| H - Stock Mínimo | stockMinimo | Si es 0, el artículo se crea como **inactivo** |
| I - Costo Inicial | costoInicialEstimado | En pesos argentinos |
| J - Costo USD | costoInicialEstimadoUsd | Costo inicial en dólares |
| K - Proveedor | proveedor | Se crea automáticamente si no existe |
| L - URL | url | Link de referencia del producto (ej: Mercado Libre) |
| M - Rubro | rubro | **Requerido**, se crea automáticamente si no existe |
| N - Ubicacion | ubicacion | |

#### Flujo de Importación

1. **Subir archivo**: Arrastrar o seleccionar archivo Excel (.xlsx, .xls)
2. **Preview**: El sistema muestra:
   - Cantidad de artículos a importar
   - Rubros que se crearán (nuevos)
   - Marcas que se crearán (nuevas)
   - Proveedores que se crearán (nuevos)
   - Vista previa de los datos en tabla
3. **Confirmar importación**: Procesa los artículos en lotes de 20
4. **Resultado**: Muestra resumen con:
   - Total procesados
   - Importados exitosamente
   - Omitidos (errores)
   - Rubros, marcas y proveedores creados
   - Lista de errores si los hay

#### Reglas de Importación

- **Nombre vacío**: El artículo se omite
- **Rubro vacío**: El artículo se omite
- **Stock negativo**: Se convierte a 0
- **Stock Mínimo = 0**: El artículo se crea como **inactivo** (`activo = false`)
- **Código no proporcionado**: Se genera automáticamente basado en el prefijo del rubro
- **Código proporcionado**: Se usa el código del Excel tal cual

#### API
```
POST /api/importar/preview    # Vista previa de importación
POST /api/importar/execute    # Ejecutar importación
```

#### Archivos
- `backend/src/services/importar.service.ts`
- `frontend/src/pages/importar/ImportarPage.tsx`
- `frontend/src/services/importar.service.ts`

#### Archivos
**Backend**:
- `backend/src/middlewares/audit.ts`: Middleware de auditoría con captura de estado anterior/nuevo
- `backend/src/routes/stock.routes.ts`: Rutas con middleware de auditoría
- `backend/src/routes/articulo.routes.ts`: Rutas con middleware de auditoría

**Frontend**:
- `frontend/src/pages/auditoria/AuditoriaList.tsx`: Página de auditoría con filtros y tabla expandible

---

### 13. Configuraciones

Módulo centralizado para gestionar configuraciones del sistema: unidades de medida, presentaciones y rubros.

#### Acceso
- Menú lateral: **Configuraciones** (icono de engranaje)
- URL: `/configuraciones`

#### Interfaz
El módulo utiliza una interfaz con pestañas (tabs):
- **Rubros**: Categorías de artículos con prefijo para código automático
- **Marcas**: Marcas de productos (Stanley, 3M, Bosch, etc.)

#### Rubros
- **Campos**: nombre, prefijo (solo letras), descripción, activo
- CRUD completo vía modal
- El prefijo se usa para generar códigos de artículos (ej: ELE-0001 para rubro "Electrónica" con prefijo "ELE")
- **Actualización automática de códigos**: Al cambiar el prefijo, todos los artículos del rubro se actualizan
- Se muestran solo los activos en dropdowns de artículos

#### Marcas
- **Campos**: nombre, descripción, activo
- CRUD completo vía modal en tab "Marcas" de Configuraciones
- **Creación dinámica**: Las marcas se pueden crear directamente desde el formulario de Artículos
- **Combobox con autocompletado**: El campo Marca en Artículos permite:
  - Escribir para filtrar marcas existentes
  - Ver sugerencias mientras se escribe
  - Crear nueva marca con botón "+" si no existe
- **Endpoint `findOrCreate`**: Crea la marca si no existe, o retorna la existente
- Migración automática de marcas existentes desde artículos

#### API

```
GET    /api/unidades-medida           # Lista paginada
GET    /api/unidades-medida/active    # Solo activas (para dropdowns)
GET    /api/unidades-medida/:id       # Ver detalle
POST   /api/unidades-medida           # Crear
PUT    /api/unidades-medida/:id       # Actualizar
DELETE /api/unidades-medida/:id       # Eliminar (soft delete)

GET    /api/presentaciones            # Lista paginada
GET    /api/presentaciones/active     # Solo activas (para dropdowns)
GET    /api/presentaciones/:id        # Ver detalle
POST   /api/presentaciones            # Crear
PUT    /api/presentaciones/:id        # Actualizar
DELETE /api/presentaciones/:id        # Eliminar (soft delete)

GET    /api/rubros                    # Lista paginada
GET    /api/rubros/active             # Solo activos (para dropdowns)
GET    /api/rubros/:id                # Ver detalle
POST   /api/rubros                    # Crear
PUT    /api/rubros/:id                # Actualizar
DELETE /api/rubros/:id                # Eliminar (soft delete)

GET    /api/marcas                    # Lista paginada
GET    /api/marcas/active             # Solo activas (para dropdowns)
GET    /api/marcas/:id                # Ver detalle
POST   /api/marcas                    # Crear
POST   /api/marcas/find-or-create    # Buscar o crear (para creación dinámica)
PUT    /api/marcas/:id                # Actualizar
DELETE /api/marcas/:id                # Eliminar (soft delete)
```

#### Archivos Relacionados

**Backend**:
- `backend/src/repositories/unidadMedida.repository.ts`
- `backend/src/repositories/presentacion.repository.ts`
- `backend/src/repositories/rubro.repository.ts`
- `backend/src/repositories/marca.repository.ts`
- `backend/src/services/unidadMedida.service.ts`
- `backend/src/services/presentacion.service.ts`
- `backend/src/services/rubro.service.ts`
- `backend/src/services/marca.service.ts`
- `backend/src/controllers/unidadMedida.controller.ts`
- `backend/src/controllers/presentacion.controller.ts`
- `backend/src/controllers/rubro.controller.ts`
- `backend/src/controllers/marca.controller.ts`
- `backend/src/routes/unidadMedida.routes.ts`
- `backend/src/routes/presentacion.routes.ts`
- `backend/src/routes/rubro.routes.ts`
- `backend/src/routes/marca.routes.ts`

**Frontend**:
- `frontend/src/pages/unidades/UnidadesList.tsx` (página principal con tabs)
- `frontend/src/pages/unidades/UnidadMedidaModal.tsx`
- `frontend/src/pages/unidades/PresentacionModal.tsx`
- `frontend/src/pages/unidades/RubroModal.tsx`
- `frontend/src/pages/unidades/MarcaModal.tsx`
- `frontend/src/services/unidadesMedida.service.ts`
- `frontend/src/services/presentaciones.service.ts`
- `frontend/src/services/rubros.service.ts`
- `frontend/src/services/marcas.service.ts`
- `frontend/src/components/FormField.tsx` (incluye componente Combobox)

---

### 14. Sugerencias

Módulo para registrar sugerencias de mejoras al sistema, accesible para todos los usuarios.

#### Acceso
- Menú lateral: **Sugerencias** (sección Administración)
- URL: `/sugerencias`
- **Sin restricción de permisos** - todos los usuarios autenticados pueden acceder

#### Funcionalidades
- **Lista de sugerencias** con filtros por estado y prioridad
- **Crear sugerencia**: título, descripción, prioridad
- **Editar sugerencia**: modificar datos y estado
- **Eliminar sugerencia**: soft delete

#### Campos
- **Título**: Nombre corto de la sugerencia (obligatorio)
- **Descripción**: Detalle de la mejora propuesta (obligatorio)
- **Prioridad**: Alta (rojo), Media (amarillo), Baja (gris)
- **Estado**: Nueva, En Progreso, Resuelta, Cancelada

#### API
```
GET    /api/sugerencias              # Lista paginada con filtros
GET    /api/sugerencias/:id          # Ver detalle
POST   /api/sugerencias              # Crear sugerencia
PUT    /api/sugerencias/:id          # Actualizar sugerencia
DELETE /api/sugerencias/:id          # Eliminar (soft delete)
```

#### Archivos Relacionados
**Backend**:
- `backend/src/repositories/sugerencia.repository.ts`
- `backend/src/services/sugerencia.service.ts`
- `backend/src/controllers/sugerencia.controller.ts`
- `backend/src/routes/sugerencia.routes.ts`

**Frontend**:
- `frontend/src/pages/sugerencias/SugerenciasList.tsx`
- `frontend/src/pages/sugerencias/SugerenciaForm.tsx`
- `frontend/src/services/sugerencias.service.ts`

**Migración**:
- `database/migrations/014_add_sugerencias.sql`

---

### 15. Reportes

Módulo para generar y exportar reportes del sistema, ubicado en la sección de Administración.

#### Acceso
- Menú lateral: **Reportes** (sección Administración)
- URL: `/reportes`
- Requiere permiso: `reportes:leer`

#### Reportes Disponibles

**1. Entregas por Cliente**
- Muestra las entregas agrupadas por cliente para un mes específico
- Datos: razón social, total entregas, total artículos
- Detalle expandible: fecha, N° cotización, cantidad de artículos por entrega
- Filtros: mes y año

**2. Reposiciones por Proveedor**
- Muestra las reposiciones agrupadas por proveedor para un mes específico
- Datos: razón social, total reposiciones, total artículos, costo total ARS/USD
- Detalle expandible: fecha, artículo, cantidad, costo por reposición
- Filtros: mes y año
- Solo muestra reposiciones confirmadas

**3. Proveedores por Artículo**
- Muestra qué proveedores han suministrado cada artículo (histórico)
- Datos: código, nombre del artículo, cantidad de proveedores
- Detalle expandible: proveedor, total reposiciones, última reposición, costo promedio
- Sin filtro de fechas (datos históricos completos)

**4. Artículos por Proveedor**
- Muestra qué artículos ha suministrado cada proveedor (histórico)
- Datos: razón social del proveedor, cantidad de artículos
- Detalle expandible: código, nombre, total reposiciones, cantidad total, última reposición
- Sin filtro de fechas (datos históricos completos)

#### Resumen Anual
- Grilla de comparación mensual visible en los reportes filtrados por fecha
- Muestra para cada mes: entregas, reposiciones, costos ARS/USD
- Click en un mes para seleccionarlo como filtro
- Mes actual resaltado

#### Exportación
- Botón "Exportar CSV" disponible en todos los reportes
- Genera archivo descargable con los datos del reporte actual
- Nombre del archivo incluye tipo de reporte, mes y año

#### API

```
GET /api/reportes/entregas-por-cliente?mes=6&anio=2026
GET /api/reportes/reposiciones-por-proveedor?mes=6&anio=2026
GET /api/reportes/proveedores-por-articulo
GET /api/reportes/articulos-por-proveedor
GET /api/reportes/resumen-mensual?anio=2026
```

#### Archivos Relacionados

**Backend**:
- `backend/src/services/reportes.service.ts`
- `backend/src/controllers/reportes.controller.ts`
- `backend/src/routes/reportes.routes.ts`

**Frontend**:
- `frontend/src/pages/reportes/ReportesPage.tsx`
- `frontend/src/services/reportes.service.ts`

**Migración**:
- `database/migrations/012_add_reportes_permission.sql`

---

### 16. Solicitudes de Cotización

Módulo para procesar archivos de solicitud de cotización que envían los clientes: matchea automáticamente cada ítem pedido contra el catálogo propio, permite revisar/corregir esa sugerencia y termina generando una cotización imprimible para responder al cliente.

#### Acceso
- Menú lateral: **Solicitudes de Cotización** (sección principal, junto a Artículos)
- URL: `/solicitudes-cotizacion`
- Requiere permiso: `solicitudes_cotizacion:leer` (crear/actualizar/eliminar también existen como permisos separados)

#### Flujo General
1. **Subir archivo**: El usuario sube un Excel del cliente y selecciona el Cliente destinatario (obligatorio) y un N° de Referencia del Cliente (opcional)
2. **Matching automático**: El backend intenta encontrar, para cada fila, el artículo correspondiente en el catálogo propio
3. **Revisión ítem por ítem**: Pantalla de detalle donde se ve lo *solicitado* vs. lo *sugerido*, y se decide qué hacer con cada ítem
4. **Precio y cotización**: Se carga el precio de venta unitario por ítem y se marca la solicitud como Cotizada
5. **Impresión**: Se genera un comprobante de cotización para el cliente (sin exponer código interno ni costos)

#### Formato del Archivo Excel
Las columnas se detectan **por nombre de encabezado** en la primera fila (no por posición fija), para tolerar archivos con columnas extra intercaladas (Precio, Moneda, Modelo, Descripción en Inglés, etc.):

| Encabezado | Campo | Notas |
|------------|-------|-------|
| ETM | etmSolicitado | Opcional, se usa para matchear contra el ETM del catálogo |
| DESCRIPCION | descripcionSolicitada | **Requerido** |
| DESCRIPCION EN INGLES | descripcionInglesSolicitada | Opcional, se usa solo al exportar la cotización final |
| CANTIDAD | cantidadSolicitada | **Requerido**, debe ser mayor a 0 |
| MARCA | marcaSolicitada | Opcional |
| MODELO | modeloSolicitado | Opcional |

Filas sin Descripción o sin Cantidad válida se omiten (se informa la cantidad de filas omitidas).

#### Algoritmo de Matching (heurístico)
Por cada ítem del archivo, en `backend/src/services/solicitudCotizacion.service.ts`:
1. **Por ETM**: si el ítem trae ETM, se busca una coincidencia exacta (case-insensitive) contra `articulos.etm`. Si hay match → confianza `etm`
2. **Por nombre**: si no matcheó por ETM, se tokeniza la descripción (se descartan palabras cortas y stopwords) y se buscan artículos candidatos por esos tokens; se puntúa cada candidato por cantidad de palabras coincidentes en su nombre + bono si la marca coincide. Si supera un umbral mínimo → confianza `nombre`
3. **Sin match**: si ningún candidato supera el umbral → `sin_match`, el ítem queda sin artículo sugerido

El matching es solo una *sugerencia*: nunca se acepta automáticamente, siempre requiere una decisión manual en la pantalla de revisión.

#### Estados de la Solicitud
- **`en_revision`**: Recién creada, se están revisando/decidiendo los ítems
- **`cotizada`**: Todos los ítems fueron decididos y tienen precio cargado; ya se puede imprimir la cotización final
- **`cancelada`**: Solicitud cancelada, ya no se puede editar

#### Estados por Ítem
- **`pendiente`**: Recién matcheado, sin decisión del usuario
- **`aceptado`**: El usuario confirmó un artículo (la sugerencia del sistema o uno elegido a mano), o aceptó una URL externa como opción de compra
- **`no_disponible`**: No hay artículo interno asociado — porque se decidió comprarlo afuera (Mercado Libre o una URL pegada) o porque se marcó explícitamente como no disponible

No existe una columna "Estado" en la grilla: el estado de cada ítem se ve reflejado en las columnas Sugerido/Aceptado y en los indicadores de la parte superior de la pantalla (ver más abajo).

#### Indicadores (arriba de la grilla)
Cuatro tarjetas con conteos en tiempo real sobre los ítems de la solicitud:
- **Con Coincidencia** / **Sin Coincidencia**: según `matchConfianza` (etm/nombre vs. sin_match) — calidad del matching automático
- **Aceptados** / **Pendientes de Revisión**: según si el ítem ya salió de `pendiente` o no — progreso de la revisión

#### Pantalla de Revisión (por cada ítem)
- **Solicitado**: ETM, descripción, marca y cantidad tal como vinieron en el archivo (solo lectura)
- **Sugerido**: artículo matcheado por el sistema (código, nombre, marca, stock) con badge de confianza ("Coincide por ETM" / "Coincide por nombre"), o "Sin coincidencia". Si hay artículo, el nombre es un link que abre su detalle (`/articulos/:id`) en una pestaña nueva
- **Aceptado**: una vez confirmada una decisión, muestra el artículo del catálogo aceptado (en verde, también clickeable a su detalle), la compra externa aceptada (en ámbar, con link "Ver publicación"), o "No Disponible" si se marcó así sin una URL asociada. En los tres casos hay un botón **✕** para deshacer la decisión (vuelve a `pendiente` sin perder la sugerencia, la URL, o el artículo previamente elegido) y poder decidir de nuevo
- **Acciones disponibles**:
  - **Aceptar sugerencia**: confirma el artículo matcheado por el sistema (solo visible si el ítem todavía no está aceptado)
  - **Buscar otro artículo**: abre un combobox ancho para elegir manualmente otro artículo del catálogo (permite artículos sin stock, ya que es para cotizar, no para descontar stock); tiene un botón **✕** para cancelar la búsqueda sin elegir nada y volver a ver las demás opciones
  - **Buscar en Mercado Libre**: abre en una pestaña nueva una búsqueda en Mercado Libre armada solo con la **descripción** del ítem (no se usa marca ni ETM, para no ensuciar los resultados). Si el ítem no tiene ningún artículo matcheado, además lo marca como `no_disponible`; si ya hay una sugerencia del catálogo, es solo para comparar precio y no le pisa la sugerencia
  - **Marcar como No Disponible**: acción directa (con confirmación) para marcar el ítem como no disponible en cualquier momento, sin pasar por Mercado Libre
  - **Pegar URL de producto**: permite pegar el link de un producto externo (ej. una publicación de Mercado Libre) como opción de compra para ese ítem. Una vez guardada la URL, se puede **Aceptar** (marca el ítem como `no_disponible`, guarda la URL) o **Declinar** (la descarta)
- **Precio Unitario**: campo editable por ítem. Al aceptar un artículo del catálogo que tiene costo cargado (`costoInicialEstimado`) y el ítem todavía no tiene precio, se prellena con ese valor como punto de partida — siempre se puede sobreescribir a mano. La URL externa **no** trae precio automático; se carga siempre a mano
- **Subtotal**: cantidad × precio unitario (calculado)
- La grilla tiene ancho mínimo con scroll horizontal (columnas con `min-width` propio) para que ninguna columna quede cortada en pantallas chicas (ej. notebooks de 13")

#### Marcar como Cotizada
Solo se habilita cuando **todos** los ítems dejaron de estar `pendiente` y **todos** tienen precio unitario cargado. El backend valida esto antes de permitir el cambio de estado (`POST /solicitudes-cotizacion/:id/marcar-cotizada`).

#### Impresión de la Cotización
Botón "Imprimir Cotización" (mismo mecanismo que el comprobante de Entregas: HTML generado + `window.print()`). El documento muestra Descripción, Marca, Cantidad, Precio Unitario y Subtotal por ítem más el total — **no** incluye código interno, costos ni referencias a si el ítem viene de stock o se compra externamente, porque el documento va dirigido al cliente.

#### Sobre la Búsqueda en Mercado Libre
La API pública de Mercado Libre dejó de permitir búsquedas y consultas de productos sin autenticación OAuth desde abril de 2025 (confirmado: tanto `GET /sites/{site}/search` como `GET /items/{id}` devuelven 403 sin token). Por eso:
- La búsqueda abre Mercado Libre en una **pestaña nueva** con la búsqueda armada (no hay resultados embebidos en el sistema)
- **Embeber la página de Mercado Libre en un iframe no es viable**: el sitio manda headers `X-Frame-Options`/`Content-Security-Policy` que lo bloquean explícitamente, y ni siquiera el scraping server-side funciona (también devuelve 403, ML bloquea tráfico automatizado)
- El precio y la foto de un producto externo **no se traen automáticamente**: por eso el flujo de "Pegar URL" requiere cargar el precio a mano. Automatizarlo requeriría dar de alta una app en developers.mercadolibre.com.ar, autorizarla con una cuenta de ML y manejar tokens OAuth en el backend — quedó como mejora futura, no implementada

#### Exportar la Cotización (Excel y Google Sheets)

Desde la pantalla de detalle hay dos botones que generan el mismo documento final — una cotización con el formato que ya usaba Nicole a mano (columnas Solicitado / Item Ofrecido / Proveedor / Imagen / Costo-MarkUp-Venta / Precio Sin IVA / Total Sin IVA) — y comparten toda la lógica de armado en `backend/src/services/cotizacionExport.service.ts` (`buildCotizacionSheetData()`), para no duplicar nada entre los dos destinos:

- **"Exportar a Excel"**: genera un `.xlsx` real con `exceljs` (soporta fórmulas nativas) y lo descarga.
- **"Exportar a Google Sheets"**: crea la planilla directo en una cuenta de Google Drive conectada al sistema (vía Google Sheets API + Drive API) y la abre en una pestaña nueva — sin pasos manuales de descarga/subida.

**Mapeo de columnas** (fila de encabezados en la fila 6 del archivo generado):

| Columna | Contenido | Origen |
|---|---|---|
| ITEM, DESCRIPCION, DESCRIPCION EN INGLES, ETM, MARCA, MODELO, CANT | Lo solicitado por el cliente | Campos del ítem tal cual se importaron |
| Item Ofrecido - Descripción, Marca | Artículo aceptado del catálogo | `item.articulo.nombre` / `.marca` (vacío si no hay artículo) |
| Modelo (del ofrecido) | — | Siempre vacío, no se trackea; se completa a mano |
| Unidad de Medida | "Unidad" | Fijo, solo si hay artículo ofrecido |
| Imagen de lo Ofrecido | Fórmula `=IMAGE(url)` | `articulo.imagenUrl` (Cloudinary), si existe. Vacío para ítems comprados externamente (sin foto disponible) |
| Proveedor | Proveedor del artículo, o la URL externa | `articulo.proveedorNombre` si es de catálogo; `item.urlExterna` si el ítem es `no_disponible` con URL pegada |
| Costo por Unidad, Costo Total, Mark Up, Venta con IVA | — | Siempre en blanco (se completan a mano si se quiere el desglose) |
| Precio Unit. Sin IVA | `item.precioUnitario` | El sistema asume que ya es neto de IVA |
| Total Sin IVA | Fórmula `=Cantidad × Precio Sin Iva` | Se recalcula solo si se edita el precio o la cantidad en la planilla |

**Integración con Google (OAuth)**:
- Se conecta **una sola cuenta de Google** para todo el sistema (no por usuario) desde **Configuraciones → Google Drive**.
- Scopes usados: `drive.file` (solo archivos creados por la app, no todo el Drive) y `userinfo.email` (para mostrar con qué cuenta está conectado).
- El refresh token queda guardado en la tabla `google_integracion` (una sola fila; conectar una cuenta nueva reemplaza la anterior).
- Flujo: `GET /api/google/auth-url` arma el link de autorización → Google redirige a `GET /api/google/oauth/callback` → el backend intercambia el código por tokens y guarda el refresh token → redirige de vuelta a `/configuraciones?google=connected`.
- Google Sheets API y Drive API son gratuitas para este volumen de uso (no requieren cuenta de facturación; el límite gratuito es 500 requests/100s por proyecto).

#### Modelo de Datos

| Tabla | Campo | Notas |
|-------|-------|-------|
| solicitudes_cotizacion | `cliente_id`, `numero_referencia_cliente`, `nombre_archivo`, `fecha_solicitud`, `estado`, `observaciones` | Cabecera |
| solicitud_cotizacion_items | `solicitud_id`, `orden`, `etm_solicitado`, `descripcion_solicitada`, `descripcion_ingles_solicitada`, `marca_solicitada`, `modelo_solicitado`, `cantidad_solicitada`, `articulo_id`, `match_confianza`, `estado_item`, `precio_unitario`, `url_externa` | Detalle |
| google_integracion | `refresh_token`, `connected_email`, `connected_at` | Una sola fila: la cuenta de Google conectada para exportar |

#### API
```
GET    /api/solicitudes-cotizacion                       # Lista paginada con filtros (estado, clienteId, busqueda)
GET    /api/solicitudes-cotizacion/:id                    # Ver detalle con items y matching
POST   /api/solicitudes-cotizacion                        # Crear solicitud (corre el matching automático por ítem)
PUT    /api/solicitudes-cotizacion/:id                    # Actualizar cabecera (referencia, observaciones)
PUT    /api/solicitudes-cotizacion/:id/items/:itemId      # Actualizar un ítem (artículo, estado, precio, URL externa)
POST   /api/solicitudes-cotizacion/:id/marcar-cotizada    # Marca como cotizada (valida que no queden ítems pendientes/sin precio)
POST   /api/solicitudes-cotizacion/:id/cancelar           # Cancela la solicitud
GET    /api/solicitudes-cotizacion/:id/exportar-excel     # Descarga el .xlsx de la cotización
POST   /api/solicitudes-cotizacion/:id/exportar-google-sheets  # Crea el Google Sheet y devuelve su URL

GET    /api/google/auth-url    # URL de autorización de Google (requiere permiso solicitudes_cotizacion:actualizar)
GET    /api/google/oauth/callback  # Callback de Google (lo llama el navegador, no requiere JWT)
GET    /api/google/status      # Estado de conexión (conectado sí/no, con qué email)
```

#### Archivos Relacionados

**Backend**:
- `backend/src/repositories/solicitudCotizacion.repository.ts`
- `backend/src/services/solicitudCotizacion.service.ts` (incluye el algoritmo de matching)
- `backend/src/services/cotizacionExport.service.ts` (armado de la matriz de datos/fórmulas + generación del `.xlsx` con `exceljs`)
- `backend/src/services/google.service.ts` (OAuth2, creación del Google Sheet vía `googleapis`)
- `backend/src/repositories/googleIntegracion.repository.ts`
- `backend/src/controllers/solicitudCotizacion.controller.ts`, `backend/src/controllers/google.controller.ts`
- `backend/src/routes/solicitudCotizacion.routes.ts`, `backend/src/routes/google.routes.ts`
- `backend/src/repositories/articulo.repository.ts` (método `findByEtm()`)

**Frontend**:
- `frontend/src/pages/solicitudesCotizacion/SolicitudesCotizacionList.tsx`
- `frontend/src/pages/solicitudesCotizacion/SolicitudCotizacionUpload.tsx`
- `frontend/src/pages/solicitudesCotizacion/SolicitudCotizacionDetail.tsx`
- `frontend/src/services/solicitudesCotizacion.service.ts`
- `frontend/src/services/google.service.ts`
- `frontend/src/pages/unidades/UnidadesList.tsx` (tab "Google Drive" en Configuraciones)

**Migraciones**:
- `database/migrations/019_add_solicitudes_cotizacion.sql`
- `database/migrations/020_add_url_externa_solicitud_items.sql`
- `database/migrations/021_rename_a_comprar_a_no_disponible.sql`
- `database/migrations/022_add_modelo_descripcion_ingles_solicitud_items.sql`
- `database/migrations/023_add_google_integracion.sql`

---

### 11. Valuación de Stock (FIFO)

El sistema implementa una valuación de stock basada en el método **FIFO (First In, First Out)**, donde cada reposición mantiene su propio costo y cantidad disponible.

#### Conceptos Clave

**Capas de Stock**: Cada reposición confirmada es una "capa" con:
- Cantidad disponible (unidades aún en inventario)
- Costo unitario (precio pagado por unidad)
- Fecha de ingreso

**Método FIFO**: Al realizar entregas, se consumen primero las unidades de las reposiciones más antiguas.

**Stock Inicial Estimado**: Para artículos con stock preexistente (sin reposiciones), se puede asignar un "Costo Inicial Estimado" junto con el valor del dólar para incluirlo en la valuación tanto en ARS como en USD.

#### Campos de Base de Datos

| Tabla | Campo | Tipo | Descripción |
|-------|-------|------|-------------|
| reposiciones | `stock_disponible` | INTEGER | Unidades de esta reposición aún en inventario |
| articulos | `costo_inicial_estimado` | NUMERIC(12,2) | Costo unitario en ARS para stock sin reposición |
| articulos | `valor_dolar_costo_inicial` | NUMERIC(10,2) | Valor del dólar al momento de asignar el costo |
| articulos | `costo_inicial_estimado_usd` | NUMERIC(12,2) | Costo unitario en USD (auto-calculado) |

#### Flujo de Operaciones

**Al Confirmar Reposición**: `stock_disponible = cantidad`

**Al Crear Entrega (FIFO)**:
1. Obtener reposiciones con stock_disponible > 0 (ordenadas por fecha ASC)
2. Descontar de la más antigua primero
3. Actualizar stock_disponible de cada reposición afectada
4. Decrementar stock total del artículo

**Al Cancelar Reposición**: `stock_disponible = 0`

#### API de Valuación

```
GET /api/articulos/:id/valuacion
```

Retorna:
```json
{
  "articuloId": "uuid",
  "stockTotal": 100,
  "stockConCosto": 80,
  "stockSinCosto": 20,
  "valorTotalARS": 15000.00,
  "valorTotalUSD": 150.00,
  "costoPromedioARS": 150.00,
  "costoPromedioUSD": 1.50,
  "capas": [
    {
      "reposicionId": "uuid",
      "fechaReposicion": "2024-01-15T10:00:00Z",
      "stockDisponible": 50,
      "costoUnitario": 100.00,
      "costoUnitarioDolares": 1.00,
      "valorCapa": 5000.00,
      "valorCapaDolares": 50.00,
      "lotePartida": "LOTE-001",
      "proveedorNombre": "Proveedor SA"
    }
  ],
  "costoInicialEstimado": 80.00,
  "stockInicialSinReposicion": 20,
  "valorStockInicial": 1600.00
}
```

#### Cálculos

```
valorTotalARS = Σ(capa.stockDisponible × capa.costoUnitario) + (stockSinCosto × costoInicialEstimado)
valorTotalUSD = Σ(capa.stockDisponible × capa.costoUnitarioDolares) + (stockSinCosto × costoInicialEstimadoUsd)
costoPromedioARS = valorTotalARS / stockTotal
stockSinCosto = stockTotal - Σ(capa.stockDisponible)
```

#### Interfaz de Usuario

**Formulario de Artículos**: Sección "Costo Inicial Estimado" con:
- Costo Unitario (ARS)
- Valor Dólar Oficial
- Costo Unitario (USD) - auto-calculado

**Detalle de Artículo**: Sección "Valuación del Stock" con:
- Valor total (ARS y USD)
- Costo promedio unitario
- Desglose de stock con/sin costo
- Advertencia si hay stock sin costo asignado
- Detalle de cada capa (reposición con stock disponible)

#### Consideraciones

1. **Reposiciones canceladas** no cuentan en la valuación (stock_disponible = 0)
2. **Reposiciones en curso** no tienen stock disponible hasta ser confirmadas
3. **Stock sin costo** solo se valúa si tiene `costoInicialEstimado` asignado
4. **Entregas** siempre consumen stock de la reposición más antigua primero (FIFO)

---

## Características de UI

### Imágenes de Artículos

#### Visualización en Formularios
- Las imágenes en los formularios de reposición mantienen sus **dimensiones originales** (aspect ratio)
- No se recortan ni distorsionan las imágenes

#### Columna de Imagen en Grillas
Las siguientes grillas incluyen una columna de imagen clickeable:

**Grilla de Artículos** (`/articulos`):
- Columna "Imagen" separada con miniatura de 40x40px
- Click en la imagen abre un **modal de ampliación** con la imagen en tamaño original
- Si no hay imagen, muestra icono placeholder

**Tabla de Artículos a Entregar** (formulario Nueva Entrega):
- Columna "Img" con miniatura de 32x32px
- Click en la imagen abre modal con imagen ampliada
- Permite verificar visualmente el artículo antes de confirmar la entrega

#### Modal de Imagen
- Fondo oscuro semi-transparente (backdrop)
- Imagen centrada con tamaño máximo del 90% del viewport
- Nombre del artículo como título
- Botón X para cerrar
- Click fuera del modal también cierra

### Ordenamiento Alfabético Server-Side

Todas las grillas del sistema ahora se ordenan **alfabéticamente de A-Z** en el servidor, garantizando un orden consistente en todas las páginas de la paginación.

#### Grillas con Ordenamiento por Defecto

| Grilla | Campo de Ordenamiento | Orden |
|--------|----------------------|-------|
| Artículos | `nombre` | A-Z |
| Clientes | `razon_social` | A-Z |
| Proveedores | `razon_social` | A-Z |
| Rubros | `nombre` | A-Z |
| Marcas | `nombre` | A-Z |

#### Implementación Técnica
- **Backend**: Los repositorios tienen un `defaultSortBy` configurado
- **Frontend**: Los servicios pasan `sortBy` y `sortOrder` como parámetros a la API
- **Validators**: El `paginationSchema` acepta `sortBy` (string) y `sortOrder` ('asc' | 'desc')
- El ordenamiento se aplica **antes de la paginación**, garantizando consistencia entre páginas

#### Archivos Modificados
**Frontend Services**:
- `clientes.service.ts`: `getAll()` y `search()` con sortBy/sortOrder
- `proveedores.service.ts`: `getAll()` y `search()` con sortBy/sortOrder
- `rubros.service.ts`: `getAll()` con sortBy/sortOrder
- `marcas.service.ts`: `getAll()` con sortBy/sortOrder
- `articulos.service.ts`: `getAll()` con sortBy/sortOrder

**Frontend Pages**:
- `ClientesList.tsx`: Pasa `sortBy: 'razon_social', sortOrder: 'asc'`
- `ProveedoresList.tsx`: Pasa `sortBy: 'razon_social', sortOrder: 'asc'`
- `ArticulosList.tsx`: Pasa `sortBy: 'nombre', sortOrder: 'asc'`
- `UnidadesList.tsx`: Las funciones de carga de Rubros y Marcas pasan `sortBy: 'nombre', sortOrder: 'asc'`

**Backend**:
- `shared/src/validators/index.ts`: `paginationSchema` con defaults de sorting
- Repositorios base con `defaultSortBy` configurado por entidad

### Paginación con Selector de Registros
Todas las grillas del sistema incluyen paginación con selector de registros por página:
- **Opciones disponibles**: 10, 50 o 100 registros por página
- **Default**: 10 registros
- Selector ubicado en la barra de paginación junto con los controles de navegación
- Al cambiar el límite, la grilla se actualiza automáticamente
- **Páginas con paginación**:
  - Artículos, Clientes, Proveedores
  - Entregas, Reposiciones
  - Usuarios, Roles
  - Auditoría
  - Configuraciones (Rubros, Marcas - cada tab con su paginación)

### Filas Clickeables en Grillas
Todas las grillas de datos permiten hacer click en cualquier parte de la fila para abrir el registro en una nueva pestaña:
- Click en cualquier celda abre el detalle en nueva pestaña
- Los botones de acciones mantienen su comportamiento individual
- Cursor cambia a "pointer" al pasar sobre la fila
- Aplica a: Artículos, Clientes, Proveedores, Rubros, Reposiciones, Entregas

### Menú Lateral Colapsable
El menú lateral (sidebar) puede colapsarse para mostrar solo iconos:
- Botón de colapsar/expandir en la parte inferior del menú
- Al colapsar, solo se muestran los iconos con tooltips
- El contenido principal se ajusta automáticamente
- Orden del menú: Dashboard, Artículos, Solicitudes de Cotización, Entregas, Reposiciones, Clientes, Proveedores, Configuraciones
- Sección de Administración separada: Usuarios, Roles, Auditoría

---

## Cambios Realizados en Esta Sesión

### Base de Datos

1. **Tabla `clientes`**:
   - Agregada columna `notas TEXT`

2. **Tabla `proveedores`**:
   - Agregada columna `notas TEXT`
   - Agregada columna `nombre_fantasia VARCHAR(200)`
   - Columna `cuit` ahora es opcional (nullable)

3. **Tabla `reposiciones`** (extendida):
   - `costo_reposicion DECIMAL(12,2)`: Costo en pesos argentinos (requerido)
   - `valor_dolar_oficial DECIMAL(10,2)`: Valor del dolar al momento de la reposicion (requerido)
   - `costo_reposicion_dolares DECIMAL(12,2)`: Costo calculado en dolares (autocalculado)
   - `fecha_vencimiento DATE`: Fecha de vencimiento del lote
   - `lote_partida VARCHAR(100)`: Numero de lote o partida
   - `link_compra TEXT`: URL del documento de compra
   - `lugar_compra VARCHAR(200)`: Lugar donde se realizo la compra
   - `estado VARCHAR(20)`: Estado de la reposicion ('en_curso', 'confirmada' o 'cancelada')
   - `stock_disponible INTEGER`: Stock restante de esta reposición para valuación FIFO
   - Indices para busqueda por vencimiento, lote y estado

4. **Tabla `rubros`** (extendida):
   - `prefijo VARCHAR(10)`: Prefijo para códigos de artículos (solo letras)

5. **Tabla `articulos`** (extendida):
   - `costo_inicial_estimado NUMERIC(12,2)`: Costo unitario en ARS para stock sin reposición
   - `valor_dolar_costo_inicial NUMERIC(10,2)`: Valor del dólar al momento de asignar el costo
   - `costo_inicial_estimado_usd NUMERIC(12,2)`: Costo unitario en USD (auto-calculado)

6. **Tabla `audit_log`**:
   - Auditoría solo para: articulos, entregas, reposiciones
   - Removida auditoría de: clientes, proveedores, configuraciones, usuarios, roles

### Backend

1. **Repositorios actualizados**:
   - `articulo.repository.ts`: Sincronizacion de `stock` y `stock_actual` en create/update/updateStock, método `getMaxCodigoByPrefix()` para generación de códigos, soporte para costo inicial en USD
   - `cliente.repository.ts`: Soporte para campo `notas`
   - `proveedor.repository.ts`: Soporte para `notas` y `nombreFantasia`, CUIT opcional
   - `entrega.repository.ts`: Actualizado tipo Cliente con `notas`
   - `reposicion.repository.ts`: Soporte para nuevos campos (costo, dolar, vencimiento, lote, link, lugar)

2. **Servicios actualizados**:
   - `articulo.service.ts`: Método `generateCodigo()` para generar códigos automáticos basados en rubro
   - `cliente.service.ts`: Pasa campo `notas` al crear
   - `proveedor.service.ts`: Pasa campos `notas` y `nombreFantasia`, validación CUIT opcional

3. **Endpoints de Artículos** (articulo.routes.ts):
   - `GET /articulos/generate-codigo?rubroId=xxx`: Genera código automático para un rubro

4. **Validadores**:
   - `paginationSchema`: Limite aumentado de 100 a 1000
   - `createClienteSchema` / `updateClienteSchema`: Campo `notas`
   - `createProveedorSchema` / `updateProveedorSchema`: Campos `notas`, `nombreFantasia`, CUIT opcional
   - `createArticuloSchema` / `updateArticuloSchema`: Soporte para `proveedorId` vacio (transformado a null)
   - `createReposicionSchema`: Campos obligatorios (costoReposicion, valorDolarOficial) y opcionales (fechaVencimiento, lotePartida, linkCompra, lugarCompra)
   - `updateReposicionSchema`: Para edicion de reposiciones

5. **Nuevos Repositorios para Unidades**:
   - `unidadMedida.repository.ts`: CRUD y método getActive()
   - `presentacion.repository.ts`: CRUD y método getActive()

6. **Nuevos Servicios para Unidades**:
   - `unidadMedida.service.ts`
   - `presentacion.service.ts`

7. **Nuevos Controladores para Unidades**:
   - `unidadMedida.controller.ts`
   - `presentacion.controller.ts`

8. **Nuevas Rutas para Unidades**:
   - `unidadMedida.routes.ts`: Endpoints para /unidades-medida
   - `presentacion.routes.ts`: Endpoints para /presentaciones
   - Registradas en `routes/index.ts`

9. **Endpoints de Reposiciones** (stock.routes.ts):
   - `GET /stock/reposiciones`: Listar reposiciones
   - `GET /stock/reposiciones/:id`: Ver detalle
   - `GET /stock/reposiciones/:id/historial`: Ver historial de cambios de la reposicion
   - `POST /stock/reposiciones`: Crear reposicion
   - `PUT /stock/reposiciones/:id`: Editar reposicion
   - `POST /stock/reposiciones/:id/confirmar`: Confirmar reposicion (incrementa stock)
   - `POST /stock/reposiciones/:id/cancelar`: Cancelar reposicion (descuenta stock si estaba confirmada)

10. **Middleware de Auditoría** (audit.ts):
    - Captura estado anterior y nuevo de registros
    - Solo audita: articulos, entregas, reposiciones
    - Removido de: clientes, proveedores, rubros, presentaciones, unidades_medida, usuarios, roles
    - Función `logManualAudit()` para operaciones especiales (confirmar/cancelar)

11. **Dashboard Service** (dashboard.service.ts):
    - Valuación USD ahora incluye stock inicial estimado con `costo_inicial_estimado_usd`
    - Suma correcta de valuación ARS y USD de todas las fuentes

### Frontend

1. **Páginas de Rubros** (movido a Configuraciones):
   - Rubros ahora es un tab dentro del módulo Configuraciones
   - `RubroModal.tsx`: Modal para crear/editar rubros

2. **Páginas de Proveedores** (nuevas):
   - `ProveedoresList.tsx`: Lista con búsqueda y paginación
   - `ProveedorForm.tsx`: Formulario con todos los campos

3. **Paginas de Clientes** (actualizadas):
   - Agregado campo `notas` en el formulario

4. **Paginas de Reposiciones** (actualizadas):
   - `ReposicionForm.tsx`: Formulario completo con secciones para:
     - Datos del articulo (articulo, proveedor, cantidad) - obligatorios
     - Costos (costo en ARS, valor dolar) - obligatorios, calculo automatico en USD
     - Lote y vencimiento (lote/partida, fecha de vencimiento) - opcionales
     - Informacion de compra (lugar de compra, link de compra) - opcionales
   - `ReposicionesList.tsx`: Lista con columnas simplificadas (Fecha, Articulo, Cant., Costo, Estado), menu de acciones (ver, editar, confirmar, cancelar)
     - Badge de cantidad segun estado: naranja sin signo (en_curso), verde con + (confirmada), gris sin signo (cancelada)
   - `ReposicionDetail.tsx`: Vista detallada de la reposicion con acciones segun estado y seccion de Historial de Cambios
   - `ReposicionEdit.tsx`: Edicion de reposicion (solo si esta en estado `en_curso`)

5. **Paginas de Articulos** (actualizadas):
   - `ArticuloForm.tsx`: Formulario con código autogenerado:
     - Campo código es de solo lectura en modo creación
     - Se genera automáticamente al seleccionar el rubro
     - Muestra indicador de carga mientras genera
     - En modo edición el código sigue siendo editable
     - Campo Presentación como dropdown con valores de la API (presentaciones activas)
     - **Sección "Costo Inicial Estimado"** con:
       - Costo Unitario (ARS)
       - Valor Dólar Oficial
       - Costo Unitario (USD) - auto-calculado en tiempo real
   - **Campo Marca con Combobox**:
     - Autocompletado mientras se escribe
     - Filtrado de marcas existentes
     - Botón "+" para crear nueva marca si no existe
     - Usa endpoint `findOrCreate` para creación dinámica
   - `ArticuloDetail.tsx`: Dos secciones de movimientos:
     - **Stock por Reposicion**: Solo reposiciones confirmadas
       - Columnas: Fecha, Cantidad (+N verde), Costo (ARS/USD), Lote, Vencimiento, Proveedor
       - Alertas visuales para productos vencidos o proximos a vencer
       - Click en fila abre detalle de reposicion en nueva pestaña
     - **Historial de Movimientos**: Todas las reposiciones y entregas
       - Muestra estado de cada reposicion (En Curso, Confirmada, Cancelada)
       - Badge de cantidad segun estado: naranja (en_curso), verde con + (confirmada), gris (cancelada)
       - Icono de flecha con color segun estado
       - Click en fila abre detalle en nueva pestaña
     - **Costo Inicial Estimado**: Muestra ARS, USD y tipo de cambio usado

6. **Componentes**:
   - `FormField.tsx`: Agregado componente `Checkbox` con forwardRef
   - `FormField.tsx`: Agregado componente `Combobox` con autocompletado y filtrado

7. **Páginas de Configuraciones** (actualizadas):
   - `UnidadesList.tsx`: Interfaz con dos pestañas (Rubros, Marcas)
   - `RubroModal.tsx`: Modal para crear/editar rubros (nombre, prefijo, descripción)
   - `MarcaModal.tsx`: Modal para crear/editar marcas

8. **Servicios** (actualizados):
   - `rubros.service.ts`: Llamadas API para rubros
   - `marcas.service.ts`: Llamadas API para marcas

9. **Rutas** (App.tsx):
   - Proveedores: `/proveedores`, `/proveedores/nuevo`, `/proveedores/:id/editar`
   - Reposiciones: `/reposiciones`, `/reposiciones/nueva`, `/reposiciones/:id`, `/reposiciones/:id/editar`
   - Entregas: `/entregas`, `/entregas/nueva`, `/entregas/:id`
   - Configuraciones: `/configuraciones` (incluye Rubros y Marcas como tabs)
   - Usuarios: `/usuarios`, `/usuarios/nuevo`, `/usuarios/:id/editar`
   - Roles: `/roles`, `/roles/nuevo`, `/roles/:id/editar`
   - Auditoría: `/auditoria`

10. **Layout** (AdminLayout.tsx):
    - Menú lateral organizado en secciones:
      - **Principal**: Dashboard, Artículos, Entregas, Reposiciones, Clientes, Proveedores, Configuraciones
      - **Administración**: Usuarios, Roles, Auditoría
    - "Configuraciones" con icono de engranaje (Settings) - incluye Rubros y Marcas
    - Sidebar colapsable con botón toggle redondo (ChevronLeft/ChevronRight)
    - Botón de colapsar posicionado a la altura del Dashboard, más pequeño y redondo
    - Al colapsar: solo se muestran iconos con tooltips
    - Transiciones suaves con Tailwind (transition-all, duration-300)

11. **Estilos CSS**:
    - Eliminados spinners (flechas) de todos los campos numericos

12. **Dashboard** (actualizado):
    - Nuevas estadísticas: Total Artículos, Stock Bajo, Valuación del Stock, Entregas del Mes, Reposiciones del Mes
    - Eliminadas: Clientes, Proveedores, Entregas Hoy, Reposiciones Hoy
    - Nuevo componente `ValuacionCard` para mostrar valor en ARS y USD
    - Backend: nuevo método `getValuacionTotal()` en dashboard.service.ts

13. **Páginas de Usuarios** (nuevas):
    - `UsuariosList.tsx`: Lista de usuarios con búsqueda, paginación y acciones
    - `UsuarioForm.tsx`: Formulario para crear/editar usuarios con selección de roles
    - `ResetPasswordModal.tsx`: Modal para que admins reseteen contraseñas

14. **Páginas de Roles** (nuevas):
    - `RolesList.tsx`: Lista de roles con badges de permisos y protección de roles del sistema
    - `RoleForm.tsx`: Formulario con selector de permisos agrupados por módulo

15. **Página de Auditoría** (nueva):
    - `AuditoriaList.tsx`: Visor de logs con filtros avanzados y filas expandibles

16. **Entregas Multi-Artículo** (reestructurado):
    - Nueva tabla `entrega_items` en base de datos
    - Tipos actualizados: `EntregaItem`, `EntregaItemConArticulo`, `CreateEntregaItemDto`
    - `EntregaForm.tsx`: Interfaz tipo "carrito de compras"
      - Cliente, N° Cotización y Purchase Order (opcional) en cabecera
      - **Búsqueda por código**: Campo para ingresar código del artículo directamente
        - Presionar Enter o click en Buscar para encontrar el artículo
        - Conversión automática a mayúsculas
        - Al encontrar, selecciona el artículo y mueve el foco a cantidad
      - Dropdown alternativo para seleccionar de lista
      - Tabla tipo ticket para ver/editar artículos agregados
      - Observaciones al final
    - `EntregasList.tsx`: Muestra múltiples artículos por entrega
    - `EntregaDetail.tsx`: Nueva página de detalle de entrega con Purchase Order
    - Nueva ruta: `/entregas/:id`

17. **Paginación mejorada** (todas las grillas):
    - Componente `DataTable`: Agregado selector de registros por página (10, 50, 100)
    - Hook `usePagination`: Default cambiado de 20 a 10 registros
    - Todas las páginas de lista actualizadas para soportar `onLimitChange`
    - La barra de paginación siempre visible (incluso con pocos registros)

18. **Reposiciones - Formulario mejorado**:
    - Layout reorganizado: Código + Artículo en fila 1, Proveedor + Cantidad en fila 2
    - Sincronización bidireccional entre campo de código y dropdown de artículo
    - Artículos ordenados alfabéticamente (A-Z) en el dropdown

19. **Búsqueda de Artículos ampliada**:
    - Ahora busca por: código, nombre, SKU, ETM, descripción
    - Placeholder actualizado para indicar campos de búsqueda

20. **Auditoría - Paginación corregida**:
    - Filtrado por entidades movido al backend (antes era client-side)
    - Nuevo parámetro `entidades[]` para filtrar por múltiples entidades
    - Paginación correcta: siempre muestra el número exacto de registros solicitados

21. **Cloudinary configurado para producción**:
    - Credenciales de producción agregadas al archivo `.env`
    - Imágenes de artículos se almacenan en la nube

22. **Imágenes con dimensiones originales**:
    - En el formulario de reposición, las imágenes mantienen su aspect ratio original
    - Eliminado el recorte forzado de 128px de altura

23. **Columna de imagen clickeable en grillas**:
    - **Grilla de Artículos**: Nueva columna "Imagen" separada con miniatura clickeable
    - **Tabla de Artículos a Entregar** (Nueva Entrega): Columna "Img" con miniatura
    - Modal de ampliación al hacer click en la imagen
    - Permite verificar visualmente el artículo

24. **Ordenamiento alfabético server-side**:
    - Todas las grillas ordenadas alfabéticamente A-Z por defecto
    - Ordenamiento aplicado en el servidor (antes de paginación)
    - Garantiza consistencia entre todas las páginas
    - **Grillas actualizadas**:
      - Artículos: por `nombre`
      - Clientes: por `razon_social`
      - Proveedores: por `razon_social`
      - Rubros: por `nombre`
      - Marcas: por `nombre`

---

## Configuración

### Variables de Entorno (.env)

```env
# Base de datos Supabase
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres

# JWT
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret

# Cloudinary (configurado para producción)
CLOUDINARY_CLOUD_NAME=dkjulq0hu
CLOUDINARY_API_KEY=216577417248828
CLOUDINARY_API_SECRET=oTgFK-iPSiKxL66luTuyYXrxk2I

# App
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# Google (exportar Solicitudes de Cotización a Google Sheets)
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=https://tu-dominio.vercel.app/api/google/oauth/callback
```

Las credenciales de Google se generan en console.cloud.google.com (proyecto propio, con Sheets API y Drive API habilitadas, y un cliente OAuth de tipo "Aplicación web"). No requieren cuenta de facturación para este volumen de uso.

### Cloudinary (Almacenamiento de Imágenes)

El sistema utiliza **Cloudinary** para almacenar las imágenes de artículos en la nube.

#### Configuración
Las credenciales de Cloudinary están configuradas en el archivo `.env` del proyecto raíz:
- `CLOUDINARY_CLOUD_NAME`: Nombre del cloud
- `CLOUDINARY_API_KEY`: API Key
- `CLOUDINARY_API_SECRET`: API Secret

#### Características
- **Subida automática**: Las imágenes se suben a Cloudinary al crear/editar artículos
- **Transformaciones**: Cloudinary permite redimensionar y optimizar imágenes on-the-fly
- **CDN global**: Las imágenes se sirven desde el CDN de Cloudinary para mejor rendimiento
- **Fallback local**: Si Cloudinary no está configurado, las imágenes se guardan en `backend/uploads/`

#### Carpeta de Destino
Las imágenes se almacenan en la carpeta `hofra-stock/articulos/` dentro de Cloudinary.

### Comandos

```bash
# Desarrollo
npm run dev              # Inicia frontend y backend

# Build
npm run build            # Compila todo
npm run build --workspace=shared   # Solo shared
npm run build --workspace=backend  # Solo backend

# Base de datos
npm run db:migrate       # Ejecuta migraciones
npm run db:seed          # Datos iniciales
```

---

## Migraciones Ejecutadas

1. **001_initial_schema.sql**: Esquema inicial completo
2. **002_add_notas_clientes.sql**: Columna notas en clientes
3. **add-notas-column.ts**: Script para agregar notas a clientes y proveedores
4. **add-nombre-fantasia.ts**: Script para nombre_fantasia y CUIT opcional en proveedores
5. **003_extend_reposiciones.sql**: Extension de tabla reposiciones con campos de costo, dolar, vencimiento, lote, link y lugar de compra
6. **migrate-reposicion-estado.ts**: Campo estado en reposiciones (activa/cancelada)
7. **migrate-reposicion-estados-v2.ts**: Renombrado de estados: `activa` → `en_curso`, nuevo estado `confirmada`
8. **004_add_rubro_prefijo.sql**: Campo prefijo en rubros para códigos de artículos
9. **005_add_stock_valuation.sql**: Sistema de valuación FIFO
   - Campo `stock_disponible` en reposiciones
   - Campo `costo_inicial_estimado` en articulos
   - Inicialización de stock_disponible para datos existentes
10. **006_add_numero_cotizacion_entregas.sql**: Número de cotización en entregas
    - Campo `numero_cotizacion_interna` en entregas (obligatorio, debe comenzar con #)
    - Eliminado de artículos (ahora pertenece a entregas)
11. **007_add_unidades_presentaciones.sql**: Tablas para unidades de medida y presentaciones
    - Tabla `unidades_medida` con campos: nombre, activo
    - Tabla `presentaciones` con campos: nombre, descripcion, activo
    - Datos iniciales: 20 unidades de medida, 10 presentaciones
12. **008_remove_abreviatura_unidades.sql**: Elimina campo abreviatura de unidades_medida
13. **009_entregas_multiple_articulos.sql**: Entregas con múltiples artículos
    - Nueva tabla `entrega_items` (entrega_id, articulo_id, cantidad)
    - Migración de datos existentes de entregas a entrega_items
    - Eliminadas columnas `articulo_id` y `cantidad` de tabla entregas
    - Índices para búsquedas eficientes
14. **010_add_purchase_order_entregas.sql**: Purchase Order en entregas
    - Campo `purchase_order VARCHAR(50)` opcional en tabla entregas
15. **011_add_costo_inicial_usd.sql**: Costo inicial estimado en USD
    - Campo `valor_dolar_costo_inicial NUMERIC(10,2)` para tipo de cambio
    - Campo `costo_inicial_estimado_usd NUMERIC(12,2)` auto-calculado
16. **add-marcas-table.ts**: Tabla de Marcas
    - Tabla `marcas` con campos: nombre (unique), descripcion, activo, created_by, updated_by
    - Migración automática de marcas existentes desde campo `marca` de artículos
17. **013_add_username.sql**: Username para login
    - Campo `username VARCHAR(50)` NOT NULL en tabla usuarios
    - Índice único para username
    - Usuarios existentes reciben username basado en email (parte antes del @)
18. **019_add_solicitudes_cotizacion.sql**: Módulo de Solicitudes de Cotización
    - Tablas `solicitudes_cotizacion` (cabecera) y `solicitud_cotizacion_items` (detalle)
    - Permisos `solicitudes_cotizacion:leer/crear/actualizar/eliminar` asignados a Administrador
19. **020_add_url_externa_solicitud_items.sql**: URL de producto externo en ítems de cotización
    - Campo `url_externa TEXT` en `solicitud_cotizacion_items`
20. **021_rename_a_comprar_a_no_disponible.sql**: Renombra el estado de ítem `a_comprar` a `no_disponible`
    - Actualiza filas existentes y el `CHECK` constraint de `estado_item`
21. **022_add_modelo_descripcion_ingles_solicitud_items.sql**: Columnas del archivo del cliente para la cotización final
    - Campos `modelo_solicitado VARCHAR(150)` y `descripcion_ingles_solicitada TEXT` en `solicitud_cotizacion_items`
22. **023_add_google_integracion.sql**: Integración con Google Sheets/Drive
    - Tabla `google_integracion` (refresh token de la cuenta de Google conectada)

---

## Flujo de Stock

### Entrega (descuenta stock con FIFO)
1. Usuario selecciona cliente y N° de cotización interna
2. Agrega artículos al ticket (uno o más):
   - Selecciona artículo
   - Ingresa cantidad
   - Click en "Agregar"
3. Sistema valida stock suficiente para cada artículo
4. Opcionalmente agrega observaciones
5. Crea registro de entrega con todos los items
6. **Para cada artículo, descuenta stock usando FIFO**:
   - Obtiene reposiciones con stock_disponible > 0 (ordenadas por fecha ASC)
   - Descuenta de la reposición más antigua primero
   - Actualiza stock_disponible de cada reposición afectada
   - Descuenta stock total del artículo
7. Registra en auditoría

### Reposicion (flujo completo)

#### Crear Reposicion (NO afecta stock)
1. Usuario selecciona articulo y proveedor
2. Ingresa cantidad y datos obligatorios:
   - Costo de reposicion (ARS) - **obligatorio**
   - Valor del dolar oficial - **obligatorio**
3. Opcionalmente ingresa:
   - Lote/Partida
   - Fecha de vencimiento
   - Lugar de compra
   - Link de compra (factura, orden, etc.)
   - Observaciones
4. Sistema calcula automaticamente el costo en dolares
5. Crea registro de reposicion con estado `en_curso`
6. **El stock NO se modifica** (la reposicion aun no esta confirmada)
7. La reposicion queda vinculada al articulo y visible en su detalle

#### Confirmar Reposicion (incrementa stock)
1. Usuario selecciona "Confirmar" en el menu de acciones (solo disponible si estado es `en_curso`)
2. Sistema cambia estado a `confirmada`
3. **Inicializa stock_disponible = cantidad** (para valuación FIFO)
4. **Incrementa stock del articulo** (columnas `stock` y `stock_actual`)
5. Registra en auditoria

#### Cancelar Reposicion (puede o no afectar stock)
1. Usuario selecciona "Cancelar" en el menu de acciones
2. Sistema muestra mensaje de confirmacion indicando:
   - Si la reposicion esta `confirmada`: "El stock se descontara en X unidades"
   - Si la reposicion esta `en_curso`: "El stock no sera afectado"
3. Usuario confirma la cancelacion
4. Sistema cambia estado a `cancelada`
5. **Resetea stock_disponible = 0** (para que no cuente en valuación)
6. **Si estaba `confirmada`**: descuenta stock del articulo
7. **Si estaba `en_curso`**: el stock NO se modifica
8. La reposicion queda marcada visualmente como cancelada
9. No se puede editar, confirmar ni volver a cancelar

---

## Notas Importantes

1. **Imágenes**: Si Cloudinary no está configurado, las imágenes se guardan localmente en `backend/uploads/`. Recordar configurar Cloudinary antes de producción.

2. **Stock**: Los campos `stock` y `stock_actual` siempre se mantienen sincronizados.

3. **Soft Delete**: Todas las entidades usan soft delete (campo `deleted_at`).

4. **Auditoría**: Solo se registran operaciones sobre artículos, entregas y reposiciones. Muestra estado anterior y nuevo.

5. **Permisos**: El sistema tiene control de permisos por módulo y acción (crear, leer, actualizar, eliminar).

6. **Visualizacion de Reposiciones**: El badge de cantidad refleja visualmente el estado del stock:
   - **Naranja sin signo** (`en_curso`): Stock aun no afectado
   - **Verde con +** (`confirmada`): Stock incrementado
   - **Gris sin signo** (`cancelada`): Stock descontado o nunca afectado

---

## Credenciales de Prueba

- **Usuario**: admin
- **Password**: Admin123!

---

## Próximos Pasos Sugeridos

- [x] ~~Configurar Cloudinary para producción~~ (completado)
- [ ] Agregar exportación a Excel/CSV
- [ ] Implementar reportes
- [x] ~~Sistema de valuación de stock FIFO~~ (completado)
- [x] ~~Módulo de Unidades de Medida y Presentaciones~~ (eliminado - ya no aplica)
- [x] ~~Prefijo de rubro para códigos de artículos~~ (completado)
- [x] ~~Filas clickeables en grillas~~ (completado)
- [x] ~~Clarificación de costos unitarios vs totales en reposiciones~~ (completado)
- [x] ~~N° Cotización Interna en Entregas~~ (completado)
- [x] ~~Menú lateral colapsable~~ (completado)
- [x] ~~Dashboard con valuación total del stock~~ (completado)
- [x] ~~Entregas con múltiples artículos~~ (completado)
- [x] ~~Rubros integrado en módulo Configuraciones~~ (completado)
- [x] ~~Purchase Order en entregas~~ (completado)
- [x] ~~Búsqueda de artículos por código en entregas~~ (completado)
- [x] ~~ABM de Usuarios~~ (completado)
- [x] ~~ABM de Roles y Permisos~~ (completado)
- [x] ~~Página de Auditoría~~ (completado)
- [x] ~~Costo inicial estimado en USD para valuación~~ (completado)
- [x] ~~Auditoría filtrada solo para articulos, entregas y reposiciones~~ (completado)
- [x] ~~Paginación con selector de registros por página (10, 50, 100)~~ (completado)
- [x] ~~Búsqueda de artículos por código, nombre, SKU, ETM, descripción~~ (completado)
- [x] ~~Búsqueda por código interno en reposiciones~~ (completado)
- [x] ~~Módulo de Marcas con creación dinámica desde Artículos~~ (completado)
- [x] ~~Combobox con autocompletado para campo Marca~~ (completado)
- [x] ~~Cloudinary configurado para producción~~ (completado)
- [x] ~~Imágenes con dimensiones originales en formularios~~ (completado)
- [x] ~~Columna de imagen clickeable con modal de ampliación~~ (completado)
- [x] ~~Ordenamiento alfabético server-side en todas las grillas~~ (completado)
- [x] ~~Login con username en vez de email~~ (completado)
- [x] ~~Impresión de comprobante de entregas~~ (completado)
- [x] ~~Combobox de artículos con búsqueda unificada (Entregas y Reposiciones)~~ (completado)
- [x] ~~Costos en formulario de Entregas (costo unit., subtotal, total)~~ (completado)
- [x] ~~Opción de Cambiar Contraseña en dropdown del usuario~~ (completado)
- [x] ~~Módulo de Sugerencias de mejoras al sistema~~ (completado)
- [x] ~~Selección de artículos sin stock en Reposiciones~~ (completado)
- [x] ~~Búsqueda en Reposiciones por código, nombre y descripción~~ (completado)
- [x] ~~Stock Actual solo lectura (actualizado solo via reposiciones/entregas)~~ (completado)
- [x] ~~Estados en Entregas (en_curso, confirmada, cancelada)~~ (completado)
- [x] ~~Edición de Entregas en curso~~ (completado)
- [x] ~~Fix SPA routing en Vercel (404 en nueva pestaña)~~ (completado)
- [x] ~~Formato de moneda argentina en campos de costos~~ (completado)
- [x] ~~Eliminar campos Unidad y Descripción de Artículos~~ (completado)
- [x] ~~Presentación convertido a campo de texto libre~~ (completado)
- [x] ~~Reorganización del formulario de Artículos~~ (completado)
- [x] ~~Eliminación de módulos Unidades de Medida y Presentaciones~~ (completado)
- [x] ~~Actualización automática de códigos al cambiar prefijo de rubro~~ (completado)
- [x] ~~Dashboard: Valuación por rubro en lugar de cantidad de artículos~~ (completado)
- [x] ~~Importación de artículos con nuevo formato de columnas~~ (completado)
- [x] ~~Límite de importación aumentado a 10mb~~ (completado)
- [x] ~~Fix historial de movimientos: cantidad por artículo específico~~ (completado)
- [x] ~~Scripts de limpieza de base de datos~~ (completado)
- [x] ~~Módulo de Solicitudes de Cotización con matching automático y cotización imprimible~~ (completado)
- [x] ~~Exportar Solicitud de Cotización a Excel (.xlsx con fórmulas)~~ (completado)
- [x] ~~Exportar Solicitud de Cotización directo a Google Sheets (OAuth con Drive/Sheets API)~~ (completado)
- [ ] Integración OAuth con Mercado Libre para autocompletar precio/foto de productos externos

---

## Tecnologías Utilizadas

| Capa | Tecnología |
|------|------------|
| Frontend | React 18, Vite 4, TypeScript, Tailwind CSS, Zustand, React Hook Form, React Hot Toast |
| Backend | Node.js 16, Express, TypeScript, Zod |
| Base de Datos | PostgreSQL (Supabase) |
| Autenticación | JWT (jsonwebtoken, bcryptjs) |
| Imágenes | Cloudinary / Almacenamiento local |
| Validación | Zod (compartido entre frontend y backend) |

---

*Documentación actualizada el 31 de agosto de 2026*

---

## Changelog Reciente

### 18 de junio de 2026

#### Altura Mínima en Grillas de Entregas y Reposiciones
- **Nueva prop `minRows`** en componente `DataTable`
- Garantiza altura mínima equivalente a 10 filas cuando hay pocos registros
- Evita que el menú dropdown de acciones se corte o se vea mal
- **Archivos modificados**:
  - `frontend/src/components/DataTable.tsx` (prop minRows, ROW_HEIGHT)
  - `frontend/src/pages/entregas/EntregasList.tsx` (minRows={10})
  - `frontend/src/pages/reposiciones/ReposicionesList.tsx` (minRows={10})

#### Filtro por Estado en Listado de Artículos
- **Nuevo dropdown** para filtrar artículos por estado
- Opciones: Todos los estados, Activos, Inactivos
- Se integra con los filtros existentes (búsqueda, rubro, stock bajo)
- **Archivos modificados**:
  - `frontend/src/pages/articulos/ArticulosList.tsx`

#### Fix: Parsing de Booleanos en Query Strings
- **Problema**: `z.coerce.boolean()` convertía el string `"false"` a `true`
- **Solución**: Nuevo schema `booleanStringSchema` que parsea correctamente `"true"`/`"false"`
- Aplicado a filtros de artículos (`stockBajo`, `activo`)
- **Archivos modificados**:
  - `shared/src/validators/index.ts` (booleanStringSchema, articuloFiltrosSchema)

#### Fix: Actualización de Prefijo en Rubros
- **Problema**: Error de servidor al editar el prefijo de un rubro
- **Causa**: PostgreSQL no interpretaba correctamente el parámetro numérico en `SUBSTRING FROM`
- **Solución**: Agregar cast explícito `$2::int` en la query SQL
- Simplificado el código eliminando la transacción compleja
- **Archivos modificados**:
  - `backend/src/services/rubro.service.ts`

---

### 16 de junio de 2026

#### Eliminación de campos Unidad y Descripción de Artículos
- **Campo `unidad` eliminado** del módulo de Artículos
- **Campo `descripcion` eliminado** del módulo de Artículos
- **Campo `presentacion` convertido a texto libre** (ya no es dropdown)
- Actualizados tipos, validadores, repositorios y componentes frontend
- Búsqueda de artículos ahora busca por: código, nombre, SKU, ETM
- **Migraciones ejecutadas**:
  - `016_remove_unidad_descripcion.sql`: Elimina columnas `unidad` y `descripcion` de tabla `articulos`

#### Reorganización del Formulario de Artículos
- **Nuevo orden de campos**:
  1. Nombre - Presentación
  2. Rubro - Código
  3. Proveedor - Stock Mínimo
  4. Marca - SKU - ETM
  5. Costo Inicial Estimado (sección completa)
  6. Ubicación
  7. Stock Actual (solo en edición, read-only)
  8. Checkbox "Artículo activo" (solo en edición)

#### Eliminación de Módulos Unidades de Medida y Presentaciones
- **Módulo `Unidades de Medida` eliminado** completamente (backend + frontend)
- **Módulo `Presentaciones` eliminado** completamente (backend + frontend)
- **Constante `UNIDADES` eliminada** de shared/constants
- **Página de Configuraciones** ahora solo tiene tabs: **Rubros** y **Marcas**
- **Migraciones ejecutadas**:
  - `017_drop_unidades_presentaciones_tables.sql`: Elimina tablas `unidades_medida` y `presentaciones`
- **Archivos eliminados**:
  - Backend: `unidadMedida.controller.ts`, `unidadMedida.service.ts`, `unidadMedida.repository.ts`, `unidadMedida.routes.ts`
  - Backend: `presentacion.controller.ts`, `presentacion.service.ts`, `presentacion.repository.ts`, `presentacion.routes.ts`
  - Frontend: `UnidadMedidaModal.tsx`, `PresentacionModal.tsx`
  - Frontend: `unidadesMedida.service.ts`, `presentaciones.service.ts`

#### Actualización Automática de Códigos al Cambiar Prefijo de Rubro
- **Nuevo comportamiento**: Al modificar el prefijo de un rubro, todos los artículos de ese rubro actualizan su código automáticamente
- **Ejemplo**: Si el prefijo cambia de "ELE" a "ELEC":
  - Artículo con código "ELE1" → "ELEC1"
  - Artículo con código "ELE25" → "ELEC25"
- La operación se ejecuta en una **transacción** (atómica)
- **Archivos modificados**:
  - `backend/src/services/rubro.service.ts`

#### Dashboard: Valuación por Rubro en lugar de Cantidad de Artículos
- **Gráfico de torta** ahora muestra **valuación total del stock** por rubro (en ARS)
- Antes mostraba cantidad de artículos por rubro
- **Título cambiado**: "Artículos por Rubro" → "Valuación por Rubro"
- **Valores formateados** como moneda con separadores de miles (ej: `$1.250.000`)
- **Rubros sin stock valuado** (total = 0) se ocultan del gráfico
- La valuación incluye:
  - Stock de reposiciones confirmadas (cantidad × costo de reposición)
  - Stock inicial estimado para artículos sin reposiciones
- **Archivos modificados**:
  - `backend/src/services/dashboard.service.ts` (método `getValuacionPorRubro`)
  - `backend/src/controllers/dashboard.controller.ts`
  - `backend/src/routes/dashboard.routes.ts` (endpoint renombrado a `/valuacion-por-rubro`)
  - `frontend/src/services/dashboard.service.ts`
  - `frontend/src/pages/Dashboard.tsx`

#### Importación de Artículos: Nuevo Formato de Columnas
- **Nuevo mapeo de columnas** para importación desde Excel:
  | Columna | Campo | Notas |
  |---------|-------|-------|
  | A - Nombre | nombre | Requerido |
  | B - Marca | marca | Se crea si no existe |
  | C - Codigo | codigo | Opcional, se genera automáticamente si vacío |
  | D - SKU | sku | |
  | E - ETM | etm | |
  | F - Presentacion | presentacion | |
  | G - Stock Actual | stockActual | |
  | H - Stock Mínimo | stockMinimo | Si es 0, artículo se crea como inactivo |
  | I - Costo Inicial | costoInicialEstimado | |
  | J - Proveedor | proveedorId | Se crea si no existe |
  | K - Rubro | rubroId | Requerido, se crea si no existe |
  | L - Ubicacion | ubicacion | |

- **Nueva regla**: Si `Stock Mínimo = 0`, el artículo se crea con `activo = false`
- **Código personalizado**: Si se proporciona código, se usa; si no, se genera automáticamente
- **Preview mejorado**: Muestra proveedores a crear además de rubros y marcas
- **Archivos modificados**:
  - `backend/src/services/importar.service.ts`
  - `frontend/src/pages/importar/ImportarPage.tsx`
  - `frontend/src/services/importar.service.ts`

#### Límite de Body JSON Aumentado para Importaciones Grandes
- **Límite de JSON aumentado** de 100kb (default) a **10mb**
- Permite importar archivos Excel con miles de filas
- **Archivo modificado**:
  - `backend/src/app.ts` (línea `express.json({ limit: '10mb' })`)

#### Fix: Historial de Movimientos muestra cantidad del artículo específico
- **Problema**: En la vista de detalle de artículo, el historial de movimientos mostraba el total de items de cada entrega, no la cantidad del artículo actual
- **Solución**: Filtrar los items de la entrega por `articuloId` antes de sumar
- **Ejemplo**: Si una entrega tiene 3 artículos (A: 5u, B: 10u, C: 3u), al ver el artículo A, ahora muestra "-5" en vez de "-18"
- **Archivo modificado**:
  - `frontend/src/pages/articulos/ArticuloDetail.tsx`

#### Scripts de Limpieza de Base de Datos
- **Nuevos scripts** para limpiar datos de la base de datos:
  - `database/scripts/clean_database.sql`: Limpia TODO incluyendo usuarios
  - `database/scripts/clean_database_keep_users.sql`: Limpia datos operativos, mantiene usuarios y roles
- Útiles para resetear el sistema en desarrollo/testing

### 17 de junio de 2026

#### Nota sobre Sistema FIFO
- El sistema usa **FIFO (First In, First Out)** basado en la **fecha de confirmación** de la reposición
- **No usa FEFO** (First Expiring, First Out) - la fecha de vencimiento es solo informativa
- Al entregar stock, se descuenta primero de las reposiciones más antiguas (por fecha de confirmación)

---

### 12 de junio de 2026

#### Stock Actual Solo Lectura
- **Campo `stockActual` ya no es editable** en el formulario de artículos
- Solo se actualiza automáticamente mediante reposiciones y entregas
- Removido de `CreateArticuloDto` y `UpdateArticuloDto` en el shared package
- En modo edición muestra el valor como texto con mensaje explicativo
- **Archivos**:
  - `frontend/src/pages/articulos/ArticuloForm.tsx` (campo read-only)
  - `shared/src/types/index.ts` (removido de DTOs)

#### Ordenamiento por Fecha en Entregas y Reposiciones
- **Listas ordenadas de más reciente a más antigua** por defecto
- Cambiado `sortOrder` default de 'asc' a 'desc' en `paginationSchema`
- Entregas y Reposiciones ahora muestran los registros más nuevos primero
- **Archivos**:
  - `shared/src/validators/index.ts` (sortOrder default: 'desc')

#### Columna SKU en Lista de Artículos
- **Nueva columna "SKU"** agregada a la derecha de la columna "Código"
- Muestra el SKU del artículo en formato monoespaciado
- Si no hay SKU, muestra "-"
- **Archivos**:
  - `frontend/src/pages/articulos/ArticulosList.tsx` (nueva columna)

#### Fix Vercel SPA Routing (404 en Nueva Pestaña)
- **Agregado `vercel.json`** con rewrites para SPA
- Soluciona error 404 al abrir enlaces en nueva pestaña en producción
- Configuración:
  ```json
  {
    "rewrites": [
      { "source": "/api/(.*)", "destination": "/api" },
      { "source": "/((?!api).*)", "destination": "/index.html" }
    ]
  }
  ```
- **Archivos**:
  - `vercel.json` (nuevo)

#### Estado en Entregas (Mismo que Reposiciones)
- **Nuevo campo `estado`** en tabla `entregas` con valores: `en_curso`, `confirmada`, `cancelada`
- **Flujo de estados**:
  - Al crear entrega: estado `en_curso`, **stock NO se descuenta**
  - Al confirmar: estado `confirmada`, **stock se descuenta (FIFO)**
  - Al cancelar desde `en_curso`: estado `cancelada`, **stock NO se modifica**
  - Al cancelar desde `confirmada`: estado `cancelada`, **stock se restaura**
- **UI actualizada**:
  - Badge de estado en lista y detalle de entregas
  - Botones de acción: Confirmar, Cancelar, Editar (según estado)
  - Mensajes de confirmación indicando impacto en stock
- **Archivos**:
  - `database/migrations/015_add_estado_entregas.sql` (nueva migración)
  - `shared/src/types/index.ts` (EstadoEntrega, estado en Entrega)
  - `shared/src/validators/index.ts` (updateEntregaSchema)
  - `backend/src/repositories/entrega.repository.ts` (confirm, cancel, update)
  - `backend/src/services/stock.service.ts` (confirmEntrega, cancelEntrega, updateEntrega)
  - `backend/src/controllers/stock.controller.ts` (nuevos métodos)
  - `backend/src/routes/stock.routes.ts` (nuevas rutas PUT, POST confirmar/cancelar)
  - `frontend/src/pages/entregas/EntregasList.tsx` (columna estado, acciones)
  - `frontend/src/pages/entregas/EntregaDetail.tsx` (badge estado, botones)
  - `frontend/src/services/stock.service.ts` (confirmEntrega, cancelEntrega, updateEntrega)

#### Edición de Entregas en Curso
- **Nueva página `EntregaEdit`** para editar entregas con estado `en_curso`
- Permite modificar: cliente, número de cotización, purchase order, artículos, cantidades, observaciones
- Interfaz tipo carrito igual que el formulario de nueva entrega
- Solo disponible para entregas en estado `en_curso`
- Botón "Editar" en detalle y lista de entregas
- **Archivos**:
  - `frontend/src/pages/entregas/EntregaEdit.tsx` (nuevo)
  - `frontend/src/App.tsx` (ruta /entregas/:id/editar)

#### Fix Hidratación de Autenticación
- **Soluciona redirección incorrecta al login** al abrir enlaces en nueva pestaña
- Problema: Zustand `persist` hidrata asíncronamente, causando que `isAuthenticated` sea `false` antes de cargar localStorage
- Solución: Agregado estado `_hasHydrated` que espera la hidratación antes de verificar auth
- `ProtectedRoute` y `PublicRoute` muestran spinner mientras hidratan
- **Archivos**:
  - `frontend/src/stores/authStore.ts` (_hasHydrated, setHasHydrated, onRehydrateStorage)
  - `frontend/src/App.tsx` (verificación de hasHydrated en rutas protegidas)

#### Componente CurrencyInput (Formato Argentino)
- **Nuevo componente `CurrencyInput`** para campos de costos y valores monetarios
- Formatea números con formato argentino:
  - **Puntos** como separador de miles (1.500.000)
  - **Coma** como separador decimal (,43)
- Auto-formatea al perder foco (blur)
- Acepta entrada con puntos y comas
- Almacena valor numérico real en el formulario
- **Aplicado en**:
  - Formulario de Artículos: Costo Inicial Estimado, Valor Dólar
  - Formulario de Reposición: Costo Unitario, Valor Dólar
  - Edición de Reposición: Costo Unitario, Valor Dólar
- **Archivos**:
  - `frontend/src/components/CurrencyInput.tsx` (nuevo)
  - `frontend/src/pages/articulos/ArticuloForm.tsx` (usa CurrencyInput con Controller)
  - `frontend/src/pages/reposiciones/ReposicionForm.tsx` (usa CurrencyInput)
  - `frontend/src/pages/reposiciones/ReposicionEdit.tsx` (usa CurrencyInput)

#### Migración Base de Datos
- **015_add_estado_entregas.sql**: Agrega columna `estado` a tabla `entregas`
  - Tipo: TEXT NOT NULL DEFAULT 'confirmada'
  - Constraint: CHECK (estado IN ('en_curso', 'confirmada', 'cancelada'))
  - Entregas existentes quedan como 'confirmada'

---

### 9 de junio de 2026 (continuación)

#### Cambiar Contraseña
- **Nuevo modal `ChangePasswordModal`** en dropdown del usuario (esquina superior derecha)
- Permite al usuario autenticado cambiar su propia contraseña
- Campos: Contraseña actual, Nueva contraseña, Confirmar contraseña
- Validaciones: contraseña actual correcta, nueva contraseña mínimo 8 caracteres, confirmación coincidente
- Botón toggle para mostrar/ocultar contraseñas
- **Archivos**:
  - `frontend/src/components/ChangePasswordModal.tsx` (nuevo)
  - `frontend/src/layouts/AdminLayout.tsx` (integración del modal)
  - `backend/src/routes/auth.routes.ts` (endpoint change-password)
  - `backend/src/controllers/auth.controller.ts` (método changePassword)
  - `backend/src/services/auth.service.ts` (lógica de cambio)

#### Módulo de Sugerencias
- **Nuevo módulo para sugerencias de mejoras al sistema**
- Ubicación: Menú lateral > Administración > Sugerencias
- **Accesible para todos los roles** (sin restricción de permisos)
- Campos:
  - Título (obligatorio)
  - Descripción (obligatorio)
  - Prioridad: Alta, Media, Baja
  - Estado: Nueva, En Progreso, Resuelta, Cancelada
- Funcionalidades:
  - Lista con filtros por estado y prioridad
  - Crear, editar y eliminar sugerencias
  - Badge de prioridad con colores (rojo=alta, amarillo=media, gris=baja)
  - Badge de estado con colores
- **Archivos**:
  - `frontend/src/pages/sugerencias/SugerenciasList.tsx` (nuevo)
  - `frontend/src/pages/sugerencias/SugerenciaForm.tsx` (nuevo)
  - `frontend/src/services/sugerencias.service.ts` (nuevo)
  - `backend/src/controllers/sugerencia.controller.ts` (nuevo)
  - `backend/src/services/sugerencia.service.ts` (nuevo)
  - `backend/src/repositories/sugerencia.repository.ts` (nuevo)
  - `backend/src/routes/sugerencia.routes.ts` (nuevo)
  - `database/migrations/014_add_sugerencias.sql` (nuevo)
  - `shared/src/types/index.ts` (tipos Sugerencia)
  - `shared/src/validators/index.ts` (schemas de validación)

#### Artículos sin Stock en Reposiciones
- **Prop `allowZeroStock`** en componente `ArticuloCombobox`
- Permite seleccionar artículos con stock = 0 en formulario de Reposiciones
- En Entregas: artículos sin stock siguen deshabilitados
- **Archivos**:
  - `frontend/src/components/ArticuloCombobox.tsx` (prop allowZeroStock)
  - `frontend/src/pages/reposiciones/ReposicionForm.tsx` (usa allowZeroStock=true)

#### Búsqueda en Reposiciones
- **Campo de búsqueda** en grilla de Reposiciones
- Busca por: código, nombre o descripción del artículo
- Búsqueda con debounce de 300ms
- Reset automático a página 1 al buscar
- **Archivos**:
  - `frontend/src/pages/reposiciones/ReposicionesList.tsx` (input de búsqueda)
  - `frontend/src/services/stock.service.ts` (parámetro busqueda)
  - `backend/src/controllers/stock.controller.ts` (extrae busqueda de query)
  - `backend/src/repositories/reposicion.repository.ts` (filtro ILIKE)

---

### 10 de junio de 2026

#### Login con Username
- **Nuevo campo `username`** en tabla `usuarios` (VARCHAR 50, único, obligatorio)
- Login ahora usa **username** en vez de email
- Usuarios existentes reciben username automático basado en email (parte antes del @)
- Formulario de Usuario actualizado con campo "Nombre de Usuario"
- Validación: solo letras, números, puntos, guiones y guiones bajos
- **Migración**: `database/migrations/013_add_username.sql`

#### Impresión de Entregas
- **Botón de impresión** en grilla de Entregas (reemplaza columna Observaciones)
- Genera comprobante imprimible con:
  - N° Cotización Interna y Fecha
  - Datos del Cliente (Razón Social, CUIT)
  - Tabla de artículos: Código, Nombre, Cantidad, Costo Unit., Subtotal
  - Total de unidades y costo total
  - Observaciones (si las hay)
  - Fecha de generación del documento
- Abre diálogo de impresión del navegador automáticamente

#### Combobox de Artículos (Entregas y Reposiciones)
- **Nuevo componente `ArticuloCombobox`** para selección de artículos
- Reemplaza la búsqueda por código + dropdown separados
- Características:
  - Búsqueda por código, nombre o SKU
  - Autocompletado mientras se escribe
  - Ordenamiento alfabético A-Z
  - Muestra: imagen, código, nombre, stock, costo
  - Selección automática con Enter si hay coincidencia exacta por código
  - Items sin stock deshabilitados (en formulario de Entregas)
- Usado en:
  - Formulario de Nueva Entrega
  - Formulario de Nueva Reposición

#### Costos en Formulario de Entregas
- **Columna "Costo Unit."**: Costo inicial estimado del artículo
- **Columna "Subtotal"**: Costo unitario × cantidad
- **Footer con Total**: Suma de todos los subtotales
- Valores mostrados en ARS con formato argentino

#### Archivos Modificados/Creados
- `frontend/src/components/ArticuloCombobox.tsx` (nuevo)
- `frontend/src/pages/entregas/EntregaForm.tsx` (actualizado)
- `frontend/src/pages/entregas/EntregasList.tsx` (botón imprimir)
- `frontend/src/pages/reposiciones/ReposicionForm.tsx` (usa ArticuloCombobox)
- `frontend/src/pages/usuarios/UsuarioForm.tsx` (campo username)
- `frontend/src/pages/Login.tsx` (login con username)
- `frontend/src/services/auth.service.ts` (username)
- `frontend/src/hooks/useAuth.ts` (username)
- `backend/src/services/auth.service.ts` (login por username)
- `backend/src/controllers/auth.controller.ts` (username)
- `backend/src/repositories/usuario.repository.ts` (findByUsername)
- `backend/src/services/usuario.service.ts` (validación username)
- `shared/src/types/index.ts` (Usuario con username)
- `shared/src/validators/index.ts` (loginSchema con username)
- `database/migrations/013_add_username.sql` (nueva migración)

### 9 de junio de 2026
- Configuración de Cloudinary para producción (almacenamiento de imágenes en la nube)
- Imágenes en formulario de reposición con dimensiones originales (sin recorte)
- Columna de imagen clickeable con modal de ampliación en grilla de Artículos
- Columna de imagen clickeable en tabla "Artículos a Entregar" del formulario de Nueva Entrega
- Ordenamiento alfabético server-side en todas las grillas principales
- Grillas de Clientes y Proveedores ordenadas por Razón Social (A-Z)
- Grillas de Rubros y Marcas ordenadas por Nombre (A-Z)
- **Módulo de Reportes** agregado en Administración con 4 reportes:
  - Entregas por Cliente (ventas mensuales por cliente)
  - Reposiciones por Proveedor (compras mensuales por proveedor)
  - Proveedores por Artículo (histórico de proveedores de cada artículo)
  - Artículos por Proveedor (histórico de artículos de cada proveedor)
- Resumen anual para comparación rápida entre meses
- Exportación a CSV de todos los reportes
- Filas expandibles para ver detalle de cada registro

---

### 27 de julio de 2026

#### Campo URL en Artículos
- **Nuevo campo `url`** en tabla `articulos` para almacenar links de referencia del producto (ej: Mercado Libre)
- Campo tipo TEXT, opcional
- **Migración**: `database/migrations/018_add_url_articulos.sql`

#### Importación de Artículos: Nuevo Formato de Columnas
- **Columna J - Costo USD**: Permite importar el costo inicial en dólares directamente
- **Columna L - URL**: Permite importar la URL de referencia del producto
- **Nuevo orden de columnas**:
  | Columna | Campo |
  |---------|-------|
  | A | Nombre |
  | B | Marca |
  | C | Codigo |
  | D | SKU |
  | E | ETM |
  | F | Presentacion |
  | G | Stock Actual |
  | H | Stock Mínimo |
  | I | Costo Inicial (ARS) |
  | J | Costo USD |
  | K | Proveedor |
  | L | URL |
  | M | Rubro |
  | N | Ubicacion |

#### Archivos Modificados
- `shared/src/types/index.ts` - Campo `url` en tipo Articulo
- `backend/src/repositories/articulo.repository.ts` - Soporte para campo `url` en create/update
- `backend/src/repositories/reposicion.repository.ts` - Campo `url` en mapeo
- `backend/src/services/importar.service.ts` - Interface con campos `url` y `costoInicialUsd`
- `frontend/src/services/importar.service.ts` - Interface actualizada
- `frontend/src/pages/importar/ImportarPage.tsx` - Nuevo mapeo de columnas y tabla de formato

---

### 28 de julio de 2026

#### Dashboard: Mostrar Artículos Activos y Total
- **Nueva tarjeta de artículos** que muestra ambos contadores:
  - **Artículos Activos**: Artículos con `activo = true` (antes era el único valor mostrado)
  - **X en sistema**: Total de artículos incluyendo inactivos
- Permite ver la diferencia entre artículos activos y el total en el sistema

#### Archivos Modificados
- `shared/src/types/index.ts` - Nuevo campo `totalArticulosEnSistema` en `DashboardStats`
- `backend/src/services/dashboard.service.ts` - Query adicional para contar todos los artículos
- `frontend/src/pages/Dashboard.tsx` - Nuevo componente `ArticulosCard` para mostrar ambos valores

---

### 23 de agosto de 2026

#### Nuevo Módulo: Solicitudes de Cotización
- **Objetivo**: procesar el archivo Excel que manda un cliente pidiendo cotización, matchear automáticamente cada ítem contra el catálogo propio, revisarlo en pantalla, y terminar generando una cotización imprimible para responder
- **Carga de archivo**: columnas detectadas por nombre de encabezado (ETM, Descripción, Cantidad, Marca), no por posición fija — tolera archivos con columnas extra intercaladas (Precio, Moneda, Modelo, Descripción en Inglés, etc.)
- **Matching automático** (heurístico, sin servicios externos): primero por ETM exacto, luego por overlap de palabras de la descripción + bono si la marca coincide, si no hay coincidencia suficiente queda "sin match"
- **Pantalla de revisión por ítem**: columnas Solicitado / Sugerido / Aceptado / Acciones / Precio Unitario / Subtotal
  - Aceptar la sugerencia del catálogo, o buscar y elegir otro artículo manualmente (con botón para cancelar la búsqueda sin elegir nada)
  - Buscar en Mercado Libre (pestaña nueva, búsqueda armada solo con la descripción) sin perder una sugerencia ya matcheada
  - Marcar directamente un ítem como "No Disponible" (con confirmación), sin pasar por Mercado Libre
  - Pegar la URL de un producto externo (ej. Mercado Libre) y Aceptar/Declinar esa opción de compra
  - Botón para deshacer una decisión (aceptado o no disponible) y volver a `pendiente`, sin perder la sugerencia u URL original
  - Precio unitario se prellena con el costo del artículo del catálogo si no había uno cargado, siempre editable a mano
  - Artículos de las columnas Sugerido/Aceptado son clickeables: abren el detalle del artículo en una pestaña nueva
  - Tarjetas de indicadores arriba de la grilla: Con Coincidencia, Sin Coincidencia, Aceptados, Pendientes de Revisión
  - Grilla con ancho mínimo y scroll horizontal para que ninguna columna quede cortada en pantallas chicas
- **Cotizada**: solo se puede marcar cuando todos los ítems tienen decisión y precio cargado; genera un comprobante imprimible sin exponer código interno ni costos
- **Investigación sobre integración con Mercado Libre**: se confirmó que tanto la búsqueda (`/sites/{site}/search`) como la consulta de un producto puntual (`/items/{id}`) devuelven 403 sin autenticación OAuth desde abril de 2025; embeber la página de ML en un iframe tampoco es viable por sus headers `X-Frame-Options`/CSP, y el scraping server-side también devuelve 403. Por eso el precio y la foto de productos externos se cargan a mano por ahora; automatizarlo queda pendiente como mejora futura (requiere alta de app OAuth en developers.mercadolibre.com.ar)
- **Nuevas tablas**: `solicitudes_cotizacion` (cabecera) y `solicitud_cotizacion_items` (detalle, incluye `url_externa`)
- **Nuevo permiso de módulo**: `solicitudes_cotizacion` (leer/crear/actualizar/eliminar)
- **Estados por ítem simplificados**: `pendiente` / `aceptado` / `no_disponible` (el estado original `a_comprar` se renombró a `no_disponible`, misma semántica: sin artículo interno asociado)

#### Archivos Nuevos
**Backend**:
- `backend/src/repositories/solicitudCotizacion.repository.ts`
- `backend/src/services/solicitudCotizacion.service.ts`
- `backend/src/controllers/solicitudCotizacion.controller.ts`
- `backend/src/routes/solicitudCotizacion.routes.ts`

**Frontend**:
- `frontend/src/pages/solicitudesCotizacion/SolicitudesCotizacionList.tsx`
- `frontend/src/pages/solicitudesCotizacion/SolicitudCotizacionUpload.tsx`
- `frontend/src/pages/solicitudesCotizacion/SolicitudCotizacionDetail.tsx`
- `frontend/src/services/solicitudesCotizacion.service.ts`

**Migraciones**:
- `database/migrations/019_add_solicitudes_cotizacion.sql`
- `database/migrations/020_add_url_externa_solicitud_items.sql`
- `database/migrations/021_rename_a_comprar_a_no_disponible.sql`

#### Archivos Modificados
- `backend/src/repositories/articulo.repository.ts` - Nuevo método `findByEtm()`
- `backend/src/middlewares/audit.ts` - Entrada en `ENTITY_CONFIG` para auditar el módulo
- `backend/src/routes/index.ts` - Registro de las nuevas rutas
- `frontend/src/App.tsx` - Nuevas rutas `/solicitudes-cotizacion*`
- `frontend/src/layouts/AdminLayout.tsx` - Ítem de menú nuevo
- `frontend/src/pages/roles/RoleForm.tsx` - Label del nuevo módulo en el selector de permisos
- `shared/src/types/index.ts`, `shared/src/validators/index.ts`, `shared/src/constants/index.ts` - Tipos, DTOs, schemas Zod y constante de módulo
- `backend/src/services/solicitudCotizacion.service.ts` - Rename `a_comprar` → `no_disponible`
- `frontend/src/components/ArticuloCombobox.tsx` - Nueva prop `dropdownClassName` para ensanchar el listado desplegable cuando se usa en celdas de tabla angostas (no afecta su uso en Entregas/Reposiciones)

---

### 31 de agosto de 2026

#### Exportar Solicitud de Cotización a Excel y Google Sheets
- **Objetivo**: reemplazar el armado manual de la cotización final (columnas Solicitado/Ofrecido/Costo-MarkUp-Venta/Precio con fórmulas) por una exportación automática, con dos destinos que comparten la misma lógica de armado
- **`buildCotizacionSheetData()`** (`backend/src/services/cotizacionExport.service.ts`): función pura que arma la matriz de filas/columnas/fórmulas de la cotización a partir de una `SolicitudCotizacionConRelaciones` — la usan tanto el export a Excel como el export a Google Sheets, sin duplicar lógica
- **"Exportar a Excel"**: genera un `.xlsx` real con `exceljs` (fórmulas nativas, no solo valores) y lo descarga
  - `GET /api/solicitudes-cotizacion/:id/exportar-excel`
- **"Exportar a Google Sheets"**: crea la planilla directo en un Google Drive conectado (sin descargar/subir a mano)
  - Nueva integración OAuth con Google: una sola cuenta conectada para todo el sistema, tab **"Google Drive"** en Configuraciones para conectar/ver estado
  - Scopes mínimos: `drive.file` (solo archivos creados por la app) + `userinfo.email`
  - Refresh token guardado en la nueva tabla `google_integracion`
  - `POST /api/solicitudes-cotizacion/:id/exportar-google-sheets`, `GET /api/google/auth-url`, `GET /api/google/oauth/callback`, `GET /api/google/status`
- **Columnas del documento final**: Costo por Unidad/Costo Total/Mark Up/Venta con IVA quedan siempre en blanco (decisión explícita: el sistema solo maneja un precio único, ya neto de IVA); Precio Unit. Sin IVA = precio cargado en la solicitud; Total Sin IVA = fórmula (Cantidad × Precio); Imagen de lo Ofrecido = fórmula `=IMAGE(url)` con la foto del artículo del catálogo (Cloudinary) cuando existe; Proveedor = proveedor del artículo aceptado o la URL externa si el ítem es "No Disponible"
- **Nuevas columnas capturadas del archivo del cliente**: `MODELO` y `DESCRIPCION EN INGLES` (antes se descartaban), para poder volcarlas en la cotización final
- **Investigación de costos**: se confirmó que Google Sheets API y Drive API son gratuitas para este volumen de uso (no piden cuenta de facturación; límite gratuito de 500 requests/100s por proyecto)

#### Archivos Nuevos
**Backend**:
- `backend/src/services/cotizacionExport.service.ts`
- `backend/src/services/google.service.ts`
- `backend/src/repositories/googleIntegracion.repository.ts`
- `backend/src/controllers/google.controller.ts`
- `backend/src/routes/google.routes.ts`

**Frontend**:
- `frontend/src/services/google.service.ts`

**Migraciones**:
- `database/migrations/022_add_modelo_descripcion_ingles_solicitud_items.sql`
- `database/migrations/023_add_google_integracion.sql`

#### Archivos Modificados
- `backend/src/repositories/solicitudCotizacion.repository.ts` - Insert/select de `modelo_solicitado`/`descripcion_ingles_solicitada`, `LEFT JOIN proveedores` y `imagen_url` del artículo, `contacto` del cliente
- `backend/src/services/solicitudCotizacion.service.ts` - Pasa los nuevos campos al crear los ítems
- `backend/src/controllers/solicitudCotizacion.controller.ts` - Endpoints `exportarExcel` y `exportarGoogleSheets`
- `backend/src/routes/solicitudCotizacion.routes.ts` - Nuevas rutas de exportación
- `backend/src/routes/index.ts` - Registro de `googleRoutes`
- `backend/src/config/env.ts` - Variables `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`
- `backend/package.json` - Nuevas dependencias `exceljs` y `googleapis`
- `frontend/src/pages/solicitudesCotizacion/SolicitudCotizacionUpload.tsx` - Lee `MODELO` y `DESCRIPCION EN INGLES` del archivo del cliente
- `frontend/src/pages/solicitudesCotizacion/SolicitudCotizacionDetail.tsx` - Botones "Exportar a Excel" y "Exportar a Google Sheets", muestra Modelo solicitado
- `frontend/src/services/solicitudesCotizacion.service.ts` - Métodos `exportarExcel()` y `exportarGoogleSheets()`
- `frontend/src/pages/unidades/UnidadesList.tsx` - Tab "Google Drive" (estado de conexión + botón conectar)
- `shared/src/types/index.ts`, `shared/src/validators/index.ts` - Campos `modeloSolicitado`/`descripcionInglesSolicitada`, `proveedorNombre`/`imagenUrl` en el artículo del ítem

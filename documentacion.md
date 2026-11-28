# Documentación del Sistema de Gestión de Stock - Grupo Hofra

## Resumen del Proyecto

Sistema completo de gestión de inventario con arquitectura monorepo, desarrollado con:
- **Frontend**: React 18 + Vite 4 + TypeScript + Tailwind CSS
- **Backend**: Express + TypeScript
- **Base de Datos**: PostgreSQL (Railway)
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
- **Duración de sesión**: access token de **2 horas** (`JWT_ACCESS_EXPIRY`, antes 15 minutos), refresh token de 7 días (`JWT_REFRESH_EXPIRY`). El frontend renueva el access token automáticamente y en segundo plano cuando vence (interceptor de axios en `frontend/src/services/api.ts`), así que en la práctica la sesión dura hasta que vence el refresh token, sin pedir reingresar credenciales.

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
- **Duplicar artículo** (14 de noviembre de 2026): acción disponible en el listado y en el detalle de cada artículo. Abre el formulario de "Nuevo Artículo" precargado con los datos del original — rubro, proveedor, stock mínimo, presentación, marca, SKU, ETM, ubicación, URL, costo inicial ARS/USD — excepto código (se autogenera), imagen (para no compartir el mismo archivo de Cloudinary entre dos artículos) y stock (arranca en 0). El nombre se precarga como `"<nombre original> (copia)"`. Al guardar se crea un artículo nuevo e independiente; el original no se modifica
- **Filtro por Proveedor** (14 de noviembre de 2026) en el listado, además de los filtros existentes (rubro, estado, stock bajo)
- **Exportar a Excel/CSV mejorado** (14 de noviembre de 2026): el botón de exportar trae el set **completo** que coincide con los filtros activos (hasta 1000 registros) en el momento de exportar, en vez de solo la página cargada en memoria. Los campos numéricos (Stock, Stock Mínimo) se exportan como número real de Excel, no como texto (ver sección "Tipado de Exportaciones")
- **Ajustes de columnas del listado** (14-15 de noviembre de 2026): SKU y Nombre con ancho acotado y truncado con tooltip (Nombre después se cambió a salto de línea en vez de truncar); se agregó columna "Proveedor"; se renombró "Stock" a "Stock actual"; se eliminó la columna "Estado" (el filtro Activos/Inactivos se mantiene); la columna "Acciones" quedó reducida a Duplicar y Eliminar (Ver y Editar siguen disponibles clickeando la fila o desde el detalle); Rubro con ancho acotado y tooltip; stock en 0 se muestra como píldora roja igual que el resto de los estados

#### Valorización de Reposición en Stock Bajo (19 de noviembre de 2026)

Cuando el filtro **"Solo stock bajo"** del listado de Artículos está activo (incluye la entrada desde Dashboard → "Artículos con Stock Bajo" → "Ver todos", que es `/articulos?stockBajo=true`), el listado se amplía para poder dimensionar cuánto costaría reponer todo lo que está por debajo del mínimo:

- **Columnas nuevas** (solo visibles con el filtro activo, no afectan el listado general de Artículos):
  - **Último costo**: costo de la última reposición **confirmada** del artículo (por fecha); si el artículo todavía no tiene ninguna reposición, cae al **Costo Inicial Estimado** cargado en el artículo. Si no hay ninguno de los dos, muestra "Sin costo registrado" (nunca `$0`, para no sugerir que reponerlo no cuesta nada)
  - **Cantidad a reponer**: `MAX(0, Stock Mínimo - Stock actual)`
  - **Costo estimado de reposición**: `Cantidad a reponer × Último costo` (vacío/"Sin costo registrado" si no hay último costo)
- **Resumen de totales**: tarjeta sobre la grilla con Total de artículos con stock bajo, Total de unidades a reponer y Costo total estimado de reposición. Se recalcula solo con esos 3 valores, pedidos aparte vía `GET /articulos/resumen-reposicion` (mismos filtros que el listado: búsqueda, rubro, proveedor, estado) para que sume **todos** los artículos que matchean el filtro, no solo los de la página visible en pantalla. Si hay artículos sin costo registrado, se excluyen del costo total y se informa la cantidad excluida debajo del total, para no mostrar un costo total engañoso
- **Exportación a Excel/CSV**: las 3 columnas nuevas se agregan también al export (tipadas como número/moneda reales, no texto — ver "Tipado de Exportaciones"), más una fila `TOTAL` al final con el total de unidades y el costo total estimado. El export respeta el `sortBy`/`sortOrder` vigente en la grilla al momento de exportar (misma lógica de siempre, el ordenamiento no es exclusivo de este modo) — la fila `TOTAL` queda siempre al final, fuera del ordenamiento
- **Ordenamiento (19 de noviembre de 2026)**: "Cantidad a reponer" y "Costo estimado de reposición" son columnas ordenables (`sortable`) además de las que ya lo eran. Como no son columnas reales de `articulos`, el backend las resuelve en `buildOrderByClause` con expresiones calculadas (`GREATEST(0, stock_minimo - stock)`, y esa misma expresión multiplicada por `COALESCE(uc.costo_reposicion, costo_inicial_estimado)`), con `NULLS LAST` para que los artículos sin costo registrado queden siempre al final sin importar la dirección
  - **Fix de flechitas de orden invisibles** (19 de noviembre de 2026): en columnas angostas con encabezado largo (como estas dos), el ícono de orden (`DataTable.tsx`) se encogía hasta volverse invisible porque competía por espacio con el texto del encabezado dentro de un flex sin `flex-shrink-0`. Se corrigió en el componente genérico `DataTable` (afecta a todas las grillas de la app, no solo esta): el ícono ahora usa `flex-shrink-0` (nunca se encoge, mismo tamaño que en "Código"/"Nombre") y el texto del encabezado usa `truncate` (se corta con "…" antes de ceder espacio al ícono, con tooltip del texto completo). También se ensancharon un poco las columnas ("Cantidad a reponer" 110px→150px, "Costo estimado de reposición" 150px→190px) para que el encabezado entre casi siempre completo
- **Columna Acciones (19 de noviembre de 2026)**: se oculta en este listado filtrado (Duplicar/Eliminar no están disponibles desde esta vista); se mantiene sin cambios en el listado general de Artículos

##### Archivos
**Backend**:
- `backend/src/repositories/articulo.repository.ts` (`buildFiltrosConditions`, `ULTIMO_COSTO_JOIN`, `search()` ahora incluye `ultimoCosto`, nuevo método `getResumenReposicion()`)
- `backend/src/services/articulo.service.ts`, `backend/src/controllers/articulo.controller.ts`, `backend/src/routes/articulo.routes.ts` (`GET /articulos/resumen-reposicion`, requiere permiso `articulos:leer`)
- `shared/src/types/index.ts` (`ArticuloConRelaciones.ultimoCosto`, nuevo tipo `ResumenReposicion`)

**Frontend**:
- `frontend/src/pages/articulos/ArticulosList.tsx` (columnas condicionales, tarjeta de resumen, export)
- `frontend/src/services/articulos.service.ts` (`getResumenReposicion`)
- `frontend/src/components/ExportButtons.tsx` (nuevo prop opcional `footerRows` para agregar filas de totales al export, sin afectar a los demás usos del componente)
- **Fix: Enter en el formulario borraba la imagen** (19 de noviembre de 2026): el botón "✕" de eliminar imagen (`ImageUpload.tsx`) no tenía `type="button"`, así que por default HTML lo trataba como `type="submit"` — al ser el primer botón de ese tipo dentro del `<form>`, el navegador lo activaba vía "submit implícito" al apretar Enter en cualquier campo, ejecutando `handleDelete()` en vez de guardar el artículo. Se agregó `type="button"` al botón.

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
- **Búsqueda en el listado** (17 de noviembre de 2026): igual mecánica que Reposiciones — busca por N° de cotización interna, cliente o purchase order, con debounce de 300ms

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
- **Último Costo Cargado** (14 de noviembre de 2026): al elegir un artículo en el formulario de nueva reposición, el panel lateral muestra el costo de la última reposición registrada para ese artículo (ARS y USD), o el Costo Inicial Estimado si nunca tuvo una. Sirve como referencia para comparar contra el costo nuevo que se está cargando y detectar fluctuaciones de precio
  - **Mejora visual** (14 de noviembre de 2026): pasó de una líneita chica a una caja destacada (fondo ámbar, ícono, montos grandes), para no confundirse con el cuadro de costo nuevo que se está cargando
  - **Proveedor y link de compra** (14 de noviembre de 2026): debajo del costo se muestra el proveedor de esa misma última reposición y, si existe, el link de compra completo (clickeable, abre en pestaña nueva). Si el artículo nunca tuvo una reposición, cae al proveedor y a la URL de referencia cargados en el propio artículo (ej. la publicación de Mercado Libre usada para fijar el costo inicial)
- **Precarga del Valor Dólar Oficial** (14 de noviembre de 2026): ver sección "Configuración del Dólar Oficial" más abajo

### 8. Dashboard

Panel principal con estadísticas del sistema.

#### Tarjetas de Estadísticas
- **Total Artículos**: Cantidad de artículos activos
- **Stock Bajo**: Artículos con stock <= stock mínimo (alerta visual si > 0)
- **Valuación del Stock**: Valor total del inventario en ARS y USD
- **Entregas del Mes**: Cantidad de entregas realizadas en el mes actual
- **Reposiciones del Mes**: Cantidad de reposiciones del mes actual
- **Último Valor Dólar Oficial** (14 de noviembre de 2026): el valor global vigente (ver "Configuración del Dólar Oficial" más abajo), en la misma fila que Entregas/Reposiciones del Mes. Muestra "Sin definir" si todavía no se cargó ninguno

#### Gráficos
- **Movimientos por Mes**: Gráfico de barras comparando entregas vs reposiciones (últimos 6 meses)
- **Artículos por Rubro**: Gráfico de torta mostrando distribución de artículos por rubro

#### Tablas
- **Artículos con Stock Bajo**: Lista de los 5 artículos más críticos con link al detalle. El link "Ver todos" lleva a `/articulos?stockBajo=true`, cuya vista ampliada con valorización del faltante se documenta en la sección "Artículos" → "Valorización de Reposición en Stock Bajo"
- **Movimientos Recientes**: Últimas 5 entregas y reposiciones

#### Cálculo de Valuación
La valuación total del stock se calcula sumando:
1. Stock disponible de reposiciones confirmadas × costo unitario
2. Stock sin reposición × costo inicial estimado (si está definido)

### 9. Configuración del Dólar Oficial (14 de noviembre de 2026)

Guarda y reutiliza automáticamente el último valor del dólar oficial, compartido entre la creación de Artículos y Reposiciones, para no tener que tipearlo cada vez.

#### Comportamiento
- El sistema mantiene **un único valor global vigente** en la base de datos (tabla `configuracion_dolar`, una sola fila)
- Al abrir **"Nuevo Artículo"** o **"Nueva Reposición"**, el campo "Valor Dólar Oficial" se precarga automáticamente con ese valor
- Al **crear o editar** un artículo o una reposición con un valor de dólar distinto al vigente, el valor global se actualiza para las próximas operaciones
- Si el usuario **no modifica** el campo precargado, el valor vigente no cambia
- **No afecta valores históricos**: editar el valor global no modifica los `valorDolarCostoInicial`/`valorDolarOficial` ya guardados en artículos o reposiciones anteriores — cada uno mantiene su propio valor histórico
- **No consulta ninguna cotización externa** — es enteramente manual, administrado por los usuarios
- Al **duplicar** un artículo, se mantiene el comportamiento propio de esa función (copia el dólar del artículo original), no se pisa con el valor global
- Al **editar** un artículo o reponer un artículo existente, el campo sigue mostrando el valor histórico propio de ese registro (no se sobrescribe con el global al abrir la pantalla) — el valor global solo se actualiza al **guardar** con un valor distinto

#### Modelo de Datos
| Tabla | Campo | Notas |
|-------|-------|-------|
| `configuracion_dolar` | `valor_dolar_oficial` | `NUMERIC(10,2)`, el valor vigente |
| `configuracion_dolar` | `updated_at`, `updated_by` | Quién y cuándo lo actualizó por última vez |

#### API
```
GET /api/configuracion/dolar   # Valor vigente (o null si nunca se cargó ninguno)
```
Protegido con `requireAnyPermission` (alcanza con permiso de crear artículos **o** crear reposiciones).

#### Archivos
**Backend**:
- `database/migrations/029_add_configuracion_dolar.sql`
- `backend/src/repositories/configuracionDolar.repository.ts`
- `backend/src/controllers/configuracionDolar.controller.ts`
- `backend/src/routes/configuracionDolar.routes.ts`
- `backend/src/services/articulo.service.ts` (`create`/`update`) y `backend/src/services/stock.service.ts` (`createReposicion`/`updateReposicion`) actualizan el valor global
- `backend/src/services/dashboard.service.ts` expone `valorDolarOficialVigente` para la card del Dashboard

**Frontend**:
- `frontend/src/services/configuracionDolar.service.ts`
- `frontend/src/pages/articulos/ArticuloForm.tsx` y `frontend/src/pages/reposiciones/ReposicionForm.tsx` (precarga al crear)
- `frontend/src/pages/Dashboard.tsx` (card "Último Valor Dólar Oficial")

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

Módulo para visualizar el registro de movimientos de Artículos, Entregas, Reposiciones y Solicitudes de Cotización, más una pestaña específica con el uso de "Normalizar con IA" por usuario.

#### Acceso
- Menú lateral: **Auditoría** (sección Administración)
- URL: `/auditoria`
- Requiere permiso: `auditoria:leer`

#### Entidades Auditadas
El sistema registra automáticamente las operaciones sobre:
- **Artículos**: Creación, actualización y eliminación
- **Entregas**: Creación de entregas (descuento de stock)
- **Reposiciones**: Creación, actualización, confirmación y cancelación
- **Solicitudes de Cotización** (agregado 23 de noviembre de 2026): creación, actualización de cabecera, agregar ítems, actualizar un ítem (artículo/estado/precio/mark up/URL — antes no se registraba), marcar como cotizada, cancelar, y cada uso de "Normalizar con IA" (acción `normalizar_ia`, ver pestaña dedicada abajo)

**NO se auditan**: Clientes, Proveedores, Configuraciones (Rubros, Marcas), Usuarios, Roles.

#### Pestañas
- **Auditoría General**: el listado de siempre, con filtros por usuario/acción/módulo/fecha
- **Normalizar con IA** (nueva, 23 de noviembre de 2026): fija el filtro a `accion=normalizar_ia` y `entidad=solicitudes_cotizacion`. Muestra arriba un resumen en tarjetas con la **cantidad de usos por usuario** (`GET /api/audit/conteo-por-usuario`), y debajo el detalle de cada uso (fecha, usuario, cantidad de ítems detectados, largo del texto pegado), filtrable por usuario y rango de fechas igual que la pestaña general

#### Funcionalidades
- **Listado de eventos** con fecha, usuario, acción y módulo afectado
- **Filtros avanzados**:
  - Por usuario (dropdown)
  - Por tipo de acción (Creación, Actualización, Eliminación, Normalización IA)
  - Por módulo (Artículos, Entregas, Reposiciones, Solicitudes de Cotización)
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
    &accion=crear|actualizar|eliminar|normalizar_ia
    &entidad=articulos                      # Filtro por una entidad
    &entidades=articulos&entidades=entregas # Filtro por múltiples entidades
    &fechaDesde=2024-01-01
    &fechaHasta=2024-12-31
GET /api/audit/conteo-por-usuario # Agrupa por usuario (mismos filtros), para la pestaña "Normalizar con IA"
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
| H - Stock Mínimo | stockMinimo | Solo define el umbral de alerta de stock bajo, no afecta si el artículo queda activo |
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
- **Stock Mínimo = 0**: El artículo se crea **activo**, igual que cualquier otro (regla eliminada el 14 de noviembre de 2026, ver Changelog — antes lo marcaba incorrectamente como inactivo y eso lo excluía de la Valuación Total del dashboard)
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
1. **Subir archivo**: El usuario sube un Excel del cliente (o pega texto, ver más abajo) y opcionalmente selecciona el Cliente destinatario — **desde el 24 de noviembre de 2026 el Cliente ya no es obligatorio** — y carga un N° de Referencia del Cliente, N° de Cotización y Nombre de Cotización (todos opcionales)
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
| UNIDAD | unidadSolicitada | Opcional (agregado 23 de noviembre de 2026) |

Filas sin Descripción o sin Cantidad válida se omiten (se informa la cantidad de filas omitidas).

#### Normalización con IA (texto libre) — agregado 22-23 de noviembre de 2026

Además de subir un Excel con headers exactos, el cliente puede mandar el pedido como texto libre (mail, WhatsApp, lista pegada a mano, con o sin formato). Tanto en "Nueva Solicitud de Cotización" como en el panel "Agregar Artículos" de una solicitud existente (ver más abajo) hay un selector **Subir Excel / Pegar texto**:

- **Pegar texto**: un textarea donde se pega el texto tal cual, y un botón **"Normalizar con IA"**. Antes de ejecutar la llamada, se muestra un **popup de confirmación** ("tiene un costo asociado, ¿continuar?") porque varias personas del equipo usan el sistema y no todas saben que esto le pega a la API de Claude — "Cancelar" solo cierra el diálogo, no navega ni envía nada.
- Al confirmar, el backend (`POST /api/solicitudes-cotizacion/normalizar-texto`) manda el texto a la API de Claude (`backend/src/services/normalizadorItems.service.ts`, usando `client.messages.parse()` + `zodOutputFormat` de `@anthropic-ai/sdk` para forzar salida JSON estructurada) y devuelve un array de ítems con: **ETM**, **Descripción**, **Descripción en inglés**, **Marca**, **Modelo**, **Unidad** y **Cantidad** — todos opcionales salvo Descripción y Cantidad (si el texto no menciona cantidad, se asume 1). El modelo **no inventa** ETM/Descripción en inglés/Unidad: si el texto no los trae, quedan en `null`.
- **Modelo usado**: `claude-haiku-4-5` (antes `claude-sonnet-5` — se cambió a pedido de Nicole para probar costo/calidad; swap de un solo string en `normalizadorItemsService`, fácil de revertir). Costo aproximado: centavos de USD por uso, ya que es un solo llamado por normalización (no un agente, no hay loop ni llamados automáticos).
- **Requiere** la variable de entorno `ANTHROPIC_API_KEY` en el backend de Railway (cargada manualmente, no versionada).
- **Requiere Node 20+**: el SDK de Anthropic necesita `fetch` global (nativo desde Node 18, pero Railway buildeaba con Node 16.20.2 porque el `engines.node` del proyecto era `>=16.0.0`). Se subió a `>=20.0.0` tanto en el `package.json` raíz como en `backend/package.json` — el del backend es el que realmente importa, porque el servicio de Railway solo dispara un rebuild cuando cambia algo bajo `backend/**` (`watchPatterns` del servicio), así que un bump solo en el raíz pasa inadvertido.
- **Tabla de revisión editable**: después de normalizar (texto o Excel), se muestra una tabla con todos los campos editables a mano y un botón para eliminar filas, antes de confirmar. Arriba de la tabla hay **chips para mostrar/ocultar columnas** (ETM, Descripción en inglés, Marca, Modelo, Unidad — Descripción y Cantidad son siempre visibles), útil por ejemplo para ocultar "Descripción en inglés" si no aplica a ese pedido.
- Esta lógica de captura (toggle Excel/texto, parseo de Excel por header, llamado a la IA, tabla editable, chips de columnas) vive en un componente compartido: `frontend/src/components/solicitudesCotizacion/ItemsCaptureEditor.tsx`, reutilizado tanto en "Nueva Solicitud" como en "Agregar Artículos".

#### Agregar Artículos a una Solicitud Existente — agregado 22 de noviembre de 2026

Antes, el listado de ítems de una solicitud era estático: solo se podía cargar en el momento de crearla. Ahora, mientras la solicitud está **`en_revision`**, el botón **"Agregar Artículos"** (en la pantalla de detalle) abre un **popup modal** (no una sección inline — se probó así primero pero quedaba debajo de la tabla de ítems, fuera de vista sin hacer scroll, y daba la sensación de que el botón no hacía nada) con el mismo `ItemsCaptureEditor` de arriba: se puede subir otro Excel o pegar más texto, revisar la tabla, y confirmar.

Al confirmar, pega a `POST /api/solicitudes-cotizacion/:id/items`, que corre el **mismo algoritmo de matching** que al crear la solicitud (por ETM, por nombre, o sin match) para cada ítem nuevo, calcula el `orden` siguiente al máximo existente, y los inserta. Solo se habilita con la solicitud en `en_revision` (el backend lo valida igual).

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

#### Header de la Solicitud (cabecera + indicadores)
**Cabecera en una sola línea** (ajustado 24 de noviembre de 2026): Cliente, Fecha, N° de Cotización y Nombre de Cotización quedan en una fila (`flex`, no grid), todos con el mismo tamaño de letra. Cliente tiene un ancho máximo (160px, con truncado si no entra) para no competir por espacio con Nombre de Cotización, que sí se expande (`flex-1`). El input de N° de Cotización es angosto (64px, hasta 4 dígitos) y queda a la misma altura que el de Nombre.

**Indicadores**: una sola fila de 6 tarjetas compactas (unificadas el 24 de noviembre de 2026; antes Total/Cantidad de Items estaban separadas arriba, en tarjetas grandes) con label y valor lado a lado en una línea (`flex justify-between`, texto chico):
- **Total de Items**: cantidad de filas/artículos distintos solicitados (`solicitud.items.length`)
- **Cantidad de Items**: suma de todas las `cantidadSolicitada`
- **Con Coincidencia** / **Sin Coincidencia**: según `matchConfianza` (etm/nombre vs. sin_match) — calidad del matching automático
- **Aceptados** / **Pendientes de Revisión**: según si el ítem ya salió de `pendiente` o no — progreso de la revisión

#### Pantalla de Revisión (por cada ítem)
- **Solicitado**, **Sugerido** y **Aceptado** miden 150px cada una (ajustado 24 de noviembre de 2026, antes 240/220/220px — grilla más compacta para dejar lugar a columnas futuras); el texto largo hace wrap (`break-words`) en vez de desbordar o truncarse
- **Solicitado**: ETM, descripción, marca, unidad y cantidad tal como vinieron en el archivo (solo lectura)
- **Sugerido**: artículo matcheado por el sistema (código, nombre, marca, stock) con badge de confianza ("Coincide por ETM" / "Coincide por nombre"), o "Sin coincidencia". Si hay artículo, el nombre es un link que abre su detalle (`/articulos/:id`) en una pestaña nueva. **Columna independiente desde el 24 de noviembre de 2026** (ver "Fix: Sugerido vs. Aceptado" más abajo) — ya no se pisa al elegir manualmente otro artículo
- **Aceptado**: una vez confirmada una decisión, muestra el artículo del catálogo aceptado (en verde, también clickeable a su detalle), la compra externa aceptada (en ámbar, con link "Ver publicación"), o "No Disponible" si se marcó así sin una URL asociada. En los tres casos hay un botón **✕** para deshacer la decisión (vuelve a `pendiente` sin perder la sugerencia, la URL, o el artículo previamente elegido) y poder decidir de nuevo
- **Acciones disponibles** (columna angosta, labels cortos desde el 24 de noviembre de 2026):
  - **Aceptar sugerencia**: confirma el artículo sugerido por el sistema. Visible salvo que el ítem ya esté aceptado exactamente con ese artículo — si se aceptó otro a mano, el botón sigue disponible para volver a la sugerencia original
  - **Buscar otro** (antes "Buscar otro artículo"): abre un combobox ancho para elegir manualmente otro artículo del catálogo (permite artículos sin stock, ya que es para cotizar, no para descontar stock); tiene un botón **✕** para cancelar la búsqueda sin elegir nada y volver a ver las demás opciones
  - **MercadoLibre** (antes "Buscar en Mercado Libre"): abre en una pestaña nueva una búsqueda en Mercado Libre armada con **descripción + marca** del ítem (antes del 24 de noviembre de 2026 solo mandaba la descripción). Si el ítem no tiene ningún artículo matcheado, además lo marca como `no_disponible`; si ya hay una sugerencia del catálogo, es solo para comparar precio y no le pisa la sugerencia
  - **Google** (nuevo, 24 de noviembre de 2026): mismo mecanismo y mismo criterio de "no disponible" que MercadoLibre, pero contra una búsqueda de Google (`https://www.google.com/search?q=...`), también con descripción + marca
  - **No Disponible** (antes "Marcar como No Disponible"): acción directa (con confirmación) para marcar el ítem como no disponible en cualquier momento, sin pasar por una búsqueda externa
  - **URL** (antes "Pegar URL de producto"): permite pegar el link de un producto externo (ej. una publicación de Mercado Libre) como opción de compra para ese ítem. Una vez guardada la URL, se puede **Aceptar** (marca el ítem como `no_disponible`, guarda la URL) o **Declinar** (la descarta)
- **Precio Unitario**: campo editable por ítem (100px, ajustado 24 de noviembre de 2026 — primero se achicó a 75px junto con Mark Up, después se volvió a agrandar a 100px para que entren hasta 6 caracteres). Al aceptar un artículo del catálogo que tiene costo cargado (`costoInicialEstimado`) y el ítem todavía no tiene precio, se prellena con ese valor como punto de partida — siempre se puede sobreescribir a mano. La URL externa **no** trae precio automático; se carga siempre a mano
- **Mark Up**: campo editable por ítem (columna angosta desde el 24 de noviembre de 2026, la mitad del ancho anterior), número **entero** (`mark_up INTEGER`, migraciones 026-027). Es el margen que antes Nicole tipeaba a mano directamente en la columna P del Excel descargado (sin quedar guardado en ningún lado); ahora se carga en la app y con eso el sistema puede calcular el precio final también para el Excel Externo, que no tiene esa columna (ver más abajo). Sigue funcionando como porcentaje dentro de la fórmula (`(MarkUp+100)/100`), pero la UI no lo etiqueta ni lo formatea como tal — es un input numérico simple, no de moneda
- ~~Subtotal~~: columna eliminada de esta grilla el 24 de noviembre de 2026 (sigue existiendo en el comprobante de impresión, que está desactivado — ver `MOSTRAR_IMPRIMIR`)
- La grilla tiene ancho mínimo con scroll horizontal (columnas con `min-width`/`width` propio) para que ninguna columna quede cortada en pantallas chicas (ej. notebooks de 13"); los encabezados de Precio Unit. y Mark Up usan `whitespace-normal` para partirse en dos líneas en vez de forzar una sola

#### Fix: Sugerido vs. Aceptado pisándose entre sí (24 de noviembre de 2026)
Nicole reportó que, al buscar y aceptar manualmente otro artículo para un ítem, la columna "Sugerido" cambiaba — mostraba el artículo recién elegido a mano en vez de la sugerencia original del sistema. Causa: ambas columnas leían la misma columna de base `articulo_id`, que se sobreescribía al aceptar manualmente. Se agregó una columna nueva `articulo_id_sugerido` (migración 031) que se fija **una sola vez**, en el momento del matching automático (creación o "Agregar Artículos"), y nunca se vuelve a tocar — `articulo_id` sigue siendo el "aceptado" actual, mutable. El backfill de la migración asume que, para las solicitudes ya existentes al momento de aplicarla, nadie había pisado todavía la sugerencia original a mano (si alguien ya lo había hecho, no hay forma de recuperar cuál fue la sugerencia real, y el backfill deja `articulo_id_sugerido` igual al `articulo_id` actual).

#### Marcar como Cotizada
Solo se habilita cuando **todos** los ítems dejaron de estar `pendiente` y **todos** tienen precio unitario cargado. El backend valida esto antes de permitir el cambio de estado (`POST /solicitudes-cotizacion/:id/marcar-cotizada`).

#### Impresión de la Cotización
Botón "Imprimir Cotización" (mismo mecanismo que el comprobante de Entregas: HTML generado + `window.print()`). El documento muestra Descripción, Marca, Cantidad, Precio Unitario y Subtotal por ítem más el total — **no** incluye código interno, costos ni referencias a si el ítem viene de stock o se compra externamente, porque el documento va dirigido al cliente.

#### Sobre la Búsqueda en Mercado Libre
La API pública de Mercado Libre dejó de permitir búsquedas y consultas de productos sin autenticación OAuth desde abril de 2025 (confirmado: tanto `GET /sites/{site}/search` como `GET /items/{id}` devuelven 403 sin token). Por eso:
- La búsqueda abre Mercado Libre en una **pestaña nueva** con la búsqueda armada (no hay resultados embebidos en el sistema)
- **Embeber la página de Mercado Libre en un iframe no es viable**: el sitio manda headers `X-Frame-Options`/`Content-Security-Policy` que lo bloquean explícitamente, y ni siquiera el scraping server-side funciona (también devuelve 403, ML bloquea tráfico automatizado)
- El precio y la foto de un producto externo **no se traen automáticamente**: por eso el flujo de "Pegar URL" requiere cargar el precio a mano. Automatizarlo requeriría dar de alta una app en developers.mercadolibre.com.ar, autorizarla con una cuenta de ML y manejar tokens OAuth en el backend — quedó como mejora futura, no implementada

#### Exportar la Cotización (Excel Interno/Externo; Google Sheets reconectado pero sin cuenta autorizada)

Desde la pantalla de detalle hay dos botones: **"Descargar Excel Interno"** y **"Descargar Excel Externo"**, ambos generan un `.xlsx` real (con fórmulas, vía `exceljs`). El interno replica celda por celda el archivo que Nicole armaba a mano (`Downloads/2 - Cristián - TC Argentina - Cotización 8.20 - #274.xlsx`, usado como referencia), con todas las columnas incluidas costos y márgenes. El externo es el mismo archivo pero pensado para mandarle al cliente: **no incluye las columnas de Proveedor, Costo, Costo Total, Mark Up ni Venta con IVA** (columnas M-Q del interno) — se eliminan del todo, no se ocultan, porque un archivo que va al cliente con columnas ocultas se puede desocultar y mostrar el margen. Toda la lógica de armado vive en `backend/src/services/cotizacionExport.service.ts`: `buildCotizacionSheetData(solicitud, modo)` arma la matriz de datos, `buildCotizacionExcelBuffer(solicitud, modo)` el formato específico de xlsx (texto enriquecido, colores, merges, imágenes), con `modo: 'interno' | 'externo'` (default `'interno'`).

**Cómo funciona la exclusión de columnas sin romper los precios finales**: la lista `TODAS_LAS_COLUMNAS` describe las 24 columnas del archivo (ancho, color, si fusiona el header en dos filas, y si es `soloInterno`); el modo externo filtra las `soloInterno`. El problema es que Precio Unit. Sin IVA / Total Sin IVA (y su par en USD) **dependen** de Costo y Mark Up mediante fórmulas de Excel (`Q = N×((P+100)/100)`, `R = INT(Q/1.21)`, etc.) — si esas columnas no existen, no hay de dónde colgar la fórmula. Por eso:
- En modo **interno**, esas 4 columnas de precio final siguen siendo fórmulas en vivo (igual que siempre), editables si Nicole ajusta Costo o Mark Up a mano después de descargar.
- En modo **externo**, se calculan en TypeScript (`calcularPreciosItem()`, misma matemática que las fórmulas de Excel, `Math.floor` en vez de `INT()`) y se escriben como **valores fijos**, usando `item.precioUnitario` y el nuevo campo `item.markUp` (ver abajo) — ya no dependen de ninguna celda vecina.

**Mark Up por ítem** (nuevo campo, necesario para que el Excel Externo pueda calcular el precio final sin la columna Mark Up): columna `mark_up INTEGER` en `solicitud_cotizacion_items` (migración 026, tipada originalmente `NUMERIC(6,2)` y pasada a entero en la migración 027), editable en la grilla de revisión junto a Precio Unitario, como input numérico simple (no de moneda). Antes este valor solo existía tipeado a mano en la columna P del Excel descargado y nunca se guardaba en el sistema — por eso el Excel Externo no podía calcular nada sin él.

**Cabecera del archivo (filas 1-6)**:
- **B1**: título (cliente + "Cotización" + referencia)
- **B2**: "Fecha de Entrega:" (negrita+subrayado) + valor — campo editable `fechaEntrega`
- **B3**: "Lugar de Entrega:" (negrita+subrayado) + valor — campo editable `lugarEntrega`
- **B4**: "Solicitado por:" (negrita+subrayado) + valor — campo editable `solicitadoPor`
- **N4/O4**: "USD Oficial Compra" + valor con formato moneda — campo editable `usdOficialCompra`
- **N5/O5**: "USD Oficial Venta" + valor con formato moneda — campo editable `usdOficialVenta`
- **H1:H6** y **K1:K6**: logos institucionales (GE Vernova y HOFRA Group) embebidos en base64 en `backend/src/assets/logos.ts` (extraídos del archivo de referencia, siempre los mismos, no se suben por archivo aparte)

Nota: en el archivo de referencia original de Nicole la cabecera ocupaba las filas 1-5 (sin "Lugar de Entrega"); acá tiene una fila más y el header de columnas quedó en las filas 7-8 en vez de 6-7, ya que se corrió todo un renglón hacia abajo.

Los 5 campos editables se cargan en la pantalla de detalle, en la sección "Datos para el Excel de cotización" (arriba de la grilla de ítems), y se guardan solos al salir del campo — igual que el precio de los ítems. Se bloquean una vez que la solicitud deja de estar `en_revision`.

**Formato general de celdas**: todo el texto del archivo (título, etiquetas, valores de cabecera, encabezados de columna e ítems) queda centrado horizontal y verticalmente. Los anchos de columna y los altos de fila están calcados del archivo de referencia (más el renglón extra de "Lugar de Entrega"), incluyendo un ajuste explícito de `defaultColWidth=9` en la hoja para que las columnas A y T —cuyo ancho coincide justo con el default de `exceljs`— no pierdan su ancho al generarse el archivo.

**Exportar a Google Sheets — código reconectado, cuenta de Google suspendida**: el botón y las rutas de Google (`google.routes.ts`, `google.controller.ts`, endpoint `exportarGoogleSheets`) volvieron a estar montados en el backend ahora que corre en Railway (proceso Node normal, ya no aplica el límite de Vercel que forzó a desconectarlo el 2 de septiembre). Sin embargo, **Google suspendió la cuenta de Google Cloud usada para el OAuth**, marcándola como "creada por un bot" — Nicole apeló la suspensión, resultado pendiente. Hasta que se resuelva, el botón de exportar a Google Sheets no va a funcionar aunque el código esté activo. La tabla `google_integracion` (migración 023) sigue existiendo en la base, sin uso por ahora.

**Mapeo de columnas** (letras del **Excel Interno**; header partido en dos filas, 7 y 8, igual estructura que el archivo de referencia pero corrida un renglón por "Lugar de Entrega" — las columnas de título corto están fusionadas verticalmente). Las marcadas **"No" en Excel Externo** se eliminan del todo en ese archivo (las columnas posteriores se corren para ocupar su lugar, p. ej. R pasa a ser M):

| Columna | Contenido | Color de fondo | Formato | Fórmula (interno) / Valor (externo) | ¿En Excel Externo? |
|---|---|---|---|---|---|
| A-F: ITEM, DESCRIPCION, DESCRIPCION EN INGLES, ETM, MARCA, MODELO | Lo solicitado por el cliente | Celeste | — | Campos del ítem tal cual se importaron | Sí |
| G: CANT | Cantidad solicitada | Verde | — | — | Sí |
| H: Item Ofrecido - Descripción | Artículo aceptado del catálogo | Verde | — | `item.articulo.nombre` | Sí |
| I: Unidad de Medida | "Unidad" | Celeste, texto amarillo | — | Fijo, solo si hay artículo ofrecido | Sí |
| J: Marca, K: Modelo (del ofrecido) | Marca del artículo / vacío | Verde | — | `item.articulo.marca`; Modelo no se trackea, se completa a mano | Sí |
| L: Imagen de lo Ofrecido | Fórmula `=IMAGE(url)` | Verde | — | `articulo.imagenUrl` (Cloudinary), si existe | Sí |
| M: Proveedor | Proveedor del artículo, o la URL externa | Rojo, texto amarillo | — | `articulo.proveedorNombre` o `item.urlExterna` si es `no_disponible` | **No** |
| N: Costo por Unidad | Precio unitario cargado en la solicitud | Rojo, texto amarillo | — | `item.precioUnitario` | **No** |
| O: Costo Total | Fórmula `=Cant×Costo` | Rojo, texto amarillo | — | `=G{fila}*N{fila}` | **No** |
| P: Mark Up | Margen cargado en la solicitud | Rojo, texto amarillo | — | `item.markUp` | **No** |
| Q: Venta con IVA | Fórmula costo+markup | Rojo, texto amarillo | `"$" #,##0.00` | `=N{fila}*((P{fila}+100)/100)` | **No** |
| R: Precio Unit. Sin IVA | Fórmula quitando 21% IVA | Celeste | `"$" #,##0.00` | Interno: `=INT(Q{fila}/1.21)` · Externo: valor calculado en TS | Sí |
| S: Total Sin IVA | Fórmula | Celeste | `"$" #,##0.00` | Interno: `=G{fila}*R{fila}` · Externo: valor calculado | Sí |
| T | Separadora, sin contenido | Sin color | — | — | Sí |
| U: Precio Unit. Sin IVA (USD) | Fórmula convirtiendo a USD | Verde | `"USD" #,##0.00` | Interno: `=INT(R{fila}/$O$4*100)/100` (tipo de cambio Oficial Compra del header, referencia absoluta) · Externo: valor calculado | Sí |
| V: Total Sin IVA (USD) | Fórmula | Verde | `"USD" #,##0.00` | Interno: `=INT(G{fila}*U{fila}*100)/100` · Externo: valor calculado | Sí |
| W: Plazo de Entrega | — | Verde | — | **En blanco, se completa a mano en Excel** | Sí |
| X: Comentarios | — | Verde | — | **En blanco, se completa a mano en Excel** | Sí |

En el Excel Externo, R/S/U/V dejan de ser fórmulas (no hay N/P/Q de los que colgarlas) y se calculan en `calcularPreciosItem()` (`backend/src/services/cotizacionExport.service.ts`) con la misma matemática, usando `Math.floor` en lugar de `INT()` de Excel (equivalentes para valores no negativos).

El diseño intencional es que la app resuelve el matching/catálogo/cantidades/costo/mark up y arma toda la cadena de fórmulas, pero **Plazo de Entrega y Comentarios se completan a mano en el Excel después de descargarlo** — igual que en la planilla original de Nicole, donde esos datos se negocian/ajustan fuera del sistema. El separador de miles/decimales real que se ve en Excel depende de la configuración regional del programa (punto y coma en una instalación en español de Argentina), no del código de formato en sí — el código siempre usa `#,##0.00` con el símbolo de moneda literal (`$` o `USD`) según corresponda.

**Integración con Google (OAuth)**:
- Se conecta **una sola cuenta de Google** para todo el sistema (no por usuario) desde **Configuraciones → Google Drive**.
- Scopes usados: `drive.file` (solo archivos creados por la app, no todo el Drive) y `userinfo.email` (para mostrar con qué cuenta está conectado).
- El refresh token queda guardado en la tabla `google_integracion` (una sola fila; conectar una cuenta nueva reemplaza la anterior).
- Flujo: `GET /api/google/auth-url` arma el link de autorización → Google redirige a `GET /api/google/oauth/callback` → el backend intercambia el código por tokens y guarda el refresh token → redirige de vuelta a `/configuraciones?google=connected`.
- Google Sheets API y Drive API son gratuitas para este volumen de uso (no requieren cuenta de facturación; el límite gratuito es 500 requests/100s por proyecto).
- **Estado actual**: cuenta de Google Cloud suspendida (ver arriba) — no se puede completar el flujo OAuth hasta que se resuelva la apelación.

#### Modelo de Datos

| Tabla | Campo | Notas |
|-------|-------|-------|
| solicitudes_cotizacion | `cliente_id`, `numero_cotizacion`, `nombre_cotizacion`, `numero_referencia_cliente`, `nombre_archivo`, `fecha_solicitud`, `estado`, `observaciones`, `fecha_entrega`, `lugar_entrega`, `solicitado_por`, `usd_oficial_compra`, `usd_oficial_venta` | Cabecera. `cliente_id` es **opcional desde el 24 de noviembre de 2026** (migración 032, antes `NOT NULL`) — los queries que traen el cliente pasaron de `INNER JOIN` a `LEFT JOIN`. `numero_cotizacion` era un contador interno autoincremental desde 250 (migración 028); **desde la migración 032 es de ingreso manual** (se le sacó el `DEFAULT nextval(...)` y se borró la secuencia), independiente de `numero_referencia_cliente` (la referencia que trae el cliente, texto libre). `nombre_cotizacion` (migración 032) es un campo nuevo, también de ingreso manual. `fecha_entrega`...`usd_oficial_venta` son para el header del Excel (migraciones 024 y 025) |
| solicitud_cotizacion_items | `solicitud_id`, `orden`, `etm_solicitado`, `descripcion_solicitada`, `descripcion_ingles_solicitada`, `marca_solicitada`, `modelo_solicitado`, `unidad_solicitada`, `cantidad_solicitada`, `articulo_id`, `articulo_id_sugerido`, `match_confianza`, `estado_item`, `precio_unitario`, `mark_up`, `url_externa` | Detalle. `mark_up` es el margen del ítem, número entero (migraciones 026-027), usado para calcular el precio final en el Excel Externo. `unidad_solicitada` (migración 030, 23 de noviembre de 2026) es texto libre ("unidades", "cajas", "metros", etc.), detectado por la IA o por la columna UNIDAD del Excel — se ve en el detalle de la solicitud, pero **no** se agregó al Excel Externo/Interno de cotización final: ese archivo tiene un formato fijo calcado de una planilla de referencia, con fórmulas atadas a letras de columna hardcodeadas (`G`, `N`, `P`...), e insertar una columna ahí corre riesgo real de romperlas — decisión explícita de dejarlo afuera por ahora. `articulo_id_sugerido` (migración 031, 24 de noviembre de 2026) guarda la sugerencia original del matching automático, separada de `articulo_id` (el artículo aceptado actual, mutable) — ver "Fix: Sugerido vs. Aceptado" arriba |
| google_integracion | `refresh_token`, `connected_email`, `connected_at` | Una sola fila: la cuenta de Google conectada para exportar |

#### API
```
GET    /api/solicitudes-cotizacion                       # Lista paginada con filtros (estado, clienteId, busqueda)
GET    /api/solicitudes-cotizacion/:id                    # Ver detalle con items y matching
POST   /api/solicitudes-cotizacion/normalizar-texto       # Normaliza texto libre con IA (Claude) en items: etm/descripcion/descripcionIngles/marca/modelo/unidad/cantidad
POST   /api/solicitudes-cotizacion                        # Crear solicitud (clienteId opcional desde 24/11/2026; corre el matching automático por ítem)
PUT    /api/solicitudes-cotizacion/:id                    # Actualizar cabecera (N° y nombre de cotización, referencia, observaciones, fecha de entrega, lugar de entrega, solicitado por, USD oficial compra/venta)
POST   /api/solicitudes-cotizacion/:id/items              # Agregar ítems a una solicitud existente (solo en_revision; mismo matching que al crear)
PUT    /api/solicitudes-cotizacion/:id/items/:itemId      # Actualizar un ítem (artículo, estado, precio, mark up, URL externa)
POST   /api/solicitudes-cotizacion/:id/marcar-cotizada    # Marca como cotizada (valida que no queden ítems pendientes/sin precio)
POST   /api/solicitudes-cotizacion/:id/cancelar           # Cancela la solicitud
GET    /api/solicitudes-cotizacion/:id/exportar-excel          # Descarga el .xlsx interno (todas las columnas, con fórmulas)
GET    /api/solicitudes-cotizacion/:id/exportar-excel-externo  # Descarga el .xlsx externo (sin Proveedor/Costo/Costo Total/Mark Up/Venta con IVA)
POST   /api/solicitudes-cotizacion/:id/exportar-google-sheets  # Crea la planilla en el Drive conectado (sin uso mientras la cuenta de Google está suspendida)
```

Los endpoints de `/api/google/*` (auth-url, oauth/callback, status) ya están montados en `routes/index.ts` — dejaron de devolver 404 desde la reconexión del 6 de septiembre — pero el flujo OAuth en sí no completa mientras la cuenta de Google Cloud siga suspendida.

#### Archivos Relacionados

**Backend**:
- `backend/src/repositories/solicitudCotizacion.repository.ts`
- `backend/src/services/solicitudCotizacion.service.ts` (incluye el algoritmo de matching y `addItems`)
- `backend/src/services/normalizadorItems.service.ts` (llamado a Claude para normalizar texto libre)
- `backend/src/services/cotizacionExport.service.ts` (armado de la matriz de datos/fórmulas + generación del `.xlsx` con `exceljs`)
- `backend/src/services/google.service.ts` (OAuth2 y llamadas HTTP directas a Sheets/Drive vía `google-auth-library` — se evitó el paquete `googleapis` completo por pesar ~200MB y romper el empaquetado serverless de Vercel)
- `backend/src/repositories/googleIntegracion.repository.ts`
- `backend/src/controllers/solicitudCotizacion.controller.ts`, `backend/src/controllers/google.controller.ts`
- `backend/src/routes/solicitudCotizacion.routes.ts`, `backend/src/routes/google.routes.ts`
- `backend/src/repositories/articulo.repository.ts` (método `findByEtm()`)

**Frontend**:
- `frontend/src/pages/solicitudesCotizacion/SolicitudesCotizacionList.tsx`
- `frontend/src/pages/solicitudesCotizacion/SolicitudCotizacionUpload.tsx`
- `frontend/src/pages/solicitudesCotizacion/SolicitudCotizacionDetail.tsx` (incluye el modal "Agregar Artículos")
- `frontend/src/components/solicitudesCotizacion/ItemsCaptureEditor.tsx` (captura de ítems compartida: Excel/texto, IA, tabla editable, chips de columnas, confirmación de costo)
- `frontend/src/services/solicitudesCotizacion.service.ts`
- `frontend/src/services/google.service.ts`
- `frontend/src/pages/unidades/UnidadesList.tsx` (tab "Google Drive" en Configuraciones)

**Migraciones**:
- `database/migrations/019_add_solicitudes_cotizacion.sql`
- `database/migrations/020_add_url_externa_solicitud_items.sql`
- `database/migrations/021_rename_a_comprar_a_no_disponible.sql`
- `database/migrations/022_add_modelo_descripcion_ingles_solicitud_items.sql`
- `database/migrations/023_add_google_integracion.sql`
- `database/migrations/024_add_datos_cabecera_cotizacion.sql`
- `database/migrations/025_add_lugar_entrega_cotizacion.sql`
- `database/migrations/026_add_mark_up_solicitud_items.sql`
- `database/migrations/027_mark_up_a_entero.sql`
- `database/migrations/028_add_numero_cotizacion.sql`
- `database/migrations/030_add_unidad_solicitud_items.sql` (29 no existe: era de la rama del "Hofra AI Agent", revertida)
- `database/migrations/031_add_articulo_sugerido_solicitud_items.sql`
- `database/migrations/032_cotizacion_manual_cliente_opcional.sql`

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
- **Valor Total del Stock (ARS)** y, en un cuadro propio debajo, **Valor Total del Stock (USD)** — hasta el 14 de noviembre de 2026 este último solo sumaba las capas de reposiciones; el stock sin reposición (`costoInicialEstimadoUsd × stockSinCosto`) quedaba afuera del total en USD aunque sí se sumaba en ARS. Se corrigió en `articulo.service.ts` → `getValuacion()` para que sume ambos, igual que ya hacía el total en ARS
- **Costo Promedio Unitario (ARS)** — y el monto de **Costo Inicial Estimado** en la ficha del artículo, con el prefijo "ARS $" explícito para no confundirlo con el valor en USD que se muestra al lado
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

#### Ordenamiento clickeable en la grilla de Artículos (14 de noviembre de 2026)
Los headers "Código" y "Nombre" de `/articulos` son clickeables (ordenamiento controlado por el padre, no el sort local del `DataTable`, porque la grilla pagina server-side). Para **Código** se usa **orden natural** en vez de alfabético puro: los códigos no tienen ceros a la izquierda (ej. `AB1`, `AB2`, ..., `AB10`, `AB11`), así que un `ORDER BY` de texto normal pondría `AB10` antes que `AB2`. El backend (`articulo.repository.ts` → `buildOrderByClause()`) separa el prefijo de letras del número final y compara el número como entero. De paso, `sortBy` pasó a validarse contra una whitelist de columnas (antes se interpolaba sin validar en el `ORDER BY`, riesgo de inyección SQL).

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

### Formato de Números y Moneda (17 de noviembre de 2026)
Convención aplicada en **toda** la aplicación (no solo moneda):
- **Separador de miles/millones**: punto (`.`) — ej. `1.234.567`. Se usa `.toLocaleString('es-AR')` en vez de interpolar el número crudo, tanto en campos monetarios como en cantidades, stock, contadores y totales (incluye los componentes compartidos `Badge.tsx`/`StockBadge` y `DataTable.tsx`, que cubren varias pantallas a la vez)
- **Separador decimal**: coma (`,`), nunca punto
- **Importes en Pesos Argentinos (ARS)**: sin decimales (ej. `$125.500`, no `$125.500,00`) — se prescinde de los centavos en toda la app
- **Importes en Dólares (USD)**: siempre con 2 decimales fijos (ej. `USD 1.234,56`)
- **Campos no monetarios** (stock, cantidad, contadores): número entero con separador de miles, sin decimales
- Excepciones deliberadas (números que no llegan a necesitar separador en la práctica, no se tocaron): números de página, cantidad de rubros/marcas creados en un import, cantidad de ítems de una entrega/reposición, contadores de permisos/roles
- El campo de carga `CurrencyInput` (donde se *tipea* un importe) no se restringió — ahí sí puede tener sentido cargar centavos (ej. el valor del dólar)
- Las exportaciones a Excel/CSV (`ExportButtons.tsx`, cotizaciones) no se tocaron en este punto — ahí se prioriza la precisión del archivo generado sobre la visualización en pantalla

### Tipado de Exportaciones a Excel/CSV (14 de noviembre de 2026)
Revisión de **todos** los mecanismos de exportación del sistema para que el tipo de dato interno de cada celda sea el correcto (number/date/text reales, no todo convertido a texto), permitiendo sumar/ordenar/filtrar directamente en Excel sin conversiones manuales.

**Problema encontrado**: `ExportButtons.tsx` (usado en Artículos y Reportes) forzaba **todo** a `String(...)` antes de escribir la celda — números y fechas quedaban como texto en el Excel generado.

**Solución**: cada columna ahora declara `type: 'text' | 'number' | 'currency' | 'date'`:
- `number`/`currency` → se escribe como `Number` real de JS (la librería `xlsx` lo tipa como celda numérica automáticamente)
- `currency` además aplica el formato de celda `"$" #,##0.00` **sobre el valor numérico**, sin convertirlo a texto
- `date` → se escribe como `Date` de JS (`xlsx` la convierte sola en fecha real de Excel, con formato de fecha)
- Vacíos (`null`/`undefined`/`''`) → quedan como celda realmente vacía, no como texto `''` ni como `0`

**Reportes** (`ReportesPage.tsx`) exportaba un **CSV armado a mano** con `.toFixed(2)` y fechas formateadas como string `dd/MM/yyyy` — un CSV no puede tener "tipo de celda" (es texto plano). Se reemplazó por el mismo mecanismo tipado de `ExportButtons`, generando un `.xlsx` real.

**Cotizaciones** (`cotizacionExport.service.ts`, usa `exceljs`): "Costo por Unidad" y "Mark Up" usaban `''` en vez de `null` cuando no había valor cargado (mezclaba number/texto vacío en la misma columna), y "Costo por Unidad" no tenía formato de moneda asignado. Mismo fix de `'' → null` en "USD Oficial Compra/Venta" (fuente compartida con el export a Google Sheets).

#### Archivos
- `frontend/src/components/ExportButtons.tsx` (reescrito)
- `frontend/src/pages/articulos/ArticulosList.tsx` (actualizado al nuevo `type` en vez de `format`)
- `frontend/src/pages/reportes/ReportesPage.tsx` (CSV → xlsx tipado)
- `backend/src/services/cotizacionExport.service.ts`

### Ancho de Columnas en Exportaciones a Excel (19 de noviembre de 2026)
`ExportButtons.tsx` nunca seteaba el ancho de columna del archivo generado — sin esa configuración, Excel usa su ancho default (~8.43 caracteres), por lo que casi ningún campo de texto se veía completo al abrir el archivo sin agrandar las columnas a mano.

**Solución**: `ExportColumn<T>` ahora acepta un campo opcional `width` (en "caracteres", la unidad estándar de ancho de columna de xlsx). Al construir la hoja, `ExportButtons` setea `worksheet['!cols']` con el ancho de cada columna (`col.width` si se definió, o un default de 16 caracteres para las que no lo especifican) — confirmado a nivel de XML interno del `.xlsx` generado (`<cols><col ... customWidth="1"/>...`), por lo que Excel respeta esos anchos al abrir el archivo, no son solo una sugerencia.

En el export de Artículos (`ArticulosList.tsx`) se usó explícitamente en los campos con texto/números más largos: Nombre (40), Rubro (22), Proveedor (22), Último costo (18) y Costo estimado de reposición (26); además Código (6), Stock (5) y Stock Mínimo (12) se angostaron al ancho de su propio encabezado (a pedido de Nicole, estas 3 columnas contienen valores cortos y no necesitan más espacio que el título); el resto de las columnas usa el default de 16.

#### Archivos
- `frontend/src/components/ExportButtons.tsx` (`ExportColumn.width`, `worksheet['!cols']`)
- `frontend/src/pages/articulos/ArticulosList.tsx` (anchos explícitos en Nombre/Rubro/Proveedor/Último costo/Costo estimado de reposición)

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

### Infraestructura de Despliegue (actualizado 2 de septiembre de 2026)

| Componente | Dónde vive | Notas |
|---|---|---|
| **Frontend** | Railway (servicio `hofra/frontend`) + Vercel (`hofra-stock.vercel.app`, en paralelo) | Sitio estático servido con `serve -s dist` (paquete `serve`, script `start` en `frontend/package.json`), definido por `railway.frontend.json` (Railway no lee este archivo solo para el servicio de frontend — el Build/Start Command también están seteados a mano en el dashboard). Vercel se dejó activo como espejo, sin decidir aún si se deprecará |
| **Backend** | Railway (servicio `hofra/backend`) | Proceso Node normal (`node dist/app.js`), definido por `railway.json`. Ver "Por qué se movió de Vercel" más abajo |
| **Base de datos** | Railway (servicio Postgres, mismo proyecto) | Migrada desde Supabase — ver "Migración de la base de datos" más abajo. El backend se conecta por red **interna** de Railway (`${{Postgres.DATABASE_URL}}`), sin pooler ni problema de IPv6 |

El frontend le apunta al backend vía la variable de build `VITE_API_URL` (configurada como variable de build tanto en Vercel como en Railway), no por rutas relativas `/api` como antes.

#### Por qué el backend se movió de Vercel a Railway
Vercel aloja el backend como función serverless (`api/index.ts`, un wrapper Express). Al desplegar la integración con Google Sheets, la función empezó a crashear con `Error [ERR_REQUIRE_ESM]: require() of ES Module ... not supported` — un problema de fondo en cómo el builder de Vercel empaqueta un backend ESM (`"type": "module"`) dentro de una función que trata como CommonJS, no algo puntual del código de Google. Se probaron varios fixes (sacar dependencias pesadas, forzar `"type": "module"` en la raíz, importar desde `dist` en vez de `src`, cargar el backend con `import()` dinámico) y el error persistió idéntico en todos los casos, incluso con el código de Google completamente desconectado — señal de un límite de la plataforma, no del código. La solución fue mover el backend a **Railway**, que lo corre como proceso Node persistente (`backend/src/app.ts`, que ya existía y ya tenía todo lo necesario: `express().listen()`, manejo de errores, conexión a DB) — sin reempaquetado serverless, sin este problema.

`api/index.ts` y la config de función en `vercel.json` quedaron sin uso (el archivo se dejó en el repo como referencia, no se borró).

#### Conexión a Supabase: Transaction Pooler en vez de conexión directa
La conexión directa de Supabase (`db.[project-ref].supabase.co:5432`) resuelve **solo a una dirección IPv6** salvo que se pague el add-on de IPv4 dedicada. Railway (y varias plataformas más) no tienen salida IPv6, así que la conexión fallaba con `ENETUNREACH` a una IP `2600:...`. La solución es usar el **Transaction Pooler** de Supabase (Project Settings → Database → Connect → "Transaction pooler"), que corre sobre un proxy con IPv4:

```
postgresql://postgres.[project-ref]:[PASSWORD]@aws-<region>.pooler.supabase.com:6543/postgres
```

Notar el usuario `postgres.[project-ref]` (con punto, no dos puntos) y el puerto `6543` (no `5432`). `backend/src/config/database.ts` sigue teniendo el `dns.setDefaultResultOrder('ipv4first')` heredado de un fix anterior para Render — no está de más dejarlo, aunque desde la migración a Postgres de Railway (conexión interna, sin IPv6 de por medio) ya no es necesario para resolver el problema original.

**Nota histórica**: esta sección describe el problema que existía mientras la base vivía en Supabase. Ya no aplica desde la migración a Postgres de Railway (ver más abajo), pero se deja documentada por si en el futuro se vuelve a conectar a un Postgres externo con solo salida IPv6.

#### Migración de la base de datos: Supabase → Postgres de Railway (2 de septiembre de 2026)

Supabase empezó a forzar a Nicole a un plan pago costoso para seguir usando el proyecto, así que la base se migró a un servicio Postgres propio dentro del mismo proyecto de Railway donde ya viven `hofra/backend` y `hofra/frontend`. Pasos:

1. **Dump de Supabase**: `pg_dump --schema=public --no-owner --no-acl -F c` contra la conexión directa de Supabase (schema `public` únicamente, para no arrastrar los schemas internos de Supabase como `auth`/`storage`/`realtime`, que no existen en un Postgres genérico).
2. **Provisioning en Railway**: "+ New" → "Database" → "Add PostgreSQL" dentro del mismo proyecto. Se habilitó momentáneamente el acceso público ("Add Public Access", variable `DATABASE_PUBLIC_URL`) solo para poder correr el `pg_restore` desde afuera de Railway.
3. **Restore**: `pg_restore --no-owner --no-acl -d "<DATABASE_PUBLIC_URL>" hofra_backup.dump`.
4. **Verificación de integridad**: se compararon conteos exactos (`SELECT count(*)`) de las 16 tablas propias de la app entre Supabase y el Postgres nuevo — coincidieron exactamente en todas (`articulos`: 496, `audit_log`: 101, `solicitud_cotizacion_items`: 455, `refresh_tokens`: 97, etc.). *Ojo*: la primera verificación se hizo con `pg_stat_user_tables.n_live_tup`, que resultó ser una estimación desactualizada y además mezclaba tablas internas de Supabase (Auth/Storage) con las propias — dio números erróneos (muchos en cero) que no reflejaban la realidad. La verificación confiable es siempre `SELECT count(*)` directo por tabla.
5. **Cutover**: en `hofra/backend` → Variables, se cambió `DATABASE_URL` a la referencia interna `${{Postgres.DATABASE_URL}}` (nombre del servicio Postgres tal como aparece en el proyecto) y se redesplegó. Al ser el mismo backend (mismos `JWT_SECRET`/`JWT_REFRESH_SECRET`) y haberse migrado también la tabla `refresh_tokens`, las sesiones activas siguieron funcionando sin tener que volver a loguearse.
6. **Prueba end-to-end**: login y edición de datos desde el frontend confirmados contra la base nueva.

El proyecto de Supabase se deja activo unos días como respaldo antes de decidir decomisionarlo — no se borra en esta etapa.

### Variables de Entorno (.env)

```env
# Base de datos: Postgres de Railway (mismo proyecto que el backend) — conexión interna, sin pooler
DATABASE_URL=${{Postgres.DATABASE_URL}}

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

# Google (exportar Solicitudes de Cotización a Google Sheets) — integración en pausa, ver módulo 16
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=https://tu-dominio/api/google/oauth/callback
```

En el **frontend** (Vercel), además se configura `VITE_API_URL=https://<tu-backend>.up.railway.app/api` como variable de build.

Las credenciales de Google se generan en console.cloud.google.com (proyecto propio, con Sheets API y Drive API habilitadas, y un cliente OAuth de tipo "Aplicación web"). No requieren cuenta de facturación para este volumen de uso. La integración quedó desconectada del árbol de rutas del backend (ver sección "Solicitudes de Cotización") hasta reconstruirla sobre Railway.

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
npm run reset-data       # (dentro de backend/) Borra datos operativos (articulos, marcas, rubros,
                          # proveedores, clientes, reposiciones, entregas, sugerencias, cotizaciones)
                          # para reimportar desde cero. Mantiene usuarios/roles/permisos.
                          # Pide confirmación escribiendo "BORRAR" antes de ejecutar.
                          # Ver backend/src/scripts/reset-data.ts y database/scripts/clean_database_keep_users.sql
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
23. **024_add_datos_cabecera_cotizacion.sql**: Datos de cabecera para el Excel de la cotización
    - Campos `fecha_entrega DATE`, `solicitado_por VARCHAR(200)`, `usd_oficial_compra NUMERIC(10,2)`, `usd_oficial_venta NUMERIC(10,2)` en `solicitudes_cotizacion`
24. **025_add_lugar_entrega_cotizacion.sql**: Lugar de Entrega para el Excel de la cotización
    - Campo `lugar_entrega VARCHAR(300)` en `solicitudes_cotizacion`
25. **026_add_mark_up_solicitud_items.sql**: Mark Up por ítem de cotización
    - Campo `mark_up NUMERIC(6,2)` en `solicitud_cotizacion_items`
26. **027_mark_up_a_entero.sql**: Mark Up pasa a número entero
    - `mark_up` cambia de `NUMERIC(6,2)` a `INTEGER`
27. **028_add_numero_cotizacion.sql**: Número de Cotización interno
    - Secuencia `solicitudes_cotizacion_numero_seq` arrancando en 250 y campo `numero_cotizacion INTEGER UNIQUE` en `solicitudes_cotizacion`, con default `nextval(...)` — las solicitudes existentes al momento de la migración quedan con este campo en `NULL` (decisión explícita: no se renumeran retroactivamente)
28. **030_add_unidad_solicitud_items.sql**: Unidad de medida por ítem de cotización
    - Campo `unidad_solicitada VARCHAR(50)` en `solicitud_cotizacion_items`, detectado por la IA o por la columna UNIDAD del Excel (029 no existe: era de la rama del "Hofra AI Agent", revertida antes de llegar a producción)
29. **031_add_articulo_sugerido_solicitud_items.sql**: Sugerido vs. Aceptado por separado
    - Campo `articulo_id_sugerido UUID` en `solicitud_cotizacion_items`, fijado una sola vez en el matching automático; `articulo_id` sigue siendo el aceptado actual (mutable). Backfill: `articulo_id_sugerido = articulo_id` para las filas existentes (asume que ninguna ya había sido reasignada a mano)
30. **032_cotizacion_manual_cliente_opcional.sql**: Cotización manual + Cliente opcional
    - `numero_cotizacion` deja de ser autoincremental (se le saca el `DEFAULT nextval(...)` y se borra `solicitudes_cotizacion_numero_seq`), pasa a ingreso manual
    - Campo nuevo `nombre_cotizacion VARCHAR(255)`, también de ingreso manual
    - `cliente_id` pasa a ser `NULL`-able (antes `NOT NULL`)

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
| Base de Datos | PostgreSQL (Railway) |
| Autenticación | JWT (jsonwebtoken, bcryptjs) |
| Imágenes | Cloudinary / Almacenamiento local |
| Validación | Zod (compartido entre frontend y backend) |

---

*Documentación actualizada el 6 de septiembre de 2026*

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

---

### 2 de septiembre de 2026

#### Incidente: caída total del backend y migración de Vercel a Railway

Al desplegar la integración de Google Sheets (ver 31 de agosto), la función serverless de Vercel empezó a crashear con `Error [ERR_REQUIRE_ESM]: require() of ES Module ... not supported` — y afectaba **todo** `/api/*`, no solo las rutas de Google (incluido `/api/health`, sin ninguna dependencia). Se probaron, en orden, sin éxito (el error persistió idéntico en cada intento):

1. Sacar el paquete `googleapis` (~207MB) y reemplazarlo por `google-auth-library` (~800KB), sospechando un límite de tamaño de la función.
2. Agregar `"type": "module"` al `package.json` de la raíz, para que Vercel tratara `api/index.ts` como ES Module (coherente con el backend).
3. Hacer que `api/index.ts` importe desde `backend/dist` (ya compilado) en vez de `backend/src` (fuente TypeScript), para sacarle a Vercel la transpilación propia.
4. Desconectar el código de Google del árbol de rutas por completo — **el error siguió igual**, confirmando que nunca fue un problema del código de Google.
5. Revertir `api/index.ts` y el `package.json` raíz al último commit confirmado como funcionando — **el error siguió igual**, algo cambió en el entorno de Vercel/Node entre medio, no en el código.
6. Reescribir `api/index.ts` para cargar el backend con `import()` dinámico en vez de `import` estático (la solución que el propio mensaje de error sugiere) — **el error siguió idéntico**, letra por letra, indicando que Vercel transpila igual el `import()` dinámico de vuelta a `require()` al compilar a CommonJS.

Con seis intentos técnicamente distintos dando el mismo resultado exacto, se descartó seguir parcheando y se decidió migrar el backend a **Railway**, que lo corre como proceso Node persistente en vez de reempaquetarlo como función serverless — eliminando esta categoría de problema de raíz. `backend/src/app.ts` (un servidor Express completo con `.listen()`) ya existía y no necesitó cambios; el único trabajo fue de infraestructura (`railway.json`, variables de entorno, simplificar `vercel.json` para que solo sirva el frontend).

**Segundo problema encontrado en el camino**: una vez en Railway, la conexión a Supabase fallaba con `ENETUNREACH` a una dirección IPv6 — la conexión "directa" de Supabase (`db.[project].supabase.co`) resuelve solo a IPv6 salvo que se pague el add-on de IPv4, y Railway no tiene salida IPv6. Se resolvió cambiando `DATABASE_URL` a la cadena del **Transaction Pooler** de Supabase (`aws-<region>.pooler.supabase.com:6543`, usuario `postgres.[project-ref]`), que sí tiene IPv4. De paso se corrigió `testConnection()` en `database.ts`, que tragaba el error real y solo logueaba "connection failed" — sin ese fix hubiera sido mucho más difícil de diagnosticar.

**Resultado**: sistema restaurado, backend en Railway, frontend sin cambios en Vercel, base de datos sin cambios en Supabase (solo cambió la cadena de conexión). La integración de Google Sheets queda en pausa (código intacto, desconectado) para retomar sobre Railway más adelante. Nicole también planea migrar el frontend y la base de datos a Railway a futuro (Supabase le está resultando caro) — queda pendiente, sin apuro, para no repetir una migración bajo presión.

#### Archivos Nuevos
- `railway.json` (config de build/start para Railway)

#### Archivos Modificados
- `vercel.json` - Ya no buildea ni sirve `/api`; solo `shared` + `frontend`, rewrite genérico a `index.html`
- `api/index.ts` - Reescrito para cargar el backend con `import()` dinámico (mitigación intentada; quedó así aunque el fix real fue migrar a Railway)
- `backend/src/config/database.ts` - `testConnection()` ahora loguea el error real en vez de tragarlo
- `backend/src/routes/index.ts`, `backend/src/controllers/solicitudCotizacion.controller.ts`, `backend/src/routes/solicitudCotizacion.routes.ts` - Google Sheets desconectado (imports y rutas comentados/removidos)
- `backend/package.json` - `googleapis` reemplazado por `google-auth-library`

---

#### Migración del frontend a Railway y de la base de datos de Supabase a Postgres de Railway

Continuando la migración de infraestructura del mismo día, se movió también el frontend a Railway (queda además en Vercel como espejo, sin decidir aún si se deprecará) y la base de datos completa de Supabase a un servicio Postgres dentro del mismo proyecto de Railway — motivado por Supabase forzando a Nicole a un plan pago caro.

**Frontend**: se agregó el paquete `serve` y un script `start` (`serve -s dist -l ${PORT:-3000}`) a `frontend/package.json`, y se creó `railway.frontend.json` con el build/start command para Railway. Railway no leyó ese archivo para el servicio de frontend (autodetectó comandos propios, incluyendo el build del backend por error) — hubo que pisar el Build Command y el Start Command a mano en el dashboard del servicio. También hubo que ajustar el puerto del dominio generado (Railway asignó `PORT=8080` en runtime pese a haber elegido 3000 al generar el dominio).

**Base de datos**: dump completo de Supabase (`pg_dump --schema=public --no-owner --no-acl -F c`) restaurado en un Postgres nuevo provisionado dentro del proyecto de Railway (`pg_restore` vía el endpoint público temporal del servicio). Verificación por conteo exacto de filas (`SELECT count(*)`) confirmó paridad total en las 16 tablas propias de la app antes de cortar. El backend se re-apuntó a la nueva base vía la referencia interna de Railway (`DATABASE_URL=${{Postgres.DATABASE_URL}}`) y se redesplegó; al conservar los mismos JWT secrets y haber migrado `refresh_tokens`, las sesiones activas no se vieron afectadas. Ver la sección "Migración de la base de datos" en Configuración → Infraestructura de Despliegue para el detalle paso a paso. Supabase se deja activo unos días como respaldo antes de decomisionarlo.

#### Archivos Nuevos
- `railway.frontend.json` (config de build/start para el frontend en Railway)

#### Archivos Modificados
- `frontend/package.json` - Agregado `serve` y script `start`
- Variables de entorno del backend en Railway - `DATABASE_URL` apunta ahora al Postgres de Railway (antes: Transaction Pooler de Supabase)

---

### 6 de septiembre de 2026

#### Rediseño del header del Excel de cotización, reconexión de Google Sheets y cadena de fórmulas de precios

Con el backend ya estable en Railway, se retomó la integración de Google Sheets (código reconectado: `googleRoutes` montado de nuevo en `routes/index.ts`, `exportarGoogleSheets` restaurado en el controller/rutas de Solicitudes de Cotización — la UI del frontend nunca se había desconectado). Al intentar probarla, **Google suspendió la cuenta de Google Cloud usada para el OAuth**, marcándola como "creada por un bot". Nicole apeló la suspensión; mientras se resuelve, el trabajo se redirigió a mejorar el archivo Excel (que de todas formas sigue siendo el flujo principal de descarga).

**Header del archivo** (antes genérico, ahora calcado del archivo real de Nicole): título en B1, "Fecha de Entrega"/"Solicitado por" en B2/B3 con negrita+subrayado, par de celdas "USD Oficial Compra"/"USD Oficial Venta" en N3-O4 con formato moneda, y los logos de GE Vernova y HOFRA Group embebidos como imágenes en H1:H5/K1:K5 — extraídos directo del archivo de referencia (`Downloads/2 - Cristián - TC Argentina - Cotización 8.20 - #274.xlsx`) y guardados en base64 en `backend/src/assets/logos.ts`, sin depender de que Nicole los suba cada vez. Se agregaron 4 campos nuevos a `solicitudes_cotizacion` (`fecha_entrega`, `solicitado_por`, `usd_oficial_compra`, `usd_oficial_venta`, migración 024) editables desde la pantalla de detalle.

**Columnas de la tabla de ítems**: se detectó que faltaban columnas respecto al archivo de referencia (T separadora, U/V segundo par Precio/Total Sin IVA en USD, W Plazo de Entrega, X Comentarios) y que el header iba partido en dos filas (6 y 7, con fusión vertical en las columnas de título corto) en vez de una sola. Se replicaron exactamente, incluyendo los colores de fondo/fuente del archivo original (celeste para los datos "Solicitado" + primer par de precio, verde para "Ofrecido" + segundo par + Plazo/Comentarios, rojo con texto amarillo para Proveedor/Costo/Mark Up/Venta con IVA).

**Cadena de fórmulas de precios**: Mark Up (P), Plazo de Entrega (W) y Comentarios (X) quedan en blanco para completar a mano en Excel después de descargar — igual que en la planilla original, donde esos datos se negocian fuera del sistema. Costo (N) toma el `precioUnitario` ya cargado en la solicitud (ver cambio del 7 de septiembre más abajo). El resto es fórmula en vivo: Costo Total = `G×N`, Venta con IVA = `N×((P+100)/100)`, Precio Unit. Sin IVA = `INT(Q/1.21)`, Total Sin IVA = `G×R`, y el segundo par en USD convierte usando el tipo de cambio Oficial Compra del header (`$O$4` desde el 7 de septiembre, referencia absoluta): `INT(R/$O$4*100)/100` y `INT(G×U*100)/100`.

#### Archivos Nuevos
- `backend/src/assets/logos.ts` (logos institucionales en base64)
- `database/migrations/024_add_datos_cabecera_cotizacion.sql`

#### Archivos Modificados
- `backend/src/routes/index.ts` - `googleRoutes` montado de nuevo
- `backend/src/controllers/solicitudCotizacion.controller.ts`, `backend/src/routes/solicitudCotizacion.routes.ts` - `exportarGoogleSheets` restaurado
- `backend/src/services/cotizacionExport.service.ts` - Reescrito: header de 5 filas con texto enriquecido/logos/moneda, header de ítems en dos filas con merges y colores, columnas T-X, cadena de fórmulas de precios
- `backend/src/repositories/solicitudCotizacion.repository.ts`, `backend/src/services/solicitudCotizacion.service.ts` - `updateHeader()` acepta los 4 campos nuevos
- `shared/src/types/index.ts`, `shared/src/validators/index.ts` - Campos `fechaEntrega`/`solicitadoPor`/`usdOficialCompra`/`usdOficialVenta` en `SolicitudCotizacion` y su DTO de actualización
- `frontend/src/pages/solicitudesCotizacion/SolicitudCotizacionDetail.tsx` - Sección "Datos para el Excel de cotización" con los 4 campos editables (guardado automático al salir del campo)

### 7 de septiembre de 2026

#### Fix: los campos de cabecera no llegaban al Excel + Costo por Unidad automático + Lugar de Entrega + formato general

**Bug encontrado**: `fecha_entrega`, `solicitado_por`, `usd_oficial_compra` y `usd_oficial_venta` se guardaban bien en la base, pero `mapToConRelaciones()` (en `solicitudCotizacion.repository.ts`) armaba el objeto de respuesta con una lista fija de campos que no incluía esos 4 — se perdían cada vez que se releía la solicitud, incluido el momento de generar el Excel. Se agregaron al mapeo, con `Number()` explícito en los dos campos USD (Postgres devuelve `NUMERIC` como string).

**Costo por Unidad (columna N) ya no es manual**: ahora toma directamente el `precioUnitario` cargado en la solicitud, en vez de quedar en blanco para completar a mano.

**Anchos/altos del Excel calcados del archivo de referencia**: se agregó el alto de fila exacto (título/fecha/etc. 20, fila del logo 11, header de columnas 24, ítems 50) y se detectó que `exceljs` omite el `<col>` de una columna cuando su ancho coincide justo con el default de la librería (9) — pasaba con las columnas A y T, que quedaban sin ancho explícito y Excel las mostraba con SU default (8.43) en vez de 9. Se fuerza `defaultColWidth: 9` en la hoja para evitarlo. También se centraron los títulos de columna (antes sin alineación).

**Lugar de Entrega** (nuevo campo, debajo de Fecha de Entrega): columna `lugar_entrega VARCHAR(300)` en `solicitudes_cotizacion` (migración 025), editable en la pantalla de detalle junto a los otros 4 campos de cabecera. En el Excel agrega una fila nueva (B3, entre Fecha de Entrega y Solicitado por), corriendo todo lo que estaba debajo un renglón: Solicitado por/USD Oficial Compra pasan de la fila 3 a la 4, USD Oficial Venta de la 4 a la 5, la fila en blanco de los logos de la 5 a la 6, y el header de columnas de las filas 6-7 a las filas 7-8 (los ítems ahora arrancan en la fila 9, no en la 8). Los logos institucionales se estiraron una fila más (H1:H6/K1:K6) para seguir cubriendo todo el bloque de cabecera. La fórmula de conversión a USD, que usa una referencia absoluta al tipo de cambio Oficial Compra, pasó de `$O$3` a `$O$4`.

**Todo el texto del archivo centrado**: título, etiquetas, valores de cabecera, encabezados de columna e ítems — se aplica un centrado horizontal+vertical global sobre todas las celdas usadas de la hoja, al final de `buildCotizacionExcelBuffer()`, preservando el wrap de texto donde ya estaba activado.

**Formato moneda en las columnas de precio**: Q (Venta con IVA), R (Precio Unit. Sin IVA) y S (Total Sin IVA) quedan con formato `"$" #,##0.00`; U y V (el par en USD) con `"USD" #,##0.00`. El separador de miles/decimales que se ve (punto/coma) depende de la configuración regional de Excel, no del código de formato.

#### Archivos Nuevos
- `database/migrations/025_add_lugar_entrega_cotizacion.sql`

#### Archivos Modificados
- `backend/src/repositories/solicitudCotizacion.repository.ts` - Fix de `mapToConRelaciones()` (campos de cabecera faltantes), soporte de `lugar_entrega` en `updateHeader()`
- `backend/src/services/cotizacionExport.service.ts` - Costo por Unidad desde `precioUnitario`, fila de Lugar de Entrega (corrimiento de filas 3→9), `defaultColWidth`, alturas de fila, centrado global, formato moneda Q/R/S/U/V
- `shared/src/types/index.ts`, `shared/src/validators/index.ts` - Campo `lugarEntrega` en `SolicitudCotizacion` y su DTO de actualización
- `frontend/src/pages/solicitudesCotizacion/SolicitudCotizacionDetail.tsx` - Campo "Lugar de Entrega" en la sección "Datos para el Excel de cotización"

#### Excel Interno/Externo + Mark Up por ítem

**Objetivo**: el archivo que se le manda al cliente no debe mostrar Proveedor, Costo, Costo Total, Mark Up ni Venta con IVA (columnas M-Q) — información puramente interna. El botón único "Exportar a Excel" se separó en dos: **"Descargar Excel Interno"** (el de siempre, todas las columnas) y **"Descargar Excel Externo"** (nuevo, sin esas 5 columnas).

**El problema real no era sacar columnas, era el Mark Up**: Precio Unit. Sin IVA / Total Sin IVA y su par en USD (R, S, U, V) son fórmulas que dependen de Costo (N) y Mark Up (P) — sin esas columnas no hay de dónde colgarlas. Costo ya se resolvió el 7 de septiembre (viene de `precioUnitario`), pero **Mark Up nunca se guardaba en ningún lado**: Nicole lo tipeaba a mano directamente en la columna P del Excel ya descargado. Se agregó `mark_up NUMERIC(6,2)` a `solicitud_cotizacion_items` (migración 026), editable por ítem en la grilla de revisión (mismo patrón que Precio Unitario). Con Costo y Mark Up ya conocidos por el sistema, el Excel Externo calcula R/S/U/V como **valores fijos en TypeScript** (`calcularPreciosItem()`, misma matemática que las fórmulas de Excel) en vez de fórmulas — y esos valores no dependen de ninguna columna que se haya sacado. El Excel Interno no cambió: sigue usando fórmulas en vivo, ahora simplemente con Mark Up pre-cargado si ya se completó en la app (igual que ya pasaba con Costo).

Se evaluó armar el Excel "en la web" (una previsualización/editor propio) como alternativa, pero se descartó: no resolvía el problema de fondo (falta el dato de Mark Up) y sumaba una superficie nueva para mantener sin necesidad — la solución real era simplemente capturar ese dato en la app.

**Refactor de `cotizacionExport.service.ts`**: las 24 columnas (ancho, color de header, si fusiona filas 7-8, y si es exclusiva del interno) pasaron a describirse en una sola lista de datos (`TODAS_LAS_COLUMNAS`); tanto `buildCotizacionSheetData()` como `buildCotizacionExcelBuffer()` reciben un parámetro `modo: 'interno' | 'externo'` y arman header/colores/anchos/merges filtrando esa lista, en vez de tener arrays de columnas hardcodeados por separado para cada variante — así ambos modos no se pueden desincronizar entre sí a futuro.

##### Archivos Nuevos
- `database/migrations/026_add_mark_up_solicitud_items.sql`

##### Archivos Modificados
- `backend/src/services/cotizacionExport.service.ts` - Reescrito sobre una lista de columnas data-driven (`TODAS_LAS_COLUMNAS`), parámetro `modo` en ambas funciones de armado, `calcularPreciosItem()` para los valores fijos del externo
- `backend/src/controllers/solicitudCotizacion.controller.ts`, `backend/src/routes/solicitudCotizacion.routes.ts` - Nuevo endpoint `exportarExcelExterno` / `GET .../exportar-excel-externo`
- `backend/src/repositories/solicitudCotizacion.repository.ts` - `mark_up` en `updateItem()` y en el mapeo de `getItems()`
- `shared/src/types/index.ts`, `shared/src/validators/index.ts` - Campo `markUp` en `SolicitudCotizacionItem` y su DTO de actualización
- `frontend/src/services/solicitudesCotizacion.service.ts` - Método `exportarExcelExterno()`
- `frontend/src/pages/solicitudesCotizacion/SolicitudCotizacionDetail.tsx` - Botones renombrados ("Descargar Excel Interno"/"Descargar Excel Externo"), columna "Mark Up" editable en la grilla de ítems

##### Ajustes de UI (mismo día)
- **Mark Up es un número entero, no moneda**: pasó de `CurrencyInput` (formato con coma decimal y separador de miles, pensado para plata) a un `<input type="number" step="1">` simple. La columna `mark_up` se convirtió de `NUMERIC(6,2)` a `INTEGER` (migración 027) para reflejar esto en la base también
- **"Datos para el Excel de cotización" en un solo renglón**: el grid de Fecha/Lugar de Entrega, Solicitado por y USD Oficial Compra/Venta pasó de `md:grid-cols-4` (se partía en dos líneas) a `md:grid-cols-5`, para que los 5 campos entren en una fila en pantallas medianas/grandes
- **Botones de acción arriba de la grilla de ítems**: "Descargar Excel Interno/Externo", "Exportar a Google Sheets", "Imprimir Cotización", "Cancelar Solicitud" y "Marcar como Cotizada" se movieron de debajo de la tabla de ítems a arriba (entre las tarjetas de indicadores y la tabla), para no tener que scrollear hasta el final para volver a descargar/exportar

### 7 de septiembre de 2026 (continuación) — Número de Cotización y botones ocultos temporalmente

**Número de Cotización**: nuevo campo `numero_cotizacion` en `solicitudes_cotizacion` (migración 028), un contador interno que arranca en 250 y se autoincrementa vía secuencia de Postgres (`solicitudes_cotizacion_numero_seq`) cada vez que se crea una solicitud nueva — no requiere lógica en la app, el default de la columna llama a `nextval()` en cada INSERT. Es distinto de `numero_referencia_cliente` (la referencia que trae el cliente en su archivo, sigue existiendo igual que antes, texto libre). Las solicitudes creadas antes de esta migración quedan con `numero_cotizacion = NULL` (decisión explícita: no se renumeran retroactivamente, ver `documentacion.md` → migración 028). En la pantalla de detalle, la tarjeta que decía "Referencia del Cliente" ahora muestra **"Cotización Número"** con este nuevo campo.

**Botones ocultos temporalmente**: "Exportar a Google Sheets" (igual no funciona mientras la cuenta de Google esté suspendida) e "Imprimir Cotización" se ocultan de la pantalla de detalle a pedido de Nicole. No se borró el código: `SolicitudCotizacionDetail.tsx` tiene dos constantes (`MOSTRAR_EXPORTAR_GOOGLE_SHEETS`, `MOSTRAR_IMPRIMIR`, ambas en `false`) que controlan la visibilidad — para reactivarlos alcanza con volverlas `true`.

#### Archivos Nuevos
- `database/migrations/028_add_numero_cotizacion.sql`

#### Archivos Modificados
- `shared/src/types/index.ts` - Campo `numeroCotizacion` en `SolicitudCotizacion`
- `backend/src/repositories/solicitudCotizacion.repository.ts` - `numero_cotizacion` en el mapeo de `mapToConRelaciones()`
- `frontend/src/pages/solicitudesCotizacion/SolicitudCotizacionDetail.tsx` - Tarjeta "Cotización Número" en vez de "Referencia del Cliente"; botones de Google Sheets e Imprimir detrás de flags `MOSTRAR_*`

### 9-14 de noviembre de 2026 — Reset de datos, fixes de ordenamiento/valuación, buscador de Entregas/Reposiciones, sesión de 2hs

Tanda de cambios a partir de una ronda de pruebas de Nicole con un import real de ~666 artículos (tras resetear la base para repetir el import varias veces).

#### Script de reset de datos para reimportar
Antes no existía forma de vaciar los datos operativos sin tocar usuarios/roles. Se armó `backend/src/scripts/reset-data.ts`, que corre `database/scripts/clean_database_keep_users.sql` contra `DATABASE_URL` (pidiendo confirmación escribiendo "BORRAR"). El SQL ya existía pero estaba incompleto: le faltaban `solicitud_cotizacion_items`/`solicitudes_cotizacion` (migración 019, agregada después) y no reseteaba el correlativo `solicitudes_cotizacion_numero_seq`. Se completó y se agregó el comando `reset-data` a `backend/package.json`.

##### Archivos Nuevos
- `backend/src/scripts/reset-data.ts`

##### Archivos Modificados
- `database/scripts/clean_database_keep_users.sql` - Agrega truncate de solicitudes de cotización y reinicio de la secuencia de número de cotización
- `backend/package.json` - Script `reset-data`

#### Fix: orden alfabético por Código salía mal (AB1, AB10, AB100... antes que AB2)
Los códigos de artículo no tienen ceros a la izquierda (`${prefijo}${siguienteNum}` en `articuloService.generateCodigo()`), así que un `ORDER BY codigo` de texto plano compara caracter por caracter y pone "AB10" antes que "AB2". Se agregó ordenamiento clickeable en los headers "Código" y "Nombre" de `/articulos` (antes no eran sorteables), con **orden natural** para Código: se separa el prefijo de letras del número final y se compara el número como `bigint`. De paso, `sortBy` pasó a validarse contra una whitelist de columnas en vez de interpolarse directo en el SQL (riesgo de inyección preexistente). `DataTable.tsx` ganó soporte de sorting "controlado" (`sortConfig`/`onSortChange`) para que el padre delegue el orden al backend en vistas paginadas server-side, en vez de ordenar solo la página cargada en memoria.

##### Archivos Modificados
- `backend/src/repositories/articulo.repository.ts` - `buildOrderByClause()` con orden natural para `codigo` y whitelist de columnas
- `frontend/src/components/DataTable.tsx` - Props `sortConfig`/`onSortChange` para sorting controlado
- `frontend/src/pages/articulos/ArticulosList.tsx` - `sortable: true` en columnas Código/Nombre, estado de sort conectado al fetch

#### Fix: Valuación Total en USD no sumaba el stock sin reposición
Nicole detectó que la suma de su columna de costo USD en el Excel importado (~$138.113) no coincidía con la Valuación Total en USD del dashboard (~$111.975). Causa real, encontrada comparando con la base: 224 artículos habían quedado marcados `activo = false` porque el import los creaba inactivos cuando `Stock Mínimo = 0` (regla agregada el 16 de junio de 2026, ver changelog de esa fecha) — y el cálculo de Valuación Total filtra por `activo = true`, así que esos artículos (con stock y costo reales) quedaban afuera de la cuenta por completo.

**Se eliminó la regla**: `Stock Mínimo = 0` ya no marca el artículo como inactivo en el import (`importar.service.ts`). Los 224 artículos ya importados se reactivaron con un `UPDATE` puntual sobre la base de producción (no requirió reimportar).

Aparte, se encontró y corrigió un segundo bug relacionado: en la valuación **por artículo individual** (`GET /articulos/:id/valuacion`, usada en el detalle del artículo), el total en USD solo sumaba las capas de reposiciones y nunca el stock sin reposición (`costoInicialEstimadoUsd × stockSinCosto`), aunque sí se sumaba correctamente en ARS. La Valuación Total del *dashboard* ya sumaba ambos correctamente desde antes; solo la del detalle de artículo tenía el bug.

Una vez resuelto lo anterior, quedó una diferencia residual de ~$100 entre la suma del Excel y el sistema (~$138.113 vs ~$138.213) — **no es un bug**: es redondeo acumulado porque `costo_inicial_estimado_usd` es `NUMERIC(12,2)` (2 decimales), mientras que la columna del Excel de Nicole calculaba el costo USD con una fórmula de precisión completa (`=Costo_ARS/1545`) antes de multiplicar por stock. Confirmado reproduciendo ambos cálculos contra el archivo real (`Inventario Hofra - Normalizado 4.xlsx`). Se decidió dejarlo así (diferencia de ~0,07% sobre el total, inmaterial).

##### Archivos Modificados
- `backend/src/services/importar.service.ts` - Se eliminó el bloque que marcaba `activo = false` cuando `stockMinimo === 0`
- `backend/src/services/articulo.service.ts` - `getValuacion()` ahora suma `stockSinCosto × costoInicialEstimadoUsd` al `valorTotalUSD`, igual que ya hacía con ARS

#### Aclaración de moneda (ARS) en el detalle de artículo
"Valor Total del Stock" y "Costo Promedio Unitario" no dejaban claro que eran en pesos, ahora que hay un cuadro equivalente en USD al lado. Se renombraron a "Valor Total del Stock (ARS)" y "Costo Promedio Unitario (ARS)", con el prefijo "ARS $" explícito en los montos (también en "Costo Inicial Estimado"). Se agregó un cuadro propio para "Valor Total del Stock (USD)" (antes era solo una líneita chica debajo del monto en pesos).

##### Archivos Modificados
- `frontend/src/pages/articulos/ArticuloDetail.tsx`

#### Fix: el buscador de artículos en Entregas/Reposiciones no encontraba artículos más allá de los primeros 500
Reportado con un caso concreto: tipear "LL20" no sugería nada pese a que el artículo existía y tenía stock. El combobox de artículos (`ArticuloCombobox.tsx`) busca en memoria sobre una lista ya cargada, pero esa carga inicial (`EntregaForm.tsx`, `EntregaEdit.tsx`, `ReposicionForm.tsx`) estaba fijada a `limit: 500`. Con más de 500 artículos activos (pasó a haber 666 tras reactivar los 224 del fix anterior), los que quedan fuera de ese límite nunca llegan a cargarse, y ninguna búsqueda los encuentra, sin importar qué se tipee. Se subió el límite a `1000` (el máximo que permite `paginationSchema` en el backend) en los tres formularios. Sigue siendo "cargar todo y filtrar en el navegador", no una búsqueda real en el servidor — si el catálogo activo supera los 1000 artículos, haría falta convertirlo a búsqueda server-side.

##### Archivos Modificados
- `frontend/src/pages/entregas/EntregaForm.tsx`, `EntregaEdit.tsx`
- `frontend/src/pages/reposiciones/ReposicionForm.tsx`

#### Nueva Reposición: panel de "Último costo cargado" (ARS/USD)
A pedido de Nicole, para poder ver la fluctuación de precio mientras se carga una reposición nueva. Al elegir un artículo, se busca su última reposición (`GET /articulos/:id/historial`, ya existía para el historial del detalle de artículo) y se muestra su costo en ARS y USD en el panel lateral "Artículo Seleccionado". Si el artículo nunca tuvo una reposición, usa como referencia el Costo Inicial Estimado cargado al crear el artículo.

##### Archivos Modificados
- `frontend/src/pages/reposiciones/ReposicionForm.tsx`

#### Sesión activa extendida de 15 minutos a 2 horas
`JWT_ACCESS_EXPIRY` estaba hardcodeado en `'15m'`. El refresh token (7 días) no cambió, y el frontend ya renovaba el access token en segundo plano cuando vencía (`frontend/src/services/api.ts`), así que esto no cambia cada cuánto hay que volver a loguearse — reduce la frecuencia del refresh automático de cada 15 minutos a cada 2 horas.

##### Archivos Modificados
- `backend/src/config/env.ts` - `JWT_ACCESS_EXPIRY: '2h'`
- `shared/src/constants/index.ts` - `JWT_CONFIG.ACCESS_TOKEN_EXPIRY` (constante duplicada, no se usaba en el código, se actualizó igual para no quedar desactualizada)

### 14-17 de noviembre de 2026 — Duplicar Artículo, Dólar Global, mejoras de grillas, búsqueda en Entregas, tipado de exportaciones y formato numérico

Tanda extensa de pedidos puntuales de Nicole sobre el listado/detalle de Artículos, Reposiciones y Entregas, más dos revisiones transversales (exportaciones y formato numérico).

#### Duplicar Artículo
Acción nueva en el listado de Artículos (ícono junto a Editar/Eliminar) y en el detalle (botón junto a "Editar"). Navega a `/articulos/nuevo?duplicarDe=<id>`; el formulario detecta ese query param y precarga los datos del artículo original. **No se copian**: código (se autogenera según el rubro, igual que cualquier artículo nuevo — copiar el original rompería el `UNIQUE` de la base), imagen (si se copiara y después se borra la imagen del duplicado, se borraría también el archivo de Cloudinary del original, que comparten), y stock (arranca en 0). El nombre se precarga como `"<nombre original> (copia)"`. Es 100% frontend: duplicar es solo abrir el formulario de creación precargado, el guardado usa el mismo `POST /articulos` de siempre.

##### Archivos Modificados
- `frontend/src/pages/articulos/ArticulosList.tsx`, `ArticuloDetail.tsx`, `ArticuloForm.tsx`

#### Valor Global del Dólar Oficial
Ver sección nueva "9. Configuración del Dólar Oficial" más arriba para el detalle completo (modelo de datos, API, comportamiento). Incluye la precarga en Artículos/Reposiciones, la actualización al crear **y** al editar, y la card nueva en el Dashboard.

##### Archivos Nuevos
- `database/migrations/029_add_configuracion_dolar.sql`
- `backend/src/repositories/configuracionDolar.repository.ts`, `controllers/configuracionDolar.controller.ts`, `routes/configuracionDolar.routes.ts`
- `frontend/src/services/configuracionDolar.service.ts`

##### Archivos Modificados
- `backend/src/services/articulo.service.ts`, `stock.service.ts`, `dashboard.service.ts`, `routes/index.ts`
- `shared/src/types/index.ts` - `ConfiguracionDolar`, `DashboardStats.valorDolarOficialVigente`
- `frontend/src/pages/articulos/ArticuloForm.tsx`, `reposiciones/ReposicionForm.tsx`, `Dashboard.tsx`

#### Panel "Último Costo Cargado" en Reposición — mejora visual + proveedor/link de compra
Pasó de una líneita chica a una caja destacada (fondo ámbar, ícono de historial, montos grandes) para no confundirse con el cuadro de costo nuevo. Se agregó el proveedor y el link de compra de esa misma última reposición. **Bug encontrado y corregido**: cuando el artículo nunca tuvo una reposición (ej. código `SO1`), no había de dónde sacar el link de compra aunque el artículo sí tuviera su propio campo URL cargado (la publicación de Mercado Libre usada para fijar el costo inicial) — se agregó ese fallback, igual que ya existía para el proveedor. De paso se cambió de mostrar un link genérico "Ver link de compra" a mostrar la URL completa como texto visible.

##### Archivos Modificados
- `frontend/src/pages/reposiciones/ReposicionForm.tsx`

#### Filtro por Proveedor y export completo en el listado de Artículos
El backend ya soportaba `proveedorId` como filtro (no estaba expuesto en la UI). El export de Excel/CSV exportaba solo la página cargada en memoria (hasta 500 registros); ahora busca el set **completo** filtrado (hasta 1000, el máximo del backend) al momento de exportar.

##### Archivos Modificados
- `frontend/src/components/ExportButtons.tsx` (prop `getExportData` opcional), `frontend/src/pages/articulos/ArticulosList.tsx`

#### Tipado de Exportaciones a Excel/CSV y Formato de Números y Moneda
Ver las secciones nuevas con el mismo nombre en "Características de UI" más arriba.

#### Ajustes de columnas en el listado de Artículos (varias rondas)
- SKU y Nombre: primero achicados y truncados con tooltip; después un poco más anchos (90→110px, 240→280px); Nombre finalmente pasó a hacer **wrap** en vez de truncar (hubo que forzar `!whitespace-normal` porque el estilo global `.table td` fuerza `white-space: nowrap` en todas las celdas con más especificidad que una clase simple)
- Presentación y Stock actual: ancho acotado (antes sin límite); después Rubro también (con tooltip para nombres largos, ej. "Lubricantes - Pegamentos")
- Header de "Stock" renombrado a "Stock actual"
- Columna "Estado" eliminada del listado (el filtro Activos/Inactivos se mantiene en la barra de filtros)
- Stock = 0: se probaron dos formatos (texto plano en rojo, después se volvió a la píldora `Badge` roja) para mantener la misma forma visual que el resto de los estados (Bajo/Normal)
- Columna "Acciones": se sacaron los íconos de Ver y Editar (quedan Duplicar y Eliminar), ancho reducido a `w-20` — Ver sigue disponible clickeando la fila, Editar desde el detalle

##### Archivos Modificados
- `frontend/src/pages/articulos/ArticulosList.tsx`
- `frontend/src/components/Badge.tsx` (fix de separador de miles en `StockBadge`, ver más abajo)

#### Búsqueda por texto en Entregas
No existía ningún filtro de texto en Entregas (Reposiciones sí tenía). Se agregó el mismo mecanismo: backend busca por N° de cotización interna, cliente o purchase order (`ILIKE`); frontend con el mismo input + ícono + debounce de 300ms que ya usaba Reposiciones.

##### Archivos Modificados
- `backend/src/repositories/entrega.repository.ts`, `services/stock.service.ts`, `controllers/stock.controller.ts`
- `frontend/src/services/stock.service.ts`, `frontend/src/pages/entregas/EntregasList.tsx`

#### Formato numérico: sin decimales en ARS, siempre separador de miles
Dos rondas separadas:
1. **Decimales en Pesos Argentinos**: todos los importes en ARS (no los de USD) pasaron de 2 decimales a 0 en ~15 pantallas — Dashboard, Artículos, Reposiciones, Entregas, Reportes, Solicitudes de Cotización.
2. **Separador de miles en todo campo numérico**: relevamiento completo de números mostrados sin `.toLocaleString` (stock, cantidades, contadores, totales) en ~20 pantallas. Se corrigió además en los componentes compartidos `Badge.tsx` (`StockBadge`) y `DataTable.tsx` (paginación "Mostrando X-Y de Z" y el fallback genérico de columnas sin `render` propio), que arreglan varias pantallas de una sola vez. De paso aparecieron y se corrigieron varios importes en **USD** que habían quedado sin `.toLocaleString` o usaban `.toFixed(2)` (que no trae separador de miles): `ReposicionesList.tsx`, `ReposicionDetail.tsx`, `ArticuloDetail.tsx`, `ReposicionForm.tsx`/`Edit.tsx`, `ReportesPage.tsx`.

Convención final: punto para miles/millones, coma para decimales, ARS sin decimales, USD con 2 decimales fijos, cantidades/stock como entero con separador de miles. No se tocaron: números de página, contadores de rubros/marcas creados en un import, cantidad de ítems de una entrega/reposición (`array.length`), el campo de carga `CurrencyInput`, ni las exportaciones a Excel/CSV.

##### Archivos Modificados
- `frontend/src/components/Badge.tsx`, `DataTable.tsx`, `ArticuloCombobox.tsx`
- `frontend/src/pages/Dashboard.tsx`, `articulos/ArticuloDetail.tsx`, `articulos/ArticuloForm.tsx`, `auditoria/AuditoriaList.tsx`, `entregas/EntregaDetail.tsx`, `entregas/EntregaEdit.tsx`, `entregas/EntregaForm.tsx`, `entregas/EntregasList.tsx`, `importar/ImportarPage.tsx`, `reportes/ReportesPage.tsx`, `reposiciones/ReposicionDetail.tsx`, `reposiciones/ReposicionEdit.tsx`, `reposiciones/ReposicionForm.tsx`, `reposiciones/ReposicionesList.tsx`, `solicitudesCotizacion/SolicitudCotizacionDetail.tsx`

### 17 de noviembre de 2026 — Bug de fondo: columnas NUMERIC/DECIMAL llegaban como string desde Postgres

El punto 2 del formato numérico (arriba) arregló el frontend para llamar `.toLocaleString('es-AR', ...)` en todos lados, pero en la grilla de Reposiciones (columna Costo, ARS y USD) seguía sin verse el separador de miles ni la coma decimal. Causa real: el driver `pg` devuelve las columnas `NUMERIC`/`DECIMAL` de Postgres como **string**, no como `number` — y `String.prototype.toLocaleString(locale, options)` existe pero ignora silenciosamente el locale y las opciones (no agrega separadores, no cambia el punto por coma), así que el código del frontend estaba bien pero no tenía efecto porque el dato ya llegaba como texto. El helper `toCamelCase()` del backend solo renombra claves snake_case → camelCase, no convierte tipos, así que el `string` pasaba intacto.

Se encontró el mismo patrón repetido en varios repositorios (cualquier función que arma el objeto de respuesta a mano o con un simple `toCamelCase(row)` sin castear explícitamente los campos `NUMERIC`), y se corrigió agregando `Number(valor)` en cada uno:
- `reposicion.repository.ts`: `costo_reposicion`, `valor_dolar_oficial`, `costo_reposicion_dolares` — faltaba en `mapToReposicionConRelaciones` (la grilla), y también en `create`/`update`/`cancel`/`confirm` (se centralizó en un nuevo método privado `mapToReposicion`) y en los helpers de valuación FIFO `findWithStockDisponible`/`getCapasStock` (tenían `as number`, que es solo una afirmación de tipo para TypeScript y no convierte nada en tiempo de ejecución).
- `articulo.repository.ts`: `costo_inicial_estimado`, `valor_dolar_costo_inicial`, `costo_inicial_estimado_usd` — faltaba en `mapToArticuloConRelaciones`, en `create`/`update`, y en los métodos heredados de `BaseRepository` (`findAll`/`findById`, genéricos y sin conocimiento de qué columnas son numéricas) — se sobreescribieron ambos en `ArticuloRepository` para aplicar el cast después. Se centralizó en un nuevo método privado `mapArticulo`.
- `solicitudCotizacion.repository.ts`: `precio_unitario`, `mark_up` (ítems) y `usd_oficial_compra`, `usd_oficial_venta` (cabecera) — faltaba en `create`, `updateHeader`, `updateEstado`, `updateItem` y `findItemById` (el método `findByIdWithRelations`, usado por el detalle, ya tenía el cast de una corrección anterior). Se centralizó en dos métodos privados nuevos `mapSolicitud`/`mapItem`.

Se verificó el bug consultando la base de Railway directamente (`costo_reposicion` llegaba como `'2318.00'`, tipo `string`) y se confirmó con `tsc --noEmit` y build limpios después del fix. Como `BaseRepository` es genérico (no sabe qué columnas son `NUMERIC` para cada tabla), el cast se aplica en cada repositorio concreto, no en la clase base.

##### Archivos Modificados
- `backend/src/repositories/reposicion.repository.ts`, `articulo.repository.ts`, `solicitudCotizacion.repository.ts`

### 19 de noviembre de 2026 — Valorización de reposición en Artículos con Stock Bajo

Requerimiento: desde Dashboard → "Artículos con Stock Bajo" → "Ver todos" (lista de Artículos filtrada por `stockBajo=true`), además de ver qué artículos están por debajo del mínimo, poder ver cuánto costaría reponerlos.

Se agregaron 3 columnas —visibles solo con el filtro "Solo stock bajo" activo, para no afectar el listado general de Artículos—: **Último costo** (costo de la última reposición confirmada, o el Costo Inicial Estimado si el artículo nunca tuvo una; "Sin costo registrado" si no hay ninguno de los dos, nunca `$0`), **Cantidad a reponer** (`MAX(0, stockMinimo - stock)`) y **Costo estimado de reposición** (cantidad × último costo). Se agregó también una tarjeta de resumen con el total de artículos, total de unidades a reponer y costo total estimado — pedida a un endpoint nuevo (`GET /articulos/resumen-reposicion`, mismos filtros que el listado) en vez de derivarla de la página cargada en memoria, porque tiene que sumar **todos** los artículos que matchean el filtro y no solo los de la página visible. Los artículos sin costo registrado se excluyen del costo total (se informa cuántos se excluyeron) para no mostrar un total engañoso. La exportación a Excel/CSV incluye las 3 columnas nuevas (tipadas como número/moneda real, no texto) y una fila `TOTAL`.

Para el "último costo" se reutilizó el mismo criterio ya usado en el panel de referencia de Reposiciones (`estado = 'confirmada'`, ordenado por `fecha_reposicion DESC`), vía un `LEFT JOIN LATERAL` nuevo en `ArticuloRepository`. La construcción de condiciones de `search()` (búsqueda, rubro, proveedor, stock bajo, activo) se extrajo a un método privado reutilizable (`buildFiltrosConditions`) para que el endpoint de resumen use exactamente las mismas condiciones que el listado y los totales nunca queden desalineados de lo que se ve en pantalla.

Para la fila `TOTAL` del export se agregó un prop opcional `footerRows` a `ExportButtons.tsx` (ignorado si no se pasa, no afecta a los demás listados que usan el componente: Reportes, cotizaciones, etc.).

##### Archivos Modificados
**Backend**: `backend/src/repositories/articulo.repository.ts`, `backend/src/services/articulo.service.ts`, `backend/src/controllers/articulo.controller.ts`, `backend/src/routes/articulo.routes.ts`, `shared/src/types/index.ts`

**Frontend**: `frontend/src/pages/articulos/ArticulosList.tsx`, `frontend/src/services/articulos.service.ts`, `frontend/src/components/ExportButtons.tsx`

### 19 de noviembre de 2026 (continuación) — Ordenamiento en Stock Bajo y columna Acciones oculta

Dos ajustes puntuales sobre la vista de "Artículos con Stock Bajo" agregada más arriba el mismo día:

1. **Ordenamiento por "Cantidad a reponer" y "Costo estimado de reposición"**: ambas columnas pasan a ser `sortable`. Como no son columnas reales de la tabla `articulos` (son calculadas), `buildOrderByClause()` en `ArticuloRepository` les agrega casos especiales con la expresión calculada (`GREATEST(0, stock_minimo - stock)`, y esa expresión × `COALESCE(uc.costo_reposicion, costo_inicial_estimado)` para el costo estimado), con `NULLS LAST` para que los artículos sin costo registrado no se mezclen arriba al ordenar descendente. El export a Excel/CSV ya reutilizaba el `sortBy`/`sortOrder` vigente de la grilla (no fue necesario tocar nada ahí), así que el archivo descargado queda en el mismo orden que se ve en pantalla al momento de exportar.
2. **Columna "Acciones" oculta**: con el filtro "Solo stock bajo" activo, la columna Acciones (Duplicar/Eliminar) ya no se muestra — esta vista es de consulta/planificación de reposición, no de edición. Sin cambios en el listado general de Artículos.

##### Archivos Modificados
- `backend/src/repositories/articulo.repository.ts` (`buildOrderByClause`)
- `frontend/src/pages/articulos/ArticulosList.tsx` (columnas `sortable`, columna Acciones condicional)

### 19 de noviembre de 2026 (continuación 2) — Fix: flechitas de orden invisibles en columnas angostas

Nicole reportó que en "Cantidad a reponer" y "Costo estimado de reposición" (agregadas más arriba el mismo día como `sortable`) no se veían las flechitas de orden, a diferencia de "Código"/"Nombre".

**Causa**: en `DataTable.tsx`, el encabezado de cada columna es un flex row (`<div class="flex items-center gap-1">`) con el texto del header y el ícono de orden (`lucide-react`, `w-4 h-4`) como hermanos. Ninguno de los dos tenía `flex-shrink` explícito, así que ambos usaban el valor por default (`flex-shrink: 1`, encogible). En columnas sin restricción de ancho ("Código") o con texto corto relativo a su ancho ("Nombre", 280px) nunca hacía falta encoger nada y el ícono se veía normal. Pero "Cantidad a reponer" (max-width 110px) y "Costo estimado de reposición" (150px) tienen texto de encabezado largo que no entra en ese ancho — el navegador comprimía **ambos** elementos del flex para que quepan, y el ícono (que no tiene contenido de texto que lo proteja, solo un `viewBox` escalable) terminaba comprimido a un tamaño casi invisible.

**Fix** (en el componente genérico `DataTable.tsx`, no por columna — corrige el problema en cualquier grilla de la app que lo tenga o lo tenga en el futuro):
- El ícono de orden ahora lleva `flex-shrink-0`: nunca se encoge, siempre el mismo tamaño real (`w-4 h-4`) que en "Código"/"Nombre".
- El `<span>` del texto del encabezado se ajustó para no competir por espacio con el ícono (ver ajuste siguiente sobre 2 renglones, reemplaza el truncado de una sola línea de la primera versión de este fix).
- Adicionalmente, en `ArticulosList.tsx` se ensancharon un poco esas dos columnas (110px→150px y 150px→190px) para que el encabezado entre completo en la mayoría de los casos.

##### Archivos Modificados
- `frontend/src/components/DataTable.tsx`
- `frontend/src/pages/articulos/ArticulosList.tsx`

### 19 de noviembre de 2026 (continuación 3) — Encabezados a 2 renglones en vez de truncar

El fix anterior (mismo día) cortaba el texto del encabezado con "…" (`truncate`, 1 renglón) cuando no entraba en el ancho de la columna. A pedido de Nicole, se cambió por **2 renglones** (`line-clamp-2` de Tailwind — soportado nativo desde Tailwind 3.3, sin plugin) en vez de truncar a una línea: el texto completo se ve (envuelve a una segunda línea) y solo si ni siquiera 2 renglones alcanzan, recién ahí se corta con "…" (se mantiene el `title` con el texto completo como respaldo). El ícono de orden se mantiene con su tamaño grande normal (`flex-shrink-0`, sin cambios) — el `<div>` del encabezado pasó de `items-center` a `items-start` para que el ícono quede alineado arriba junto al primer renglón en vez de centrado entre los dos (no afecta a los encabezados de una sola línea, que se ven igual que antes).

**Detalle técnico**: `min-w-0` en el `<span>` sigue siendo necesario — sin eso, un flex item de texto no se encoge por debajo de su ancho "natural" de una sola línea (default `min-width: auto` de flexbox) aunque el `<th>` tenga `max-width`, y nunca llegaría a envolver a un segundo renglón.

##### Archivos Modificados
- `frontend/src/components/DataTable.tsx`

### 19 de noviembre de 2026 (continuación 4) — Columnas angostas en el Excel exportado

Nicole reportó que al descargar el Excel de Artículos, las columnas quedaban todas muy angostas (el ancho default de Excel, ~8.43 caracteres) y casi no se llegaba a leer nada sin agrandarlas a mano.

**Causa**: `ExportButtons.tsx` nunca seteaba `worksheet['!cols']` (la propiedad de `xlsx` que define el ancho de columna) — sin eso, el archivo generado usa el ancho default del programa que lo abre.

**Fix**: `ExportColumn<T>` ahora acepta un `width` opcional (en "caracteres", la unidad estándar de `xlsx`). `ExportButtons` setea `worksheet['!cols']` con ese ancho por columna, o un default de 16 caracteres para las que no lo especifican — se verificó a mano que el `.xlsx` generado efectivamente incluye `<cols><col ... customWidth="1"/>...` en su XML interno, por lo que Excel respeta esos anchos al abrir el archivo (no es solo una sugerencia que el programa pueda ignorar). En el export de Artículos se usó explícitamente en los campos pedidos: Nombre (40), Rubro (22), Proveedor (28), Último costo (18) y Costo estimado de reposición (26); el resto usa el default de 16 (más ancho que el default de Excel, para que no vuelva a pasar en el resto de las columnas).

##### Archivos Modificados
- `frontend/src/components/ExportButtons.tsx`
- `frontend/src/pages/articulos/ArticulosList.tsx`

### 19 de noviembre de 2026 (continuación 5) — Ajuste fino de anchos en el Excel: Código/Stock/Stock Mínimo angostas

A pedido de Nicole, ajuste puntual de anchos sobre el fix anterior (mismo día): **Código** (width 6), **Stock** (width 5) y **Stock Mínimo** (width 12) se angostaron al ancho exacto de su propio encabezado — son columnas con valores cortos (un código, un número de stock) que no necesitaban el ancho default de 16. **Proveedor** se achicó un poco (28 → 22, mismo ancho que Rubro). Verificado de nuevo a mano que el XML interno del `.xlsx` generado refleja los anchos correctos.

##### Archivos Modificados
- `frontend/src/pages/articulos/ArticulosList.tsx`

### 19 de noviembre de 2026 (continuación 6) — Fix: Enter en el formulario de Artículo borraba la imagen

Nicole reportó que al editar un artículo, si estando parado en cualquier campo del formulario apretaba Enter, se borraba la imagen cargada (sin ninguna confirmación).

**Causa**: el botón "✕" de eliminar imagen en `ImageUpload.tsx:87` no tenía `type="button"` — por default HTML, un `<button>` dentro de un `<form>` sin `type` explícito es `type="submit"`. Al ser el primer botón de tipo submit en el orden del DOM dentro de `<form onSubmit={...}>` de `ArticuloForm.tsx` (aparece antes que los botones "Cancelar"/"Guardar" al final del formulario), el navegador lo elegía como el **botón por default del formulario**: al apretar Enter en cualquier input, la especificación HTML de "submit implícito" ejecuta un click sintético sobre ese botón por default — en este caso, literalmente corriendo `handleDelete()` en vez de guardar.

**Fix**: se agregó `type="button"` al botón de eliminar imagen. `ImageUpload.tsx` solo lo usa `ArticuloForm.tsx` hoy, así que el fix queda acotado a ese único formulario sin efectos secundarios en otras pantallas.

##### Archivos Modificados
- `frontend/src/components/ImageUpload.tsx`

### 22 de noviembre de 2026 — Normalizador de texto con IA en Solicitud de Cotización

Nicole pidió poder cargar un pedido de cliente que viene como texto libre (mail, WhatsApp, lista pegada a mano), no solo Excel. Antes de escribir código se había evaluado — y descartado por sobrearquitectura — un "Hofra AI Agent" completo (fases 0 a 2, revertidas); esta vez el pedido encajaba en el patrón más simple de la skill de Claude API: **un solo llamado a `client.messages.parse()` con salida estructurada (Zod)**, no un agente — nada de loop, nada de tool use, nada que corra sin que alguien apriete un botón.

Se agregó un selector **Subir Excel / Pegar texto** en "Nueva Solicitud de Cotización": al pegar texto y confirmar, `POST /api/solicitudes-cotizacion/normalizar-texto` manda el texto a Claude (`backend/src/services/normalizadorItems.service.ts`) y devuelve items con ETM, Descripción, Descripción en inglés, Marca, Modelo y Cantidad (campos opcionales en `null` si el texto no los trae — el modelo tiene instrucción explícita de no inventarlos). Se agregó una tabla de revisión editable antes de confirmar, ya que la extracción con IA puede equivocarse.

**Requiere `ANTHROPIC_API_KEY`** (cargada en Railway sin pasar por los logs ni el output de ninguna herramienta — generada por Nicole en console.anthropic.com, eligiendo "cloud" como entorno de ejecución).

**Bug post-deploy — Node sin `fetch` global**: la primera prueba en producción tiró Error 500. Los logs de Railway mostraban `fetch is not defined as a global` — el SDK de Anthropic necesita `fetch` nativo (Node 18+), pero Railway buildeaba con **Node 16.20.2** porque el `engines.node` del proyecto era `>=16.0.0` (histórico, nunca importó hasta ahora). Se subió a `>=20.0.0`, pero el primer intento no sirvió: el servicio de backend en Railway tiene `watchPatterns: ["/backend/**"]`, y el bump inicial solo tocaba el `package.json` **raíz** — Railway lo consideró "sin cambios relevantes" y nunca rebuildeó. Se resolvió declarando el mismo `engines.node` directamente en `backend/package.json` (además de servir como fix, fuerza el rebuild porque sí está bajo `backend/**`).

También se detectó un conflicto de versión de **Zod**: `zodOutputFormat` del SDK de Anthropic espera un schema construido con `import * as z from 'zod/v4'` (el subpath nuevo que trae zod 3.25+), no el `zod` clásico (v3) que usa el resto del backend — se resolvió importando `zod/v4` solo en `normalizadorItems.service.ts`, sin tocar los validators existentes, y subiendo la dependencia `zod` del backend a `^3.25.0` (el resto del código sigue en zod v3 clásico, compatible).

**Modelo**: se usó `claude-sonnet-5` inicialmente; a pedido de Nicole se cambió a `claude-haiku-4-5` (~3x más barato, $1/$5 vs $3/$15 por MTok) para probar si la calidad alcanza — swap de un solo string, fácil de revertir si no convence.

##### Archivos Modificados
**Backend**: `backend/src/services/normalizadorItems.service.ts` (nuevo), `backend/src/controllers/solicitudCotizacion.controller.ts`, `backend/src/routes/solicitudCotizacion.routes.ts`, `backend/src/config/env.ts`, `backend/package.json`, `package.json` (raíz)
**Frontend**: `frontend/src/pages/solicitudesCotizacion/SolicitudCotizacionUpload.tsx`, `frontend/src/services/solicitudesCotizacion.service.ts`
**Shared**: `shared/src/types/index.ts`, `shared/src/validators/index.ts`

### 22 de noviembre de 2026 (continuación) — Campo Unidad, mostrar/ocultar columnas, y Agregar Artículos a una solicitud existente

Tres pedidos en la misma sesión:

**1. Columna Unidad**: se le agregó a la normalización con IA y a la detección de Excel (header `UNIDAD`). A diferencia de ETM/Descripción en inglés (que ya eran columnas existentes), "unidad" no existía en ningún lado del modelo de datos — de hecho hubo una columna `unidad` en `articulos` que se **eliminó explícitamente** en su momento (migraciones 016-017). Se confirmó con Nicole si esta vez debía persistirse o ser solo de apoyo visual; eligió persistirla: migración 030 (`unidad_solicitada VARCHAR(50)` en `solicitud_cotizacion_items`), aplicada a producción vía túnel SSH a Postgres (sin exponer la contraseña del túnel en ningún momento: se extrajo a variables de entorno del shell con `grep`/`awk`, nunca se imprimió).

**2. Mostrar/ocultar columnas**: chips arriba de la tabla de revisión para togglear ETM, Descripción en inglés, Marca, Modelo y Unidad (Descripción y Cantidad quedan siempre fijas).

**3. Agregar Artículos a una solicitud existente**: antes el listado de ítems era estático, solo se cargaba al crear la solicitud. Se agregó `POST /api/solicitudes-cotizacion/:id/items` (solo con la solicitud `en_revision`), que corre el mismo matching que al crear. Para no duplicar la lógica de captura (Excel/texto/IA/tabla editable/chips), se extrajo a un componente compartido `ItemsCaptureEditor.tsx`, usado tanto en "Nueva Solicitud" como en el nuevo botón "Agregar Artículos" del detalle. La primera versión de ese panel era una sección inline que aparecía **después** de la tabla de ítems — Nicole reportó que "no pasaba nada" al hacer click, porque quedaba fuera de vista sin hacer scroll; se cambió a un **popup modal** centrado (mismo patrón que `ChangePasswordModal.tsx`), visible de inmediato sin importar el largo de la tabla.

##### Archivos Modificados
**Backend**: `backend/src/repositories/solicitudCotizacion.repository.ts`, `backend/src/services/solicitudCotizacion.service.ts`, `backend/src/services/normalizadorItems.service.ts`, `backend/src/controllers/solicitudCotizacion.controller.ts`, `backend/src/routes/solicitudCotizacion.routes.ts`
**Frontend**: `frontend/src/components/solicitudesCotizacion/ItemsCaptureEditor.tsx` (nuevo), `frontend/src/pages/solicitudesCotizacion/SolicitudCotizacionUpload.tsx`, `frontend/src/pages/solicitudesCotizacion/SolicitudCotizacionDetail.tsx`, `frontend/src/services/solicitudesCotizacion.service.ts`
**Shared**: `shared/src/types/index.ts`, `shared/src/validators/index.ts`
**Migraciones**: `database/migrations/030_add_unidad_solicitud_items.sql`

### 23 de noviembre de 2026 — Confirmación de costo antes de normalizar + auditoría completa de Solicitudes de Cotización

Con 4 personas más usando el sistema, Nicole pidió un popup de confirmación antes de cada "Normalizar con IA" (no todas saben que tiene costo asociado) — "Cancelar" solo cierra el diálogo, no navega ni envía nada. Se agregó al componente compartido `ItemsCaptureEditor.tsx`, así que aplica tanto en "Nueva Solicitud" como en "Agregar Artículos".

También preguntó si el módulo estaba auditado. Se encontraron dos huecos: **actualizar un ítem individual** (aceptar match, cargar precio/mark up/URL) no quedaba registrado, y **"Normalizar con IA" tampoco**. Se corrigieron ambos: `updateItem` ahora registra manualmente antes/después de los campos del ítem (igual que `marcarCotizada`/`cancelar`, en vez de depender de `auditMiddleware` genérico — la entidad real modificada acá es el ítem, no la cabecera de la solicitud, así que capturar con precisión qué cambió requería lógica propia); y cada llamado a `normalizar-texto` se registra con una acción nueva `normalizar_ia` (usuario, cantidad de ítems detectados, largo del texto). Se agregó además "Solicitudes de Cotización" a los módulos de la Auditoría general, que antes no aparecía ahí pese a que ya se registraban creación/actualización de cabecera.

Se sumó una **pestaña nueva** en Auditoría ("Normalizar con IA") con un resumen de usos por usuario (`GET /api/audit/conteo-por-usuario`, `GROUP BY usuario_id`) y el detalle filtrable debajo — para que Nicole pueda ver cuánto usa cada persona la función.

##### Archivos Modificados
**Backend**: `backend/src/controllers/auditLog.controller.ts`, `backend/src/services/auditLog.service.ts`, `backend/src/repositories/auditLog.repository.ts`, `backend/src/routes/auditLog.routes.ts`, `backend/src/controllers/solicitudCotizacion.controller.ts`, `backend/src/routes/solicitudCotizacion.routes.ts`
**Frontend**: `frontend/src/components/solicitudesCotizacion/ItemsCaptureEditor.tsx`, `frontend/src/pages/auditoria/AuditoriaList.tsx`, `frontend/src/services/auditLog.service.ts`
**Shared**: `shared/src/types/index.ts` (`AccionAuditoria` +`normalizar_ia`, nuevo `AuditLogConteoUsuario`), `shared/src/validators/index.ts`

### 24 de noviembre de 2026 — Lote de ajustes en Solicitud de Cotización (fix Sugerido/Aceptado, búsquedas externas, cotización manual, cliente opcional, UI)

Nicole pidió una serie de cambios sobre el mismo módulo, uno por uno, pidiendo explícitamente no pushear nada hasta terminar el lote completo para poder revisar todo junto.

**Fix: Sugerido vs. Aceptado se pisaban.** Al buscar y aceptar manualmente otro artículo para un ítem, la columna "Sugerido" pasaba a mostrar ese artículo en vez de la sugerencia original del sistema — ambas columnas leían la misma columna de base (`articulo_id`), que se sobreescribía al aceptar a mano. Se separó en dos columnas: `articulo_id_sugerido` (migración 031, fijada una sola vez en el matching automático, nunca se vuelve a tocar) y `articulo_id` (el aceptado actual, mutable). De paso quedó arreglado un bug relacionado: antes, una vez aceptado un artículo manual, el botón "Aceptar sugerencia" desaparecía sin dejar forma de volver a la sugerencia original; ahora el botón sigue disponible mientras lo aceptado no sea exactamente la sugerencia.

**Búsquedas externas**: Mercado Libre ahora concatena Descripción + Marca en la búsqueda (antes solo mandaba la descripción). Se agregó un botón nuevo, "Google", con el mismo mecanismo (pestaña nueva, Descripción + Marca) y el mismo criterio para marcar `no_disponible` solo cuando el ítem no tiene ningún artículo matcheado.

**Cotización manual + Cliente opcional** (migración 032): `numero_cotizacion` deja de autoincrementarse (se le saca el `DEFAULT nextval(...)` del contador que arrancaba en 250, migración 028, y se borra la secuencia) — ahora es un campo editable, de ingreso manual, tanto al crear la solicitud como después en el detalle. Se agregó un campo nuevo, `nombre_cotizacion`, también manual. Y el Cliente dejó de ser obligatorio para crear una solicitud — esto implicó pasar de `INNER JOIN` a `LEFT JOIN` contra `clientes` en los queries del repositorio, tipar `cliente` como nullable en `SolicitudCotizacionConRelaciones`, y agregar fallback ("Sin Cliente"/"Sin cliente") en cada lugar que mostraba `solicitud.cliente.razonSocial`: la lista, el detalle, los nombres de archivo al exportar a Excel (`cotizacionExport.service.ts` y el controller), y el comprobante de impresión (desactivado hoy, pero igual corregido).

**Ajustes de UI en la grilla de revisión**: se sacó la columna Subtotal (el Total general del pie sigue sumando igual, no depende de esa columna). Se agregaron dos tarjetas grandes en el header de la pantalla de detalle — "Total de Items" (cantidad de filas distintas) y "Cantidad de Items" (suma de las cantidades solicitadas). Las columnas Precio Unit. y Mark Up se achicaron a la mitad de su ancho anterior, con el header en `whitespace-normal` para que el texto haga wrap en dos líneas en vez de forzar una sola. La columna Acciones se angostó y sus labels se acortaron: "Buscar otro" (antes "Buscar otro artículo"), "MercadoLibre" (antes "Buscar en Mercado Libre"), "Google" (nuevo), "No Disponible" (antes "Marcar como No Disponible"), "URL" (antes "Pegar URL de producto").

##### Archivos Modificados
**Backend**: `backend/src/repositories/solicitudCotizacion.repository.ts`, `backend/src/services/solicitudCotizacion.service.ts`, `backend/src/controllers/solicitudCotizacion.controller.ts`, `backend/src/services/cotizacionExport.service.ts`
**Frontend**: `frontend/src/pages/solicitudesCotizacion/SolicitudCotizacionDetail.tsx`, `frontend/src/pages/solicitudesCotizacion/SolicitudCotizacionUpload.tsx`, `frontend/src/pages/solicitudesCotizacion/SolicitudesCotizacionList.tsx`
**Shared**: `shared/src/types/index.ts`, `shared/src/validators/index.ts`
**Migraciones**: `database/migrations/031_add_articulo_sugerido_solicitud_items.sql`, `database/migrations/032_cotizacion_manual_cliente_opcional.sql`

### 24 de noviembre de 2026 (continuación) — Ronda de ajustes finos de layout en Solicitud de Cotización

Después del lote principal, Nicole pidió varios ajustes de tamaño/layout en la misma pantalla de detalle, uno por uno, verificando cada deploy antes de seguir:

1. **Indicadores más chicos**: las 4 tarjetas (Con/Sin Coincidencia, Aceptados, Pendientes) pasaron de tarjetas grandes apiladas (número 2xl debajo del label) a una versión compacta en una sola línea (`flex justify-between`, texto xs/sm).
2. **Precio Unitario visible**: al achicar esa columna a la mitad (75px) en el lote anterior, quedó "muy chico" — se volvió a agrandar a 100px para que entren hasta 6 caracteres.
3. **Cabecera en una línea**: Cliente/Fecha/N° de Cotización/Nombre de Cotización pasaron de un grid de 4 columnas (cada una con label arriba y valor abajo) a una fila `flex` con label+valor inline. Fecha y N° de Cotización se achicaron para darle más lugar a Cliente y Nombre. Ida y vuelta siguiente: Nicole pidió además que los 4 campos tuvieran **el mismo tamaño de letra** (se habían achicado de más Fecha/N° Cotización), que el campo Cliente tuviera un ancho acotado (antes competía por espacio con Nombre), y que el input de N° de Cotización mostrara hasta 4 dígitos y quedara a la **misma altura** que el de Nombre (tenía un `py-1` que lo hacía más bajo).
4. **Un solo renglón de indicadores**: Total de Items y Cantidad de Items (que habían quedado en tarjetas grandes separadas, arriba de todo) se unificaron en la misma fila que los otros 4 indicadores — ahora son 6 tarjetas chicas en una sola fila.
5. **Solicitado/Sugerido/Aceptado a 150px**: para dejar lugar a columnas que se van a agregar más adelante, se le preguntó a Nicole el ancho de referencia (Sugerido tenía 220px) y se acordó bajar las 3 columnas (antes 240/220/220px) a 150px parejas, con el texto largo haciendo wrap en vez de desbordar.

**Cambio de flujo de trabajo, a partir de esta conversación**: Nicole pidió dejar de preguntar antes de cada commit/push — a partir de ahora el asistente commitea y pushea automáticamente apenas termina cada cambio pedido, sin pedir confirmación ni presentar opciones (ver memoria `feedback-pushea-significa-todo`, actualizada). Importante: el popup de aprobación que a veces sigue apareciendo en la terminal ("This command requires approval") es del sistema de permisos de Claude Code, no algo que el asistente esté preguntando — se resuelve eligiendo "Yes, and don't ask again" en ese popup, o iniciando la sesión con `claude --continue --dangerously-skip-permissions`.

##### Archivos Modificados
**Frontend**: `frontend/src/pages/solicitudesCotizacion/SolicitudCotizacionDetail.tsx` (único archivo tocado en esta ronda — todo fue ajuste de clases Tailwind, sin cambios de backend/base de datos)

### 24 de noviembre de 2026 (continuación 2) — Renombrar columna "Aceptado" a "Ofrecido" + nombre editable para compra externa

Primero, un rename simple: la columna "Aceptado" de la grilla de ítems pasó a llamarse "Ofrecido" (solo la etiqueta visible, el campo de datos interno sigue siendo el mismo).

Después, Nicole pidió que cuando un ítem es de **compra externa** (estado `no_disponible` con `urlExterna` cargada — se llegó ahí con "MercadoLibre"/"Google"/"URL" y "Aceptar" el link), se pudiera escribir a mano el nombre del artículo en esa misma columna, ya que en ese caso no hay un artículo propio matcheado del que tomar el nombre (a diferencia del caso normal, donde la columna muestra `item.articulo.nombre`). Se agregó el campo nuevo `nombreExterno` (texto libre, opcional) en `solicitud_cotizacion_items` (migración 033, mismo patrón que `urlExterna` de la migración 020) y un input de texto en esa celda de la grilla, que solo aparece en el estado de compra externa — mismo patrón de edición que Precio Unit./Mark Up (estado local por ítem, se guarda `onBlur`). El valor cargado también se usa en la columna "Item Ofrecido" de la exportación a Excel/Google Sheets (`cotizacionExport.service.ts`), que antes quedaba vacía para estos ítems.

Migración 033 aplicada a producción (Postgres en Railway) corriendo el SQL directamente contra el servicio vía `railway run` + un script Node de una sola vez con el driver `pg` (no hay `psql` instalado localmente) — sin pasar la cadena de conexión por el output de ninguna herramienta. Se usó `railway link`/`unlink` temporalmente en el directorio del proyecto, sin dejar ninguna configuración de Railway commiteada en el repo.

##### Archivos Modificados
**Backend**: `backend/src/repositories/solicitudCotizacion.repository.ts`, `backend/src/controllers/solicitudCotizacion.controller.ts`, `backend/src/services/cotizacionExport.service.ts`
**Frontend**: `frontend/src/pages/solicitudesCotizacion/SolicitudCotizacionDetail.tsx`
**Shared**: `shared/src/types/index.ts`, `shared/src/validators/index.ts`
**Migraciones**: `database/migrations/033_add_nombre_externo_solicitud_items.sql`

### 24 de noviembre de 2026 (continuación 3) — Presentación en la columna "Sugerido"

Nicole pidió agregar el campo Presentación (texto libre del artículo, ej. "Caja x12") justo después del código en la información del artículo sugerido de la grilla de ítems. El tipo `SolicitudCotizacionItemConArticulo` (`shared/src/types/index.ts`) ya traía un `Pick` acotado de campos de `Articulo` para `articulo`/`articuloSugerido` (sin `presentacion`) — se amplió ese `Pick` y se sumó `a.presentacion`/`a_sug.presentacion` al query de `getItems()` en el repositorio. Sin migración: la columna `presentacion` ya existía en `articulos`, solo faltaba traerla en este query puntual.

##### Archivos Modificados
**Backend**: `backend/src/repositories/solicitudCotizacion.repository.ts`
**Frontend**: `frontend/src/pages/solicitudesCotizacion/SolicitudCotizacionDetail.tsx`
**Shared**: `shared/src/types/index.ts`

### 24 de noviembre de 2026 (continuación 4) — Columna "Cantidad" editable en la grilla de ítems

Nicole pidió una columna "Cantidad" nueva en la grilla de revisión, editable, que traiga por defecto la cantidad que pidió el cliente (`cantidadSolicitada`, inmutable). Se agregó el campo nuevo `cantidad` (entero, opcional, migración 034) en `solicitud_cotizacion_items`: cuando es `NULL` se toma `cantidadSolicitada` como valor por defecto; si Nicole la edita, esa queda guardada y pasa a mandar sobre la solicitada para todo cálculo downstream (columnas Costo Total/Venta/Total sin IVA de la exportación a Excel/Google Sheets, que ya referencian la celda de esta columna por fórmula, así que ajustan solas; el Total del pie de la grilla; la tarjeta indicadora "Cantidad de Items"). Mismo patrón de edición que Precio Unit./Mark Up (estado local por ítem, guarda `onBlur`). Se insertó entre "Acciones" y "Precio Unit.".

Migración 034 aplicada a producción con el mismo mecanismo que la 033 (`railway run` + script Node de una sola vez con `pg`, sin `psql` local).

##### Archivos Modificados
**Backend**: `backend/src/repositories/solicitudCotizacion.repository.ts`, `backend/src/controllers/solicitudCotizacion.controller.ts`, `backend/src/services/cotizacionExport.service.ts`
**Frontend**: `frontend/src/pages/solicitudesCotizacion/SolicitudCotizacionDetail.tsx`
**Shared**: `shared/src/types/index.ts`, `shared/src/validators/index.ts`
**Migraciones**: `database/migrations/034_add_cantidad_editable_solicitud_items.sql`

### 24 de noviembre de 2026 (continuación 5) — Nombre del artículo siempre editable en la columna "Ofrecido"

Nicole quería generalizar lo hecho antes para compra externa: el nombre ofrecido ahora se puede editar siempre en la grilla, no solo cuando el ítem tiene un link cargado. Casos cubiertos:
1. **Ítem aceptado con artículo propio matcheado**: antes la columna mostraba directamente `item.articulo.nombre` (fijo); ahora hay un input editable que arranca precargado con ese nombre pero se puede sobrescribir sin tocar el artículo real (el link a "ver detalle" + código/marca del artículo matcheado se mantienen debajo, como referencia).
2. **Compra externa** (ya existía desde la ronda anterior): sigue igual, el input ahora es compartido con los otros casos.
3. **Sin ningún match, artículo ni link**: antes la celda mostraba simplemente "-"; ahora se puede escribir cualquier nombre a mano, sin depender de que haya un artículo sugerido/aceptado ni una URL cargada.

Esto implicó ampliar el alcance del campo `nombreExterno` (migración 033) más allá de "solo compra externa" — se renombró a `nombreOfrecido` (migración 035, `RENAME COLUMN`, preserva los datos ya cargados) para que el nombre refleje el uso real. La exportación a Excel/Google Sheets (columna "Item Ofrecido - Descripción") ahora prioriza este override por sobre `articulo.nombre` cuando está cargado (`item.nombreOfrecido || articulo?.nombre || ''`), sin importar el estado del ítem.

Migración 035 aplicada a producción con el mismo mecanismo que las anteriores (`railway run` + script Node de una sola vez con `pg`).

##### Archivos Modificados
**Backend**: `backend/src/repositories/solicitudCotizacion.repository.ts`, `backend/src/controllers/solicitudCotizacion.controller.ts`, `backend/src/services/cotizacionExport.service.ts`
**Frontend**: `frontend/src/pages/solicitudesCotizacion/SolicitudCotizacionDetail.tsx`
**Shared**: `shared/src/types/index.ts`, `shared/src/validators/index.ts`
**Migraciones**: `database/migrations/035_rename_nombre_externo_a_nombre_ofrecido.sql`

### 24 de noviembre de 2026 (continuación 6) — Rediseño de densidad y layout de la grilla de ítems

Con 7 columnas ya en la grilla (Solicitado, Sugerido, Ofrecido, Acciones, Cantidad, Precio Unit., Mark Up), Nicole pidió una pasada completa de ajuste de layout:

- **Columna Acciones angostada a su contenido** (antes `min-w-[140px]`, ahora `w-[110px]`): los botones de acción (Aceptar sugerencia, Buscar otro, MercadoLibre, Google, No Disponible, URL) bajaron de `text-sm`/ícono `w-4 h-4` a `text-xs`/ícono `w-3.5 h-3.5` — los labels más largos ("Aceptar sugerencia") hacen wrap a dos líneas en vez de forzar una columna ancha.
- **Padding reducido en toda la grilla**: celdas y encabezados pasaron de `px-3 py-3` a `px-2 py-2`; los inputs de Cantidad/Mark Up y el nuevo input de Nombre Ofrecido bajaron de `px-3` (el padding default de la clase `.input` global) a `px-2` vía una clase extra que Tailwind prioriza por capas (`utilities` pisa a `components`, así que agregar `px-2` después de `input` en el mismo `className` alcanza sin tocar la clase `.input` compartida por el resto del sistema). `CurrencyInput` (usado también en otros formularios del sistema) no tenía forma de recibir una clase extra — se le agregó la prop `className` opcional, sin cambiar su comportamiento default en los demás usos.
- **Anchos fijos repasados y agrandados donde hacía falta** para que los valores numéricos no se corten: Cantidad 70→72px, Precio Unit. 100→120px (el que más lo necesitaba, por los separadores de miles y centavos), Mark Up 60→64px.
- **Redistribución del espacio priorizando Solicitado/Sugerido/Ofrecido**: Solicitado y Ofrecido pasaron de 150px a 200px fijos (ancho fijo necesario para que el sticky de abajo tenga un offset predecible); Sugerido se dejó sin ancho fijo (solo `min-w-[160px]`), así se queda con el espacio sobrante de la tabla en vez de competir con las columnas angostas de la derecha.
- **Solicitado y Ofrecido sticky al scrollear horizontalmente**: se les agregó `sticky left-0`/`sticky left-[200px]` (el offset de Ofrecido es el ancho de Solicitado) + `bg-white`/`bg-gray-50` explícito (necesario para que no se transparente el contenido de Sugerido al scrollear por debajo) + `z-index` para quedar por encima de las columnas que sí scrollean. Sugerido, al estar en el medio y no ser sticky, se desplaza normalmente.
- **Líneas de grilla más marcadas**: se pasó de `divide-y divide-gray-100`/`divide-gray-200` (muy tenue) a `divide-gray-300` tanto para las líneas entre filas como para las nuevas líneas verticales entre columnas (`divide-x`), aplicadas por fila. Esto obligó a cambiar la tabla de `divide-y` (a nivel `<table>`) a `border-separate border-spacing-0` con bordes explícitos por fila — es el patrón recomendado para combinar bordes con columnas sticky (con `border-collapse`, Chrome/Safari tienen bugs conocidos donde el borde desaparece al scrollear una celda sticky).
- **Alineación vertical uniforme**: los encabezados ya tenían `align-top` por celda (`<th>`); las filas del cuerpo mantienen el mismo criterio con `align-top` a nivel de fila (patrón que ya traía la grilla y sigue funcionando en los navegadores reales pese a no ser 100% válido por spec de CSS para `<tr>`).

**Nota de verificación**: este cambio es puramente de CSS/Tailwind (sin tocar backend/DB), verificado con `tsc`/`vite build`. No se pudo probar visualmente en el navegador en esta sesión — la extensión de Claude in Chrome no estaba conectada — así que el scroll sticky y el espaciado final conviene revisarlos a simple vista en la próxima sesión por las dudas.

##### Archivos Modificados
**Frontend**: `frontend/src/pages/solicitudesCotizacion/SolicitudCotizacionDetail.tsx`, `frontend/src/components/CurrencyInput.tsx`

### 24 de noviembre de 2026 (continuación 7) — Reestructuración completa de columnas + precio sin IVA cargado directo a mano

Nicole pidió reordenar y rehacer la grilla de ítems con una lista precisa de 11 columnas. Antes de tocar código se confirmaron tres ambigüedades que no estaban en su pedido original (afectaban cálculos de plata, así que no se asumieron):

1. **Mark Up** no aparecía en su lista de columnas → confirmó mantenerlo, como última columna (12ª).
2. **"$ Unitario Sin Iva (ARS/USD)"** → confirmó que **reemplazan** a "Precio Unit.": el precio sin IVA pasa a cargarse directo a mano, en vez de calcularse desde costo + Mark Up.
3. **Unidad de medida/Marca/Modelo** (deben mostrar el dato solicitado pero ser editables) → confirmó el mismo patrón que `cantidad` vs. `cantidadSolicitada`: el dato que pidió el cliente queda inmutable, un campo override nuevo (`unidad`/`marca`/`modelo`, migración 036) pisa la vista si está cargado.

**Grilla web** (`SolicitudCotizacionDetail.tsx`), orden final: **Item** (nº de fila, 1-2-3..., columna angosta ajustada al contenido, sticky) · **Item Solicitado** (mismo ancho/sticky de antes, pero la descripción ya no repite Cant/Unidad/Marca/Modelo en el texto — eso ahora vive en sus propias columnas; solo le queda el ETM como dato secundario) · **Item Sugerido** (sin cambios) · **Item Ofrecido** (sin cambios, sticky) · **Acciones** (sin cambios) · **Cant.** (renombrada, angostada a 56px) · **Unidad de medida** / **Marca** / **Modelo** (columnas nuevas, texto libre editable, mismo patrón `onBlur` que el resto) · **$ Unitario Sin Iva (ARS)** (mismo campo/ancho que la vieja "Precio Unit.", solo relabeled) · **$ Unitario Sin Iva (USD)** (columna nueva, campo `precioUnitarioUsd`, mismo ancho que ARS) · **Mark Up** (sin cambios, al final). Al insertar la columna "Item" antes de "Item Solicitado", los offsets sticky de "Item Solicitado"/"Item Ofrecido" se corrieron (`left-0`→`left-[40px]` y `left-[200px]`→`left-[240px]`) y la columna "Item" también quedó sticky en `left-0`, para no perder de vista el número de fila al scrollear.

**Exportación a Excel/Google Sheets** (`cotizacionExport.service.ts`), ya que el precio sin IVA dejó de derivarse de costo+markup: se sacaron las columnas **Costo** y **Costo Total** del archivo (perdieron sentido: no hay más un "costo" separado del precio final). Las columnas de Marca/Modelo del lado "Solicitado" ahora muestran el valor efectivo (`item.marca ?? item.marcaSolicitada`, igual que ya hacía `cantidad`). Las fórmulas se recalcularon: **Precio Unit. Sin IVA (ARS/USD)** pasan a ser el valor cargado directo (ya no hay fórmula que los derive); **Venta con IVA** ahora es simplemente `precioSinIva * 1.21` (ya no aplica Mark Up); **Total Sin IVA (ARS/USD)** siguen siendo `cantidad × precio unitario`, como fórmula en vivo en el modo interno. Al sacar 2 columnas, todas las letras de columna posteriores a "Proveedor" se corrieron (de M-X a M-V) — se revisaron una por una las fórmulas que referencian celdas por letra para que sigan apuntando a donde corresponde.

**Nota de verificación**: igual que la ronda anterior, no se pudo probar visualmente en el navegador (sin extensión de Chrome conectada) — se verificó compilación (`tsc`/`vite build`) y se revisó a mano el conteo de columnas/letras del Excel, pero conviene que Nicole abra una solicitud real y revise la grilla y el archivo exportado antes de darlo por cerrado, dado lo grande del cambio.

##### Archivos Modificados
**Backend**: `backend/src/repositories/solicitudCotizacion.repository.ts`, `backend/src/controllers/solicitudCotizacion.controller.ts`, `backend/src/services/cotizacionExport.service.ts`
**Frontend**: `frontend/src/pages/solicitudesCotizacion/SolicitudCotizacionDetail.tsx`
**Shared**: `shared/src/types/index.ts`, `shared/src/validators/index.ts`
**Migraciones**: `database/migrations/036_add_overrides_y_precio_usd_solicitud_items.sql`

### 25 de noviembre de 2026 — Fix: las líneas entre filas no se veían + "No Disp."

Nicole notó que las líneas horizontales entre filas de la grilla (agregadas en la ronda de densidad/sticky) no se veían, a diferencia de las líneas verticales entre columnas que sí se veían bien. Causa: estaban puestas como `border-b`/`border-t` en el elemento `<tr>`, pero la tabla usa `border-separate` (necesario para que el sticky de las columnas funcione) — y en ese modo, por spec de CSS, los bordes puestos en `<tr>` (o en `<tbody>`) simplemente **no se dibujan**, solo se respetan los bordes puestos directo en cada celda (`<td>`/`<th>`). Las líneas verticales sí andaban porque Tailwind's `divide-x` aplicado sobre el `<tr>` en realidad les pone `border-left` a los `<td>`/`<th>` (sus hijos directos), no al `<tr>` mismo. Se sacó el `border-b`/`border-t` de todos los `<tr>` (header, filas de ítems y pie) y se puso `border-b`/`border-t` directo en las 12 celdas de cada fila.

De paso, se acortó la etiqueta "No Disponible" a "No Disp." en el botón de acción y en el estado mostrado en la columna "Item Ofrecido" (el texto completo del `confirm()` al marcar un ítem y el enum interno `itemEstadoLabels` se dejaron igual, para no leerse mal dentro de una oración).

### 25 de noviembre de 2026 (continuación) — Wrap text en Item Ofrecido + popup para pegar URL

Dos ajustes puntuales de usabilidad en la grilla:

**Item Ofrecido hace wrap**: el input de texto era un `<input type="text">`, que por naturaleza nunca hace salto de línea (se recorta o scrollea horizontalmente). Se cambió a un `<textarea rows={2} className="... resize-y">`, que sí envuelve el texto largo en varias líneas y además se puede estirar a mano si hace falta más alto.

**Pegar URL de compra externa ahora es un popup**: el input inline que aparecía al hacer click en "URL" quedaba metido en una columna de ~110px, totalmente ilegible para pegar una URL completa. Se reemplazó por un popup centrado (mismo patrón que el modal de "Agregar Artículos"): al hacer click en "URL" se abre con un input ancho y grande, foco automático, Enter guarda (mismo `handleGuardarUrlExterna` de antes) y Escape o click afuera cancela sin guardar.

##### Archivos Modificados
**Frontend**: `frontend/src/pages/solicitudesCotizacion/SolicitudCotizacionDetail.tsx`

### 26 de noviembre de 2026 — Sinónimos de columna configurables para la importación de Excel

Nicole notó que los Excels de Solicitud de Cotización a veces llegan con nombres de columna distintos a los esperados (ej. "CANT." o "QTY" en vez de "Cantidad"). El detector de encabezados (`ItemsCaptureEditor.tsx`, compartido por "Nueva Solicitud" y "Agregar Artículos") ya ignoraba mayúsculas/acentos, pero buscaba un único nombre exacto por campo — sin sinónimos.

Se agregó una pantalla de gestión en **Configuraciones → Sinónimos de Columnas** (nueva pestaña en `/configuraciones`, junto a Rubros/Marcas/Google Drive): una tarjeta por cada uno de los 7 campos detectables (ETM, Descripción, Descripción en inglés, Cantidad, Marca, Modelo, Unidad) con sus sinónimos como chips removibles y un input para agregar uno nuevo (Enter o botón "+"). Tabla nueva `sinonimos_columna_excel` (migración 037), CRUD simple (crear/listar/eliminar, sin update — para corregir uno se borra y se carga de nuevo) siguiendo el mismo patrón de Rubros/Marcas (`BaseRepository`, soft delete).

El detector de encabezados ahora carga la lista completa al montar `ItemsCaptureEditor` y, para cada campo, acepta el nombre exacto de siempre **o** cualquiera de sus sinónimos (ambos pasan por el mismo `normalizarHeader`). Importante: esto también se aplicó a la búsqueda de la fila de encabezados en sí (antes solo reconocía la fila como tal si encontraba literalmente "DESCRIPCION" y "CANTIDAD" — si el archivo llamaba a la columna "DETALLE", ni siquiera se detectaba qué fila era el header). Si la carga de sinónimos falla o el usuario no tiene permiso, se degrada en silencio al comportamiento exacto de siempre (no rompe la importación).

**Permisos**: módulo nuevo `sinonimos_columna_excel` con `leer`/`crear`/`eliminar`, asignado a Administrador y Compras (pedido explícito de Nicole). Se armó como permiso propio en vez de reutilizar `solicitudes_cotizacion:leer` por un hallazgo en el camino: en producción, el rol **Compras no tiene ningún permiso del módulo `solicitudes_cotizacion`** — si el `GET` de sinónimos hubiera dependido de ese permiso, nunca se habrían aplicado al importar para el único rol no-admin al que le importa esta feature. **Esto queda como un posible gap a revisar con Nicole**: Jorge Costilla (rol Compras, quien sube los Excel según la conversación) no tiene acceso formal al módulo de Solicitudes de Cotización por el sistema de permisos — no se tocó nada de eso en esta sesión por ser una decisión de acceso aparte, pero valdría la pena confirmarlo.

##### Archivos Modificados
**Backend**: `backend/src/repositories/sinonimoColumnaExcel.repository.ts` (nuevo), `backend/src/services/sinonimoColumnaExcel.service.ts` (nuevo), `backend/src/controllers/sinonimoColumnaExcel.controller.ts` (nuevo), `backend/src/routes/sinonimoColumnaExcel.routes.ts` (nuevo), `backend/src/routes/index.ts`
**Frontend**: `frontend/src/services/sinonimosColumnaExcel.service.ts` (nuevo), `frontend/src/pages/unidades/SinonimosColumnaExcelTab.tsx` (nuevo), `frontend/src/pages/unidades/UnidadesList.tsx`, `frontend/src/components/solicitudesCotizacion/ItemsCaptureEditor.tsx`
**Shared**: `shared/src/types/index.ts`, `shared/src/validators/index.ts`
**Migraciones**: `database/migrations/037_add_sinonimos_columna_excel.sql`

### 26 de noviembre de 2026 (continuación) — Fix: toggle Excel/Texto parecía un botón de acción

Nicole pensó que el botón "Subir Excel" del importador de ítems no hacía nada — en realidad es un toggle que cambia entre el modo "subir Excel" y "pegar texto" (arranca en Excel por defecto, así que clickearlo estando ya ahí no cambia nada visible). El problema real era de diseño: tenía pinta de botón de acción (borde, fondo, rounded) en vez de pestaña, lo que inducía a pensar que debía "hacer" algo al clickearlo.

Se cambió al mismo patrón de tabs que ya usa el resto del sistema (ej. Configuraciones: Rubros/Marcas/Google Drive) — subrayado inferior en vez de borde completo, sin fondo — y se sacó el verbo de acción de los labels: "Subir Excel" → "Excel", "Pegar texto" → "Texto pegado".

##### Archivos Modificados
**Frontend**: `frontend/src/components/solicitudesCotizacion/ItemsCaptureEditor.tsx`

### 26 de noviembre de 2026 (continuación 2) — Bug: Item Ofrecido se precargaba con el artículo matcheado sin aceptar

Nicole pidió que al importar, "Item Ofrecido" quede en blanco y editable, y que solo se llene al aceptar una sugerencia (botón "Aceptar Sug.", antes "Aceptar sugerencia") o con texto manual. Al revisar, el problema era un bug de más atrás, no solo de la pantalla: en `solicitudCotizacion.repository.ts`, tanto `create()` como `addItems()` insertaban el mismo match del matching automático en **dos** columnas (`articulo_id` y `articulo_id_sugerido`, vía el mismo parámetro `$10` reusado en el INSERT) — aunque `estado_item` quedaba en `'pendiente'` (nunca se seteaba explícito en el insert, así que tomaba el default). La migración 031 (hace unas semanas) había separado ambas columnas justo para evitar esto, pero el insert nunca se actualizó para dejar de pisar `articulo_id` también.

Efecto práctico: `item.articulo` (el artículo "aceptado") quedaba poblado apenas se importaba, aunque el usuario nunca tocó "Aceptar Sug.", y el frontend (`nombreOfrecidoEfectivo`) lo usaba como fallback para precargar "Item Ofrecido" sin chequear `estadoItem`.

**Fix en dos capas**: el insert ahora deja `articulo_id` en `NULL` siempre al crear (solo `articulo_id_sugerido` se carga con el match), y `nombreOfrecidoEfectivo` en el frontend ahora solo cae al nombre del artículo cuando `estadoItem === 'aceptado'` — doble resguardo, para que "Item Ofrecido" dependa únicamente de un "Aceptar Sug." explícito o de texto manual, nunca de un match automático sin confirmar.

**Migración 038** (de datos, no de esquema): limpió los ítems ya existentes que habían quedado en ese estado inconsistente (`pendiente` + `articulo_id` ya cargado igual al sugerido) — 122 filas en producción. No se tocó ningún ítem ya aceptado/no disponible, ni la sugerencia en sí (`articulo_id_sugerido` queda intacto, la columna "Sugerido" sigue mostrando lo mismo).

##### Archivos Modificados
**Backend**: `backend/src/repositories/solicitudCotizacion.repository.ts`
**Frontend**: `frontend/src/pages/solicitudesCotizacion/SolicitudCotizacionDetail.tsx`
**Migraciones**: `database/migrations/038_fix_articulo_id_pendiente_sin_aceptar.sql`

### 26 de noviembre de 2026 (continuación 3) — Precargar $ Unitario Sin IVA (USD) desde el artículo del catálogo

Nicole pidió que al aceptar un ítem desde el catálogo (ya sea con "Aceptar Sug." o buscando uno manual con "Buscar otro"), se precargue el precio unitario sin IVA tanto en ARS como en USD — antes solo se precargaba el de ARS (`articulo.costoInicialEstimado`), dejando el campo USD siempre vacío aunque el artículo ya tuviera cargado `costoInicialEstimadoUsd`.

Se agregó `costoInicialEstimadoUsd` al recorte (`Pick`) de campos de artículo que trae `SolicitudCotizacionItemConArticulo` (antes solo tenía la versión en pesos) y al query de `getItems()` en el repositorio. En el frontend, `handleAceptar` y `handleSeleccionarArticulo` ahora precargan `precioUnitarioUsd` con el mismo criterio que ya usaban para ARS (solo si el campo todavía está vacío, para no pisar un valor que el usuario ya haya cargado a mano).

##### Archivos Modificados
**Backend**: `backend/src/repositories/solicitudCotizacion.repository.ts`
**Frontend**: `frontend/src/pages/solicitudesCotizacion/SolicitudCotizacionDetail.tsx`
**Shared**: `shared/src/types/index.ts`

### 26 de noviembre de 2026 (continuación 4) — Fix: imagen rota en el Excel ("IMAGE is an unsupported function")

Nicole detectó que al abrir el Excel exportado, la columna "Imagen de lo Ofrecido" mostraba el error de Excel "The formula couldn't be imported. IMAGE is an unsupported function" en vez de la imagen — la celda tenía la fórmula `=IMAGE("url")`, que es una función nativa de **Google Sheets**, no de Excel.

Esa fórmula seguía siendo necesaria para la exportación a Google Sheets (ahí sí la soporta), así que `buildCotizacionSheetData`/`valorColumnaItem` ahora reciben un parámetro `destino: 'sheets' | 'excel'` para diferenciar: a Google Sheets le sigue mandando la fórmula `IMAGE()`; para Excel, la celda de imagen queda en blanco y en `buildCotizacionExcelBuffer` se agregó un paso nuevo que **descarga** cada imagen (Cloudinary) y la **incrusta como imagen real** en la celda correspondiente (mismo mecanismo que ya se usaba para los logos institucionales, `workbook.addImage` + `sheet.addImage` anclado a esa fila/columna puntual). Las descargas van en paralelo (`Promise.all`) con un timeout de 8s por imagen para que una URL caída no cuelgue todo el export; si una imagen falla, esa celda queda sin imagen pero el resto del archivo se genera igual.

No requirió migración (no hay cambio de esquema). No se pudo probar generando un Excel real en esta sesión (sin forma fácil de disparar el export localmente) — se verificó compilación y revisión manual del código; vale la pena que Nicole genere un Excel de una solicitud con artículos con imagen para confirmar que se ve bien.

##### Archivos Modificados
**Backend**: `backend/src/services/cotizacionExport.service.ts`

### 28 de noviembre de 2026 — Columnas Sol./Ofr. separadas + gestor de columnas visibles

Nicole pidió una reestructuración grande de la grilla de ítems para que no se confunda "lo que pidió el cliente" con "lo que se está ofreciendo":

**Columnas nuevas, de solo lectura** (lo que vino del Excel/texto importado, nunca editable): **Cant. Sol.**, **Marca Sol.**, **Modelo Sol.** — muestran directo `cantidadSolicitada`/`marcaSolicitada`/`modeloSolicitado`, ubicadas junto a "Item Solicitado".

**Columnas editables renombradas** (antes "Cant.", "Marca", "Modelo" — los overrides que ya existían, mismo campo/lógica de siempre, solo cambió la etiqueta): ahora son **Cant. Ofr.**, **Marca Ofr.**, **Modelo Ofr.**. "Unidad de medida" no se tocó (no tenía una contraparte "Sol." pedida).

Las 6 columnas abreviadas tienen un `title` (tooltip nativo del navegador al hacer hover) con el nombre completo: Cantidad Solicitada, Marca Solicitada, Modelo Solicitado, Cantidad Ofrecida, Marca Ofrecida, Modelo Ofrecido.

**Columnas eliminadas**: "Item" (el número de fila) y "$ Unitario Sin Iva (USD)". Esta última se sacó solo de la grilla — el campo `precioUnitarioUsd` sigue existiendo en la base y en la exportación a Excel/Sheets (que sigue calculando Total Sin IVA USD con ese valor), y el auto-completado al aceptar un artículo del catálogo (`costoInicialEstimadoUsd`) se dejó intacto — simplemente ya no hay forma de verlo/editarlo a mano desde la grilla. Si en algún momento hace falta cargarlo manualmente de nuevo, va a hacer falta reagregar la columna.

**Gestor de columnas visibles**: nuevo botón "Columnas" (icono, arriba de la grilla) que abre un desplegable con un checkbox por columna — todas menos **Item Solicitado** e **Item Ofrecido**, que quedan siempre visibles por ser las columnas sticky de referencia. Incluye "Tildar todas"/"Destildar todas". La preferencia se guarda en `localStorage` (clave `hofra:solicitudCotizacion:columnasVisibles`), por navegador, no por servidor — persiste entre sesiones pero no viaja entre dispositivos ni usuarios. Ocultar una columna es solo visual: el dato sigue ahí y se sigue exportando igual a Excel/Sheets.

El pie de la tabla (fila "Total") ahora calcula su `colSpan` dinámicamente según cuántas columnas están visibles en cada momento, en vez de un número fijo — necesario porque antes ocultar/mostrar columnas desalinearía esa fila.

##### Archivos Modificados
**Frontend**: `frontend/src/pages/solicitudesCotizacion/SolicitudCotizacionDetail.tsx`

### 28 de noviembre de 2026 (continuación) — Fix: tooltip nativo del navegador poco confiable

Nicole notó que el tooltip (`title` nativo del navegador) en las 6 columnas abreviadas (Cant./Marca/Modelo Sol./Ofr.) tardaba y no se mostraba de forma consistente — comportamiento conocido del atributo `title`, que depende del navegador/SO y suele tener un delay largo y variable.

Se reemplazó por un tooltip propio en CSS puro (patrón `group`/`group-hover` de Tailwind, sin JS ni librería): un `<span>` con el label subrayado punteado (para indicar que tiene más info) y un globito oscuro debajo que aparece apenas se pasa el mouse, sin el delay del navegador. Se armó como componente reutilizable (`EncabezadoConTooltip`) para no repetir el markup en las 6 columnas.

##### Archivos Modificados
**Frontend**: `frontend/src/pages/solicitudesCotizacion/SolicitudCotizacionDetail.tsx`

### 28 de noviembre de 2026 (continuación 2) — Imagen incrustada a tamaño real + Marca/Modelo/Unidad Ofr. ya no heredan del Solicitado

**Imagen del Excel a tamaño correcto**: la imagen incrustada (ver fix anterior de "IMAGE is an unsupported function") se estaba estirando para llenar la celda entera, deformando la proporción original. Se agregó la dependencia `image-size` (liviana, sin binarios nativos; se fijó en `^1.2.1` porque la 2.x exige Node 22 y Railway corre Node 20) para leer el ancho/alto real de la imagen descargada y escalarla manteniendo su proporción hasta entrar en un máximo de 170pt de ancho × 50pt de alto (coincide con el alto de fila ya fijado) — nunca agranda una imagen más chica que ese máximo, solo reduce. Técnicamente se pasó de un anchor de dos puntas (`tl`/`br`, que estira la imagen al tamaño exacto de la celda) a un anchor de una punta con tamaño explícito en píxeles (`tl` + `ext: {width, height}`), convirtiendo puntos a píxeles a 96dpi (`pt * 96/72`).

**Marca Ofr./Modelo Ofr./Unidad de Medida dejan de heredar del lado "Solicitado"**: Nicole notó que estas tres columnas editables, cuando estaban vacías, se completaban con lo que pidió el cliente (`marcaSolicitada`/`modeloSolicitado`/`unidadSolicitada`) — confuso ahora que existen columnas "Sol." dedicadas y de solo lectura para eso. Se cambió el valor por defecto de las tres para que, en vez de cliente, miren al lado "Ofrecido": si hay un override cargado a mano gana siempre; si no, y el ítem ya fue aceptado, se completa con el dato del **artículo del catálogo** (mismo patrón que ya usaba `nombreOfrecidoEfectivo`). Con una salvedad real de modelo de datos: la tabla `articulos` no tiene campos de `modelo` ni `unidad` (se habían sacado hace tiempo), así que esos dos nunca tienen de dónde completarse automáticamente — quedan en blanco hasta que alguien los tipee a mano, incluso con un artículo ya aceptado. Marca sí tiene de dónde traerse (`articulo.marca`).

De paso se corrigió la misma inconsistencia en la exportación a Excel/Google Sheets, que tenía exactamente el mismo problema en el otro sentido: las columnas "MARCA"/"MODELO" del lado Solicitado mostraban el valor con override ya aplicado (debían mostrar lo puro solicitado); "Marca Ofrecida" ya estaba bien pero ahora también respeta el override manual antes que el artículo; "Modelo Ofrecido" estaba hardcodeada en blanco con un comentario "no lo trackeamos" (ya no es cierto, ahora se carga en la grilla); "Unidad de Medida" devolvía literalmente el string fijo `"Unidad"` si había artículo matcheado, en vez del dato real cargado.

##### Archivos Modificados
**Backend**: `backend/src/services/cotizacionExport.service.ts`, `backend/package.json` (nueva dependencia `image-size`)
**Frontend**: `frontend/src/pages/solicitudesCotizacion/SolicitudCotizacionDetail.tsx`

### 28 de noviembre de 2026 (continuación 3) — Sidebar más angosto, ítems corridos a la izquierda y renombre "Configuraciones" → "Configurar"

Ajuste de layout en el menú lateral (`AdminLayout.tsx`): el ancho expandido pasó de `w-64` (256px) a `w-48` (192px) — se achicó para que el máximo necesario sea el de la palabra más larga del menú, "Reposiciones", en vez del valor por defecto de Tailwind. Se redujeron también los paddings horizontales del `<nav>` y de cada link (`sidebar-link` en `index.css`: `px-4`→`px-3`, `gap-3`→`gap-2`) para correr el texto e íconos un poco más a la izquierda. El padding del contenido principal (`lg:pl-64`→`lg:pl-48`) se actualizó en conjunto para que no quede un hueco en blanco al lado del sidebar angosto. El ítem de menú "Configuraciones" se renombró a "Configurar" (solo la etiqueta del menú; el título de la página en `UnidadesList.tsx` sigue diciendo "Configuraciones").

##### Archivos Modificados
**Frontend**: `frontend/src/layouts/AdminLayout.tsx`, `frontend/src/index.css`

### 28 de noviembre de 2026 (continuación 4) — Columna "Unidad de medida" renombrada a "Presentación" (grilla)

En la grilla de Solicitud de Cotización, la columna "Unidad de medida" pasó a llamarse "Presentación" (tanto en el header de la tabla como en el desplegable de mostrar/ocultar columnas). Nicole pidió que el encabezado se vea partido en dos renglones dentro de la celda angosta (90px), tipo "Presen" / "tación" — se forzó el corte a mitad de palabra con un `<br />` explícito (en vez de depender de `break-words`, que solo corta en el límite natural de la palabra) y se usa el mismo componente `EncabezadoConTooltip` que ya tenían las demás columnas, así que al pasar el mouse por el encabezado se sigue viendo "Presentación" completa.

##### Archivos Modificados
**Frontend**: `frontend/src/pages/solicitudesCotizacion/SolicitudCotizacionDetail.tsx`

### 28 de noviembre de 2026 (continuación 5) — El buscador de "Buscar otro" artículo se ensancha mientras se escribe

En la columna "Acciones", al hacer click en "Buscar otro" se abre un `ArticuloCombobox` metido en una celda de 110px — el desplegable con los resultados ya se veía bien ancho (`dropdownClassName="min-w-[520px]"`), pero el input donde se tipea quedaba atrapado en esos 110px, así que no se podía leer ni seleccionar bien lo que uno iba escribiendo. Se agregó un prop nuevo `expandOnFocus` a `ArticuloCombobox`: mientras el desplegable está abierto, el input pasa a `position: absolute` (superpuesto, no empuja el layout de la tabla ni ensancha la columna para todas las filas) y su ancho crece con la cantidad de caracteres tipeados (mínimo 260px, máximo 420px); al cerrarse vuelve a su tamaño normal dentro de la celda. Se activó solo en este uso puntual (la celda "Buscar otro" de Solicitud de Cotización); el resto de los usos de `ArticuloCombobox` (Reposiciones, Entregas, etc.) quedan sin cambios porque no pasan el nuevo prop.

##### Archivos Modificados
**Frontend**: `frontend/src/components/ArticuloCombobox.tsx`, `frontend/src/pages/solicitudesCotizacion/SolicitudCotizacionDetail.tsx`

### 28 de noviembre de 2026 (continuación 6) — Imagen del Excel: tamaño máximo 160×40pt y centrada en la celda

Ajuste sobre el fix anterior de la imagen incrustada: el máximo bajó de 170×50pt a **160pt de ancho × 40pt de alto** (`IMAGEN_MAX_WIDTH_PT`/`IMAGEN_MAX_HEIGHT_PT` en `cotizacionExport.service.ts`), siempre escalando manteniendo proporción sin agrandar. El alto de fila se dejó en 50pt (ahora como constante `FILA_ITEM_ALTURA_PT` en vez de un `50` suelto) a propósito — al ser más alto que el máximo de la imagen (40pt) queda margen para centrarla verticalmente.

**Centrado**: se pasó de un anchor fijo en la esquina (`tl: {col, row}` entero) a uno con offset fraccionario — exceljs permite `col`/`row` fraccionarios (ej. `2.5` = mitad de la columna 2) para ubicar la imagen desplazada dentro de la celda en vez de pegada a la esquina superior izquierda. Se calcula cuánto "sobra" de columna y de fila respecto al tamaño ya escalado de la imagen, y se reparte mitad a cada lado. Para el alto de fila es exacto (el alto de fila en exceljs ya está en puntos). Para el ancho de columna no es exacto: exceljs guarda el ancho de columna en "unidades de carácter" de Excel, no en píxeles/puntos, así que se aproxima con la fórmula estándar de Excel para la fuente por defecto (Calibri 11, ancho de dígito máximo ≈ 7px) — queda centrada a ojo, no al pixel exacto, pero muy cerca.

##### Archivos Modificados
**Backend**: `backend/src/services/cotizacionExport.service.ts`

### 28 de noviembre de 2026 (continuación 7) — Fix: texto "grayed out" en N° Cotización, Nombre, USD Oficial Compra/Venta

Estos 4 campos del encabezado de Solicitud de Cotización se deshabilitan (`disabled`) apenas la solicitud sale del estado "en_revision", para que no se puedan seguir editando — pero la clase `.input` global aplica `disabled:bg-gray-100` a cualquier input deshabilitado, y además los navegadores suelen apagar el color de texto de un `<input disabled>` por su cuenta. El resultado era que, una vez pasada de "en_revision", esos 4 valores quedaban grises sobre gris y costaba leerlos — justo los que Nicole más necesita consultar después (número y nombre de la cotización, cotización oficial del dólar). Se agregó un override puntual (`disabled:bg-white disabled:text-gray-900 disabled:border-gray-200`) solo en estos 4 inputs para que el valor se siga viendo con texto normal y fondo blanco aunque el campo esté bloqueado; el resto de los inputs deshabilitados de la pantalla (Fecha de Entrega, Lugar de Entrega, Solicitado Por) no se tocaron.

##### Archivos Modificados
**Frontend**: `frontend/src/pages/solicitudesCotizacion/SolicitudCotizacionDetail.tsx`

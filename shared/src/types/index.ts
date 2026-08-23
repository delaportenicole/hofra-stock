// ============================================
// TIPOS BASE
// ============================================

export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  createdBy: string | null;
  updatedBy: string | null;
}

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: Record<string, string[]>;
}

// ============================================
// USUARIOS Y AUTENTICACIÓN
// ============================================

export interface Usuario extends BaseEntity {
  username: string;
  email: string;
  nombre: string;
  apellido: string;
  activo: boolean;
  ultimoAcceso: Date | null;
}

export interface UsuarioConRoles extends Usuario {
  roles: Rol[];
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  usuario: UsuarioConRoles;
  tokens: AuthTokens;
}

export interface JwtPayload {
  userId: string;
  email: string;
  roles: string[];
  permisos: string[];
  iat?: number;
  exp?: number;
}

// ============================================
// ROLES Y PERMISOS
// ============================================

export interface Rol extends BaseEntity {
  nombre: string;
  descripcion: string | null;
}

export interface Permiso extends BaseEntity {
  modulo: string;
  accion: AccionPermiso;
  descripcion: string | null;
}

export type AccionPermiso = 'crear' | 'leer' | 'actualizar' | 'eliminar';

export interface RolConPermisos extends Rol {
  permisos: Permiso[];
}

// ============================================
// RUBROS
// ============================================

export interface Rubro extends BaseEntity {
  nombre: string;
  descripcion: string | null;
  prefijo: string;
  activo: boolean;
}

// ============================================
// MARCAS
// ============================================

export interface Marca extends BaseEntity {
  nombre: string;
  descripcion: string | null;
  activo: boolean;
}

export interface CreateMarcaDto {
  nombre: string;
  descripcion?: string | null;
}

export interface UpdateMarcaDto {
  nombre?: string;
  descripcion?: string | null;
  activo?: boolean;
}

// ============================================
// CLIENTES
// ============================================

export interface Cliente extends BaseEntity {
  razonSocial: string;
  cuit: string;
  direccion: string | null;
  telefono: string | null;
  email: string | null;
  contacto: string | null;
  notas: string | null;
  activo: boolean;
}

// ============================================
// PROVEEDORES
// ============================================

export interface Proveedor extends BaseEntity {
  razonSocial: string;
  nombreFantasia: string | null;
  cuit: string | null;
  direccion: string | null;
  telefono: string | null;
  email: string | null;
  contacto: string | null;
  notas: string | null;
  activo: boolean;
}

// ============================================
// ARTÍCULOS
// ============================================

export interface Articulo extends BaseEntity {
  codigo: string;
  nombre: string;
  rubroId: string;
  proveedorId: string | null;
  stock: number;
  stockMinimo: number;
  presentacion: string | null;
  marca: string | null;
  sku: string | null;
  etm: string | null;
  stockActual: number;
  numeroCotizacionInterna: number | null;
  ubicacion: string | null;
  url: string | null;
  imagenUrl: string | null;
  imagenPublicId: string | null;
  costoInicialEstimado: number | null;
  valorDolarCostoInicial: number | null;
  costoInicialEstimadoUsd: number | null;
  activo: boolean;
}

export interface ArticuloConRelaciones extends Articulo {
  rubro: Rubro;
  proveedor: Proveedor | null;
}

export interface ArticuloFiltros {
  busqueda?: string;
  rubroId?: string;
  proveedorId?: string;
  stockBajo?: boolean;
  activo?: boolean;
}

// ============================================
// REPOSICIONES
// ============================================

export type EstadoReposicion = 'en_curso' | 'confirmada' | 'cancelada';

export interface Reposicion extends BaseEntity {
  articuloId: string;
  proveedorId: string;
  cantidad: number;
  stockDisponible: number;
  observaciones: string | null;
  fechaReposicion: Date;
  costoReposicion: number | null;
  valorDolarOficial: number | null;
  costoReposicionDolares: number | null;
  fechaVencimiento: Date | null;
  lotePartida: string | null;
  linkCompra: string | null;
  lugarCompra: string | null;
  estado: EstadoReposicion;
}

export interface ReposicionConRelaciones extends Reposicion {
  articulo: Articulo;
  proveedor: Proveedor;
}

// ============================================
// ENTREGAS
// ============================================

export type EstadoEntrega = 'en_curso' | 'confirmada' | 'cancelada';

export interface EntregaItem {
  id: string;
  entregaId: string;
  articuloId: string;
  cantidad: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface EntregaItemConArticulo extends EntregaItem {
  articulo: Pick<Articulo, 'id' | 'codigo' | 'nombre' | 'costoInicialEstimado'>;
}

export interface Entrega extends BaseEntity {
  clienteId: string;
  numeroCotizacionInterna: string;
  purchaseOrder: string | null;
  observaciones: string | null;
  fechaEntrega: Date;
  estado: EstadoEntrega;
}

export interface EntregaConRelaciones extends Entrega {
  cliente: Cliente;
  items: EntregaItemConArticulo[];
}

// ============================================
// SOLICITUDES DE COTIZACIÓN
// ============================================

export type EstadoSolicitudCotizacion = 'en_revision' | 'cotizada' | 'cancelada';

export type MatchConfianza = 'etm' | 'nombre' | 'sin_match';

export type EstadoItemCotizacion = 'pendiente' | 'aceptado' | 'a_comprar';

export interface SolicitudCotizacionItem {
  id: string;
  solicitudId: string;
  orden: number;
  etmSolicitado: string | null;
  descripcionSolicitada: string;
  marcaSolicitada: string | null;
  cantidadSolicitada: number;
  articuloId: string | null;
  matchConfianza: MatchConfianza | null;
  estadoItem: EstadoItemCotizacion;
  precioUnitario: number | null;
  urlExterna: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SolicitudCotizacionItemConArticulo extends SolicitudCotizacionItem {
  articulo: Pick<Articulo, 'id' | 'codigo' | 'nombre' | 'marca' | 'etm' | 'sku' | 'costoInicialEstimado' | 'stockActual'> | null;
}

export interface SolicitudCotizacion extends BaseEntity {
  clienteId: string;
  numeroReferenciaCliente: string | null;
  nombreArchivo: string | null;
  fechaSolicitud: Date;
  estado: EstadoSolicitudCotizacion;
  observaciones: string | null;
}

export interface SolicitudCotizacionConRelaciones extends SolicitudCotizacion {
  cliente: Cliente;
  items: SolicitudCotizacionItemConArticulo[];
}

// ============================================
// AUDITORÍA
// ============================================

export type AccionAuditoria =
  | 'crear'
  | 'actualizar'
  | 'eliminar'
  | 'login'
  | 'logout'
  | 'reposicion'
  | 'entrega';

export interface AuditLog extends BaseEntity {
  usuarioId: string | null;
  accion: AccionAuditoria;
  entidad: string;
  entidadId: string | null;
  datosAnteriores: Record<string, unknown> | null;
  datosNuevos: Record<string, unknown> | null;
  ip: string | null;
  userAgent: string | null;
}

export interface AuditLogConUsuario extends AuditLog {
  usuario: Pick<Usuario, 'id' | 'nombre' | 'apellido' | 'email'> | null;
}

export interface AuditLogFiltros {
  usuarioId?: string;
  accion?: AccionAuditoria;
  entidad?: string;
  entidades?: string[];
  fechaDesde?: Date;
  fechaHasta?: Date;
}

// ============================================
// DASHBOARD
// ============================================

export interface DashboardStats {
  totalArticulos: number;
  totalArticulosEnSistema: number;
  articulosStockBajo: number;
  entregasMes: number;
  reposicionesMes: number;
  valuacionTotalARS: number;
  valuacionTotalUSD: number | null;
}

export interface MovimientoReciente {
  id: string;
  tipo: 'entrega' | 'reposicion';
  articuloNombre: string;
  cantidad: number;
  fecha: Date;
  terceroNombre: string;
}

export interface ArticuloStockBajo {
  id: string;
  codigo: string;
  nombre: string;
  stock: number;
  stockMinimo: number;
  rubroNombre: string;
}

// ============================================
// VALUACIÓN DE STOCK
// ============================================

export interface CapaStock {
  reposicionId: string;
  fechaReposicion: Date;
  stockDisponible: number;
  costoUnitario: number;
  costoUnitarioDolares: number | null;
  valorCapa: number;
  valorCapaDolares: number | null;
  lotePartida: string | null;
  proveedorNombre: string;
}

export interface ValuacionStock {
  articuloId: string;
  stockTotal: number;
  stockConCosto: number;
  stockSinCosto: number;
  valorTotalARS: number;
  valorTotalUSD: number | null;
  costoPromedioARS: number | null;
  costoPromedioUSD: number | null;
  capas: CapaStock[];
  costoInicialEstimado: number | null;
  stockInicialSinReposicion: number;
  valorStockInicial: number;
}

// ============================================
// FORMULARIOS
// ============================================

export interface CreateUsuarioDto {
  username: string;
  email: string;
  password: string;
  nombre: string;
  apellido: string;
  roleIds: string[];
}

export interface UpdateUsuarioDto {
  username?: string;
  email?: string;
  nombre?: string;
  apellido?: string;
  activo?: boolean;
  roleIds?: string[];
}

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}

export interface CreateRubroDto {
  nombre: string;
  descripcion?: string;
  prefijo: string;
}

export interface UpdateRubroDto {
  nombre?: string;
  descripcion?: string;
  prefijo?: string;
  activo?: boolean;
}

export interface CreateClienteDto {
  razonSocial: string;
  cuit: string;
  direccion?: string;
  telefono?: string;
  email?: string;
  contacto?: string;
  notas?: string;
}

export interface UpdateClienteDto {
  razonSocial?: string;
  cuit?: string;
  direccion?: string;
  telefono?: string;
  email?: string;
  contacto?: string;
  notas?: string;
  activo?: boolean;
}

export interface CreateProveedorDto {
  razonSocial: string;
  nombreFantasia?: string;
  cuit?: string;
  direccion?: string;
  telefono?: string;
  email?: string;
  contacto?: string;
  notas?: string;
}

export interface UpdateProveedorDto {
  razonSocial?: string;
  nombreFantasia?: string;
  cuit?: string;
  direccion?: string;
  telefono?: string;
  email?: string;
  contacto?: string;
  notas?: string;
  activo?: boolean;
}

export interface CreateArticuloDto {
  codigo: string;
  nombre: string;
  rubroId: string;
  proveedorId?: string;
  stockMinimo: number;
  presentacion?: string;
  marca?: string;
  sku?: string;
  etm?: string;
  ubicacion?: string;
  url?: string;
  costoInicialEstimado?: number;
  valorDolarCostoInicial?: number;
}

export interface UpdateArticuloDto {
  codigo?: string;
  nombre?: string;
  rubroId?: string;
  proveedorId?: string;
  stockMinimo?: number;
  presentacion?: string;
  marca?: string;
  sku?: string;
  etm?: string;
  ubicacion?: string;
  url?: string;
  costoInicialEstimado?: number;
  valorDolarCostoInicial?: number;
  activo?: boolean;
}

export interface CreateReposicionDto {
  articuloId: string;
  proveedorId: string;
  cantidad: number;
  costoReposicion: number;
  valorDolarOficial: number;
  observaciones?: string;
  fechaReposicion?: Date;
  fechaVencimiento?: Date;
  lotePartida?: string;
  linkCompra?: string;
  lugarCompra?: string;
}

export interface UpdateReposicionDto {
  proveedorId?: string;
  costoReposicion?: number;
  valorDolarOficial?: number;
  observaciones?: string;
  fechaVencimiento?: Date;
  lotePartida?: string;
  linkCompra?: string;
  lugarCompra?: string;
}

export interface CreateEntregaItemDto {
  articuloId: string;
  cantidad: number;
}

export interface CreateEntregaDto {
  clienteId: string;
  numeroCotizacionInterna: string;
  purchaseOrder?: string;
  items: CreateEntregaItemDto[];
  observaciones?: string;
  fechaEntrega?: Date;
}

export interface CreateSolicitudCotizacionItemDto {
  orden: number;
  etmSolicitado?: string | null;
  descripcionSolicitada: string;
  marcaSolicitada?: string | null;
  cantidadSolicitada: number;
}

export interface CreateSolicitudCotizacionDto {
  clienteId: string;
  numeroReferenciaCliente?: string | null;
  nombreArchivo?: string | null;
  observaciones?: string | null;
  items: CreateSolicitudCotizacionItemDto[];
}

export interface UpdateSolicitudCotizacionDto {
  numeroReferenciaCliente?: string | null;
  observaciones?: string | null;
}

export interface UpdateSolicitudCotizacionItemDto {
  articuloId?: string | null;
  estadoItem?: EstadoItemCotizacion;
  precioUnitario?: number | null;
  urlExterna?: string | null;
}

export interface CreateRolDto {
  nombre: string;
  descripcion?: string;
  permisoIds: string[];
}

export interface UpdateRolDto {
  nombre?: string;
  descripcion?: string;
  permisoIds?: string[];
}

// ============================================
// SUGERENCIAS
// ============================================

export type PrioridadSugerencia = 'alta' | 'media' | 'baja';
export type EstadoSugerencia = 'nueva' | 'en_progreso' | 'resuelta' | 'cancelada';

export interface Sugerencia extends BaseEntity {
  titulo: string;
  descripcion: string;
  prioridad: PrioridadSugerencia;
  estado: EstadoSugerencia;
}

export interface SugerenciaConUsuario extends Sugerencia {
  creador: Pick<Usuario, 'id' | 'nombre' | 'apellido'> | null;
}

export interface CreateSugerenciaDto {
  titulo: string;
  descripcion: string;
  prioridad?: PrioridadSugerencia;
}

export interface UpdateSugerenciaDto {
  titulo?: string;
  descripcion?: string;
  prioridad?: PrioridadSugerencia;
  estado?: EstadoSugerencia;
}

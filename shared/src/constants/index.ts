// ============================================
// MÓDULOS DEL SISTEMA
// ============================================

export const MODULOS = {
  USUARIOS: 'usuarios',
  ROLES: 'roles',
  RUBROS: 'rubros',
  CLIENTES: 'clientes',
  PROVEEDORES: 'proveedores',
  ARTICULOS: 'articulos',
  REPOSICIONES: 'reposiciones',
  ENTREGAS: 'entregas',
  AUDITORIA: 'auditoria',
  DASHBOARD: 'dashboard',
} as const;

export type Modulo = (typeof MODULOS)[keyof typeof MODULOS];

// ============================================
// ACCIONES DE PERMISOS
// ============================================

export const ACCIONES = {
  CREAR: 'crear',
  LEER: 'leer',
  ACTUALIZAR: 'actualizar',
  ELIMINAR: 'eliminar',
} as const;

export type Accion = (typeof ACCIONES)[keyof typeof ACCIONES];

// ============================================
// ROLES PREDEFINIDOS
// ============================================

export const ROLES = {
  ADMINISTRADOR: 'Administrador',
  COMPRAS: 'Compras',
  DEPOSITO: 'Depósito',
  CONSULTA: 'Consulta',
} as const;

export type RolNombre = (typeof ROLES)[keyof typeof ROLES];

// ============================================
// RUBROS INICIALES
// ============================================

export const RUBROS_INICIALES = [
  { nombre: 'Ferretería', descripcion: 'Herramientas y elementos de ferretería' },
  { nombre: 'Electricidad', descripcion: 'Materiales eléctricos' },
  { nombre: 'Plomería', descripcion: 'Materiales de plomería' },
  { nombre: 'Pinturería', descripcion: 'Pinturas y accesorios' },
  { nombre: 'Seguridad', descripcion: 'Elementos de protección personal' },
  { nombre: 'Limpieza', descripcion: 'Artículos de limpieza' },
  { nombre: 'Oficina', descripcion: 'Insumos de oficina' },
  { nombre: 'Varios', descripcion: 'Artículos varios' },
] as const;

// ============================================
// CONFIGURACIÓN DE PAGINACIÓN
// ============================================

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

// ============================================
// CONFIGURACIÓN JWT
// ============================================

export const JWT_CONFIG = {
  ACCESS_TOKEN_EXPIRY: '15m',
  REFRESH_TOKEN_EXPIRY: '7d',
} as const;

// ============================================
// CLOUDINARY
// ============================================

export const CLOUDINARY_CONFIG = {
  FOLDER: 'hofra-stock/articulos',
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_FORMATS: ['jpg', 'jpeg', 'png', 'webp'],
  TRANSFORMATION: {
    width: 800,
    height: 800,
    crop: 'limit',
    quality: 'auto',
    format: 'auto',
  },
} as const;

// ============================================
// MENSAJES DE ERROR
// ============================================

export const ERROR_MESSAGES = {
  // Auth
  INVALID_CREDENTIALS: 'Credenciales inválidas',
  TOKEN_EXPIRED: 'Sesión expirada. Por favor, inicie sesión nuevamente',
  TOKEN_INVALID: 'Token inválido',
  UNAUTHORIZED: 'No autorizado',
  FORBIDDEN: 'No tiene permisos para realizar esta acción',

  // Validación
  REQUIRED_FIELD: 'Este campo es requerido',
  INVALID_EMAIL: 'Email inválido',
  INVALID_CUIT: 'CUIT inválido',
  PASSWORD_TOO_SHORT: 'La contraseña debe tener al menos 8 caracteres',
  PASSWORD_MISMATCH: 'Las contraseñas no coinciden',

  // Stock
  INSUFFICIENT_STOCK: 'Stock insuficiente',
  NEGATIVE_QUANTITY: 'La cantidad debe ser mayor a 0',

  // General
  NOT_FOUND: 'Recurso no encontrado',
  ALREADY_EXISTS: 'El recurso ya existe',
  INTERNAL_ERROR: 'Error interno del servidor',
  VALIDATION_ERROR: 'Error de validación',
} as const;

// ============================================
// MENSAJES DE ÉXITO
// ============================================

export const SUCCESS_MESSAGES = {
  CREATED: 'Creado correctamente',
  UPDATED: 'Actualizado correctamente',
  DELETED: 'Eliminado correctamente',
  LOGIN_SUCCESS: 'Inicio de sesión exitoso',
  LOGOUT_SUCCESS: 'Sesión cerrada correctamente',
  PASSWORD_CHANGED: 'Contraseña actualizada correctamente',
} as const;

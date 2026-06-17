import { z } from 'zod';

// ============================================
// VALIDADORES COMUNES
// ============================================

// Schema para parsear booleanos desde query strings ("true"/"false")
export const booleanStringSchema = z
  .union([z.boolean(), z.string()])
  .transform((val) => {
    if (typeof val === 'boolean') return val;
    return val === 'true';
  });

export const uuidSchema = z.string().uuid('ID inválido');

export const emailSchema = z
  .string()
  .min(1, 'El email es requerido')
  .email('Email inválido');

export const passwordSchema = z
  .string()
  .min(8, 'La contraseña debe tener al menos 8 caracteres')
  .max(100, 'La contraseña es demasiado larga');

// Validación de CUIT argentino (formato: XX-XXXXXXXX-X)
export const cuitSchema = z
  .string()
  .min(1, 'El CUIT es requerido')
  .regex(
    /^(20|23|24|25|26|27|30|33|34)-?\d{8}-?\d$/,
    'CUIT inválido. Formato esperado: XX-XXXXXXXX-X'
  )
  .transform((val) => val.replace(/-/g, ''));

export const telefonoSchema = z
  .string()
  .regex(/^[\d\s\-+()]+$/, 'Teléfono inválido')
  .optional()
  .nullable();

// ============================================
// PAGINACIÓN
// ============================================

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(1000).default(20),
  sortBy: z.string().default('nombre'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// ============================================
// AUTH
// ============================================

export const usernameSchema = z
  .string()
  .min(3, 'El nombre de usuario debe tener al menos 3 caracteres')
  .max(50, 'El nombre de usuario no puede tener más de 50 caracteres')
  .regex(/^[a-zA-Z0-9_.-]+$/, 'Solo letras, números, puntos, guiones y guiones bajos');

export const loginSchema = z.object({
  username: z.string().min(1, 'El usuario es requerido'),
  password: z.string().min(1, 'La contraseña es requerida'),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'La contraseña actual es requerida'),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, 'Confirme la nueva contraseña'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  });

// ============================================
// USUARIOS
// ============================================

export const createUsuarioSchema = z.object({
  username: usernameSchema,
  email: emailSchema,
  password: passwordSchema,
  nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(100),
  apellido: z.string().min(2, 'El apellido debe tener al menos 2 caracteres').max(100),
  roleIds: z.array(uuidSchema).min(1, 'Debe asignar al menos un rol'),
});

export const updateUsuarioSchema = z.object({
  username: usernameSchema.optional(),
  email: emailSchema.optional(),
  nombre: z.string().min(2).max(100).optional(),
  apellido: z.string().min(2).max(100).optional(),
  activo: z.boolean().optional(),
  roleIds: z.array(uuidSchema).optional(),
});

// ============================================
// ROLES
// ============================================

export const createRolSchema = z.object({
  nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(50),
  descripcion: z.string().max(255).optional().nullable(),
  permisoIds: z.array(uuidSchema).default([]),
});

export const updateRolSchema = z.object({
  nombre: z.string().min(2).max(50).optional(),
  descripcion: z.string().max(255).optional().nullable(),
  permisoIds: z.array(uuidSchema).optional(),
});

// ============================================
// RUBROS
// ============================================

export const createRubroSchema = z.object({
  nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(100),
  descripcion: z.string().max(255).optional().nullable(),
  prefijo: z
    .string()
    .min(1, 'El prefijo es requerido')
    .max(10, 'El prefijo no puede tener más de 10 caracteres')
    .regex(/^[A-Za-z]+$/, 'El prefijo solo puede contener letras')
    .transform((val) => val.toUpperCase()),
});

export const updateRubroSchema = z.object({
  nombre: z.string().min(2).max(100).optional(),
  descripcion: z.string().max(255).optional().nullable(),
  prefijo: z
    .string()
    .min(1, 'El prefijo es requerido')
    .max(10, 'El prefijo no puede tener más de 10 caracteres')
    .regex(/^[A-Za-z]+$/, 'El prefijo solo puede contener letras')
    .transform((val) => val.toUpperCase())
    .optional(),
  activo: z.boolean().optional(),
});

// ============================================
// MARCAS
// ============================================

export const createMarcaSchema = z.object({
  nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(100),
  descripcion: z.string().max(255).optional().nullable(),
});

export const updateMarcaSchema = z.object({
  nombre: z.string().min(2).max(100).optional(),
  descripcion: z.string().max(255).optional().nullable(),
  activo: z.boolean().optional(),
});

// ============================================
// CLIENTES
// ============================================

export const createClienteSchema = z.object({
  razonSocial: z.string().min(2, 'La razón social es requerida').max(200),
  cuit: cuitSchema,
  direccion: z.string().max(255).optional().nullable(),
  telefono: telefonoSchema,
  email: emailSchema.optional().nullable(),
  contacto: z.string().max(100).optional().nullable(),
  notas: z.string().max(1000).optional().nullable(),
});

export const updateClienteSchema = z.object({
  razonSocial: z.string().min(2).max(200).optional(),
  cuit: cuitSchema.optional(),
  direccion: z.string().max(255).optional().nullable(),
  telefono: telefonoSchema,
  email: emailSchema.optional().nullable(),
  contacto: z.string().max(100).optional().nullable(),
  notas: z.string().max(1000).optional().nullable(),
  activo: z.boolean().optional(),
});

// ============================================
// PROVEEDORES
// ============================================

export const createProveedorSchema = z.object({
  razonSocial: z.string().min(2, 'La razón social es requerida').max(200),
  nombreFantasia: z.string().max(200).optional().nullable(),
  cuit: cuitSchema.optional().nullable(),
  direccion: z.string().max(255).optional().nullable(),
  telefono: telefonoSchema,
  email: emailSchema.optional().nullable(),
  contacto: z.string().max(100).optional().nullable(),
  notas: z.string().max(1000).optional().nullable(),
});

export const updateProveedorSchema = z.object({
  razonSocial: z.string().min(2).max(200).optional(),
  nombreFantasia: z.string().max(200).optional().nullable(),
  cuit: cuitSchema.optional().nullable(),
  direccion: z.string().max(255).optional().nullable(),
  telefono: telefonoSchema,
  email: emailSchema.optional().nullable(),
  contacto: z.string().max(100).optional().nullable(),
  notas: z.string().max(1000).optional().nullable(),
  activo: z.boolean().optional(),
});

// ============================================
// ARTÍCULOS
// ============================================

// Helper para transformar strings vacíos a null para campos UUID opcionales
const optionalUuid = z.preprocess(
  (val) => (val === '' ? null : val),
  uuidSchema.nullable().optional()
);

export const createArticuloSchema = z.object({
  codigo: z.string().min(1, 'El código es requerido').max(50),
  nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(200),
  rubroId: uuidSchema,
  proveedorId: optionalUuid,
  stockMinimo: z.coerce.number().int().min(0, 'El stock mínimo no puede ser negativo').default(0),
  presentacion: z.string().max(100).optional().nullable(),
  marca: z.string().max(100).optional().nullable(),
  sku: z.string().max(100).optional().nullable(),
  etm: z.string().max(100).optional().nullable(),
  stockActual: z.coerce.number().int().min(0, 'El stock actual no puede ser negativo').default(0),
  ubicacion: z.string().max(200).optional().nullable(),
  costoInicialEstimado: z.coerce.number().min(0, 'El costo no puede ser negativo').optional().nullable(),
  valorDolarCostoInicial: z.coerce.number().positive('El valor del dólar debe ser mayor a 0').optional().nullable(),
});

export const updateArticuloSchema = z.object({
  codigo: z.string().min(1).max(50).optional(),
  nombre: z.string().min(2).max(200).optional(),
  rubroId: uuidSchema.optional(),
  proveedorId: optionalUuid,
  stockMinimo: z.coerce.number().int().min(0).optional(),
  presentacion: z.string().max(100).optional().nullable(),
  marca: z.string().max(100).optional().nullable(),
  sku: z.string().max(100).optional().nullable(),
  etm: z.string().max(100).optional().nullable(),
  stockActual: z.coerce.number().int().min(0).optional(),
  ubicacion: z.string().max(200).optional().nullable(),
  costoInicialEstimado: z.coerce.number().min(0).optional().nullable(),
  valorDolarCostoInicial: z.coerce.number().positive('El valor del dólar debe ser mayor a 0').optional().nullable(),
  activo: z.boolean().optional(),
});

export const articuloFiltrosSchema = z.object({
  busqueda: z.string().optional(),
  rubroId: uuidSchema.optional(),
  proveedorId: uuidSchema.optional(),
  stockBajo: booleanStringSchema.optional(),
  activo: booleanStringSchema.optional(),
});

// ============================================
// REPOSICIONES
// ============================================

// Helper para URLs opcionales (acepta string vacío y lo transforma a null)
const optionalUrl = z.preprocess(
  (val) => (val === '' || val === undefined ? null : val),
  z.string().url('URL invalida').nullable()
);

export const createReposicionSchema = z.object({
  articuloId: uuidSchema,
  proveedorId: uuidSchema,
  cantidad: z.coerce.number().int().positive('La cantidad debe ser mayor a 0'),
  costoReposicion: z.coerce.number().positive('El costo debe ser mayor a 0'),
  valorDolarOficial: z.coerce.number().positive('El valor del dolar debe ser mayor a 0'),
  observaciones: z.string().max(500).optional().nullable(),
  fechaReposicion: z.coerce.date().optional(),
  fechaVencimiento: z.preprocess(
    (val) => (val === '' || val === undefined ? null : val),
    z.coerce.date().nullable()
  ),
  lotePartida: z.string().max(100).optional().nullable(),
  linkCompra: optionalUrl,
  lugarCompra: z.string().max(200).optional().nullable(),
});

export const updateReposicionSchema = z.object({
  proveedorId: uuidSchema.optional(),
  costoReposicion: z.coerce.number().positive('El costo debe ser mayor a 0').optional(),
  valorDolarOficial: z.coerce.number().positive('El valor del dolar debe ser mayor a 0').optional(),
  observaciones: z.string().max(500).optional().nullable(),
  fechaVencimiento: z.preprocess(
    (val) => (val === '' || val === undefined ? null : val),
    z.coerce.date().nullable()
  ),
  lotePartida: z.string().max(100).optional().nullable(),
  linkCompra: optionalUrl,
  lugarCompra: z.string().max(200).optional().nullable(),
});

// ============================================
// ENTREGAS
// ============================================

export const createEntregaItemSchema = z.object({
  articuloId: uuidSchema,
  cantidad: z.coerce.number().int().positive('La cantidad debe ser mayor a 0'),
});

export const createEntregaSchema = z.object({
  clienteId: uuidSchema,
  numeroCotizacionInterna: z
    .string()
    .min(2, 'El número de cotización es requerido')
    .max(50, 'Máximo 50 caracteres')
    .refine((val) => val.startsWith('#'), {
      message: 'El número de cotización debe comenzar con #',
    }),
  purchaseOrder: z.string().max(50).optional().nullable(),
  items: z.array(createEntregaItemSchema).min(1, 'Debe agregar al menos un artículo'),
  observaciones: z.string().max(500).optional().nullable(),
  fechaEntrega: z.coerce.date().optional(),
});

export const updateEntregaSchema = z.object({
  clienteId: uuidSchema.optional(),
  numeroCotizacionInterna: z
    .string()
    .min(2, 'El número de cotización es requerido')
    .max(50, 'Máximo 50 caracteres')
    .refine((val) => val.startsWith('#'), {
      message: 'El número de cotización debe comenzar con #',
    })
    .optional(),
  purchaseOrder: z.string().max(50).optional().nullable(),
  items: z.array(createEntregaItemSchema).min(1, 'Debe agregar al menos un artículo').optional(),
  observaciones: z.string().max(500).optional().nullable(),
  fechaEntrega: z.coerce.date().optional(),
});

// ============================================
// AUDITORÍA
// ============================================

export const auditLogFiltrosSchema = z.object({
  usuarioId: uuidSchema.optional(),
  accion: z.enum(['crear', 'actualizar', 'eliminar', 'login', 'logout', 'reposicion', 'entrega']).optional(),
  entidad: z.string().optional(),
  entidades: z.union([z.string(), z.array(z.string())]).transform(val =>
    Array.isArray(val) ? val : val ? [val] : undefined
  ).optional(),
  fechaDesde: z.coerce.date().optional(),
  fechaHasta: z.coerce.date().optional(),
});

// ============================================
// TIPOS INFERIDOS
// ============================================

export type LoginInput = z.infer<typeof loginSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type CreateUsuarioInput = z.infer<typeof createUsuarioSchema>;
export type UpdateUsuarioInput = z.infer<typeof updateUsuarioSchema>;
export type CreateRolInput = z.infer<typeof createRolSchema>;
export type UpdateRolInput = z.infer<typeof updateRolSchema>;
export type CreateRubroInput = z.infer<typeof createRubroSchema>;
export type UpdateRubroInput = z.infer<typeof updateRubroSchema>;
export type CreateClienteInput = z.infer<typeof createClienteSchema>;
export type UpdateClienteInput = z.infer<typeof updateClienteSchema>;
export type CreateProveedorInput = z.infer<typeof createProveedorSchema>;
export type UpdateProveedorInput = z.infer<typeof updateProveedorSchema>;
export type CreateArticuloInput = z.infer<typeof createArticuloSchema>;
export type UpdateArticuloInput = z.infer<typeof updateArticuloSchema>;
export type ArticuloFiltrosInput = z.infer<typeof articuloFiltrosSchema>;
export type CreateReposicionInput = z.infer<typeof createReposicionSchema>;
export type UpdateReposicionInput = z.infer<typeof updateReposicionSchema>;
export type CreateEntregaInput = z.infer<typeof createEntregaSchema>;
export type CreateMarcaInput = z.infer<typeof createMarcaSchema>;
export type UpdateMarcaInput = z.infer<typeof updateMarcaSchema>;
export type AuditLogFiltrosInput = z.infer<typeof auditLogFiltrosSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;

// ============================================
// SUGERENCIAS
// ============================================

export const createSugerenciaSchema = z.object({
  titulo: z.string().min(3, 'El título debe tener al menos 3 caracteres').max(200),
  descripcion: z.string().min(10, 'La descripción debe tener al menos 10 caracteres').max(2000),
  prioridad: z.enum(['alta', 'media', 'baja']).default('media'),
});

export const updateSugerenciaSchema = z.object({
  titulo: z.string().min(3).max(200).optional(),
  descripcion: z.string().min(10).max(2000).optional(),
  prioridad: z.enum(['alta', 'media', 'baja']).optional(),
  estado: z.enum(['nueva', 'en_progreso', 'resuelta', 'cancelada']).optional(),
});

export type CreateSugerenciaInput = z.infer<typeof createSugerenciaSchema>;
export type UpdateSugerenciaInput = z.infer<typeof updateSugerenciaSchema>;

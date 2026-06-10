-- ============================================
-- SEED: Datos iniciales del sistema
-- ============================================

-- ============================================
-- 1. PERMISOS
-- ============================================
INSERT INTO permisos (modulo, accion, descripcion) VALUES
-- Usuarios
('usuarios', 'crear', 'Crear usuarios'),
('usuarios', 'leer', 'Ver usuarios'),
('usuarios', 'actualizar', 'Editar usuarios'),
('usuarios', 'eliminar', 'Eliminar usuarios'),
-- Roles
('roles', 'crear', 'Crear roles'),
('roles', 'leer', 'Ver roles'),
('roles', 'actualizar', 'Editar roles'),
('roles', 'eliminar', 'Eliminar roles'),
-- Rubros
('rubros', 'crear', 'Crear rubros'),
('rubros', 'leer', 'Ver rubros'),
('rubros', 'actualizar', 'Editar rubros'),
('rubros', 'eliminar', 'Eliminar rubros'),
-- Clientes
('clientes', 'crear', 'Crear clientes'),
('clientes', 'leer', 'Ver clientes'),
('clientes', 'actualizar', 'Editar clientes'),
('clientes', 'eliminar', 'Eliminar clientes'),
-- Proveedores
('proveedores', 'crear', 'Crear proveedores'),
('proveedores', 'leer', 'Ver proveedores'),
('proveedores', 'actualizar', 'Editar proveedores'),
('proveedores', 'eliminar', 'Eliminar proveedores'),
-- Artículos
('articulos', 'crear', 'Crear artículos'),
('articulos', 'leer', 'Ver artículos'),
('articulos', 'actualizar', 'Editar artículos'),
('articulos', 'eliminar', 'Eliminar artículos'),
-- Reposiciones
('reposiciones', 'crear', 'Crear reposiciones'),
('reposiciones', 'leer', 'Ver reposiciones'),
('reposiciones', 'actualizar', 'Editar reposiciones'),
('reposiciones', 'eliminar', 'Eliminar reposiciones'),
-- Entregas
('entregas', 'crear', 'Crear entregas'),
('entregas', 'leer', 'Ver entregas'),
('entregas', 'actualizar', 'Editar entregas'),
('entregas', 'eliminar', 'Eliminar entregas'),
-- Auditoría
('auditoria', 'leer', 'Ver registros de auditoría'),
-- Dashboard
('dashboard', 'leer', 'Ver dashboard');

-- ============================================
-- 2. ROLES
-- ============================================
INSERT INTO roles (nombre, descripcion) VALUES
('Administrador', 'Acceso completo al sistema'),
('Compras', 'Gestión de proveedores y reposiciones'),
('Depósito', 'Gestión de entregas y stock'),
('Consulta', 'Solo lectura');

-- ============================================
-- 3. ASIGNAR PERMISOS A ROLES
-- ============================================

-- Administrador: todos los permisos
INSERT INTO roles_permisos (rol_id, permiso_id)
SELECT r.id, p.id
FROM roles r, permisos p
WHERE r.nombre = 'Administrador';

-- Compras: proveedores (CRUD), reposiciones (crear, leer), artículos (leer), rubros (leer), dashboard (leer)
INSERT INTO roles_permisos (rol_id, permiso_id)
SELECT r.id, p.id
FROM roles r, permisos p
WHERE r.nombre = 'Compras'
AND (
    (p.modulo = 'proveedores')
    OR (p.modulo = 'reposiciones' AND p.accion IN ('crear', 'leer'))
    OR (p.modulo = 'articulos' AND p.accion = 'leer')
    OR (p.modulo = 'rubros' AND p.accion = 'leer')
    OR (p.modulo = 'dashboard' AND p.accion = 'leer')
);

-- Depósito: clientes (CRUD), entregas (crear, leer), artículos (leer, actualizar), rubros (leer), dashboard (leer)
INSERT INTO roles_permisos (rol_id, permiso_id)
SELECT r.id, p.id
FROM roles r, permisos p
WHERE r.nombre = 'Depósito'
AND (
    (p.modulo = 'clientes')
    OR (p.modulo = 'entregas' AND p.accion IN ('crear', 'leer'))
    OR (p.modulo = 'articulos' AND p.accion IN ('leer', 'actualizar'))
    OR (p.modulo = 'rubros' AND p.accion = 'leer')
    OR (p.modulo = 'dashboard' AND p.accion = 'leer')
);

-- Consulta: solo lectura en todo menos usuarios y roles
INSERT INTO roles_permisos (rol_id, permiso_id)
SELECT r.id, p.id
FROM roles r, permisos p
WHERE r.nombre = 'Consulta'
AND p.accion = 'leer'
AND p.modulo NOT IN ('usuarios', 'roles', 'auditoria');

-- ============================================
-- 4. USUARIO ADMIN POR DEFECTO
-- Password: Admin123! (bcrypt hash)
-- ============================================
INSERT INTO usuarios (email, password_hash, nombre, apellido, activo) VALUES
('admin@hofra.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4v.mQJqhN8/X4v.m', 'Administrador', 'Sistema', true);

-- Asignar rol de Administrador al usuario admin
INSERT INTO usuarios_roles (usuario_id, rol_id)
SELECT u.id, r.id
FROM usuarios u, roles r
WHERE u.email = 'admin@hofra.com' AND r.nombre = 'Administrador';

-- ============================================
-- 5. RUBROS INICIALES
-- ============================================
INSERT INTO rubros (nombre, descripcion, activo) VALUES
('Ferretería', 'Herramientas y elementos de ferretería', true),
('Electricidad', 'Materiales eléctricos', true),
('Plomería', 'Materiales de plomería', true),
('Pinturería', 'Pinturas y accesorios', true),
('Seguridad', 'Elementos de protección personal', true),
('Limpieza', 'Artículos de limpieza', true),
('Oficina', 'Insumos de oficina', true),
('Varios', 'Artículos varios', true);

-- ============================================
-- 6. DATOS DE EJEMPLO (OPCIONAL)
-- ============================================

-- Proveedores de ejemplo
INSERT INTO proveedores (razon_social, cuit, direccion, telefono, email, contacto, activo) VALUES
('Ferretería Central S.A.', '30712345678', 'Av. Corrientes 1234, CABA', '011-4555-1234', 'ventas@ferreteriacentral.com', 'Juan Pérez', true),
('Electricidad Total S.R.L.', '30723456789', 'Av. San Martín 567, CABA', '011-4666-5678', 'info@electricidadtotal.com', 'María García', true),
('Pinturas del Sur', '20345678901', 'Calle 50 N° 890, La Plata', '0221-422-8900', 'contacto@pinturassur.com', 'Carlos López', true);

-- Clientes de ejemplo
INSERT INTO clientes (razon_social, cuit, direccion, telefono, email, contacto, activo) VALUES
('Constructora Norte S.A.', '30756789012', 'Av. Libertador 4500, CABA', '011-4777-1234', 'compras@constructoranorte.com', 'Roberto Martínez', true),
('Mantenimiento Industrial S.R.L.', '30767890123', 'Parque Industrial, Pilar', '0230-442-5678', 'pedidos@mantindustrial.com', 'Laura Sánchez', true),
('Edificios Modernos S.A.', '30778901234', 'Av. del Libertador 6789, Vicente López', '011-4888-9012', 'proveedores@edificiosmodernos.com', 'Diego Fernández', true);

-- Artículos de ejemplo
INSERT INTO articulos (codigo, nombre, descripcion, rubro_id, proveedor_id, stock, stock_minimo, unidad, activo)
SELECT
    'FER-001',
    'Martillo carpintero 500g',
    'Martillo de carpintero con mango de madera, cabeza de acero',
    r.id,
    p.id,
    25,
    10,
    'Unidad',
    true
FROM rubros r, proveedores p
WHERE r.nombre = 'Ferretería' AND p.razon_social = 'Ferretería Central S.A.';

INSERT INTO articulos (codigo, nombre, descripcion, rubro_id, proveedor_id, stock, stock_minimo, unidad, activo)
SELECT
    'FER-002',
    'Destornillador Phillips #2',
    'Destornillador punta Phillips tamaño 2, mango ergonómico',
    r.id,
    p.id,
    50,
    20,
    'Unidad',
    true
FROM rubros r, proveedores p
WHERE r.nombre = 'Ferretería' AND p.razon_social = 'Ferretería Central S.A.';

INSERT INTO articulos (codigo, nombre, descripcion, rubro_id, proveedor_id, stock, stock_minimo, unidad, activo)
SELECT
    'ELE-001',
    'Cable unipolar 2.5mm azul',
    'Cable unipolar de cobre 2.5mm, color azul, por metro',
    r.id,
    p.id,
    500,
    100,
    'Mt',
    true
FROM rubros r, proveedores p
WHERE r.nombre = 'Electricidad' AND p.razon_social = 'Electricidad Total S.R.L.';

INSERT INTO articulos (codigo, nombre, descripcion, rubro_id, proveedor_id, stock, stock_minimo, unidad, activo)
SELECT
    'PIN-001',
    'Pintura látex interior blanco 20L',
    'Pintura látex para interiores, color blanco, balde 20 litros',
    r.id,
    p.id,
    15,
    5,
    'Unidad',
    true
FROM rubros r, proveedores p
WHERE r.nombre = 'Pinturería' AND p.razon_social = 'Pinturas del Sur';

INSERT INTO articulos (codigo, nombre, descripcion, rubro_id, stock, stock_minimo, unidad, activo)
SELECT
    'SEG-001',
    'Casco de seguridad blanco',
    'Casco de seguridad industrial color blanco, norma IRAM',
    r.id,
    30,
    15,
    'Unidad',
    true
FROM rubros r
WHERE r.nombre = 'Seguridad';

INSERT INTO articulos (codigo, nombre, descripcion, rubro_id, stock, stock_minimo, unidad, activo)
SELECT
    'LIM-001',
    'Detergente industrial 5L',
    'Detergente concentrado para limpieza industrial, bidón 5 litros',
    r.id,
    20,
    10,
    'Bidón',
    true
FROM rubros r
WHERE r.nombre = 'Limpieza';

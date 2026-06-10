-- ============================================
-- SCHEMA: Sistema de Gestión de Stock Grupo Hofra
-- Base de datos: PostgreSQL (Neon)
-- ============================================

-- Extensión para UUID
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- 1. TABLA: usuarios
-- ============================================
CREATE TABLE usuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT true,
    ultimo_acceso TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    created_by UUID REFERENCES usuarios(id),
    updated_by UUID REFERENCES usuarios(id)
);

CREATE INDEX idx_usuarios_email ON usuarios(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_usuarios_activo ON usuarios(activo) WHERE deleted_at IS NULL;

-- ============================================
-- 2. TABLA: roles
-- ============================================
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(50) NOT NULL UNIQUE,
    descripcion VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    created_by UUID REFERENCES usuarios(id),
    updated_by UUID REFERENCES usuarios(id)
);

CREATE INDEX idx_roles_nombre ON roles(nombre) WHERE deleted_at IS NULL;

-- ============================================
-- 3. TABLA: permisos
-- ============================================
CREATE TABLE permisos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    modulo VARCHAR(50) NOT NULL,
    accion VARCHAR(20) NOT NULL,
    descripcion VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    created_by UUID REFERENCES usuarios(id),
    updated_by UUID REFERENCES usuarios(id),
    UNIQUE(modulo, accion)
);

CREATE INDEX idx_permisos_modulo ON permisos(modulo) WHERE deleted_at IS NULL;

-- ============================================
-- 4. TABLA: roles_permisos (many-to-many)
-- ============================================
CREATE TABLE roles_permisos (
    rol_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permiso_id UUID NOT NULL REFERENCES permisos(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (rol_id, permiso_id)
);

-- ============================================
-- 5. TABLA: usuarios_roles (many-to-many)
-- ============================================
CREATE TABLE usuarios_roles (
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    rol_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (usuario_id, rol_id)
);

-- ============================================
-- 6. TABLA: rubros
-- ============================================
CREATE TABLE rubros (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(100) NOT NULL UNIQUE,
    descripcion VARCHAR(255),
    prefijo VARCHAR(10) NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    created_by UUID REFERENCES usuarios(id),
    updated_by UUID REFERENCES usuarios(id)
);

CREATE INDEX idx_rubros_nombre ON rubros(nombre) WHERE deleted_at IS NULL;
CREATE INDEX idx_rubros_activo ON rubros(activo) WHERE deleted_at IS NULL;
CREATE INDEX idx_rubros_prefijo ON rubros(prefijo) WHERE deleted_at IS NULL;

-- ============================================
-- 7. TABLA: clientes
-- ============================================
CREATE TABLE clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    razon_social VARCHAR(200) NOT NULL,
    cuit VARCHAR(11) NOT NULL UNIQUE,
    direccion VARCHAR(255),
    telefono VARCHAR(50),
    email VARCHAR(255),
    contacto VARCHAR(100),
    notas TEXT,
    activo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    created_by UUID REFERENCES usuarios(id),
    updated_by UUID REFERENCES usuarios(id)
);

CREATE INDEX idx_clientes_cuit ON clientes(cuit) WHERE deleted_at IS NULL;
CREATE INDEX idx_clientes_razon_social ON clientes(razon_social) WHERE deleted_at IS NULL;
CREATE INDEX idx_clientes_activo ON clientes(activo) WHERE deleted_at IS NULL;

-- ============================================
-- 8. TABLA: proveedores
-- ============================================
CREATE TABLE proveedores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    razon_social VARCHAR(200) NOT NULL,
    nombre_fantasia VARCHAR(200),
    cuit VARCHAR(11),
    direccion VARCHAR(255),
    telefono VARCHAR(50),
    email VARCHAR(255),
    contacto VARCHAR(100),
    notas TEXT,
    activo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    created_by UUID REFERENCES usuarios(id),
    updated_by UUID REFERENCES usuarios(id)
);

CREATE INDEX idx_proveedores_cuit ON proveedores(cuit) WHERE deleted_at IS NULL;
CREATE INDEX idx_proveedores_razon_social ON proveedores(razon_social) WHERE deleted_at IS NULL;
CREATE INDEX idx_proveedores_activo ON proveedores(activo) WHERE deleted_at IS NULL;

-- ============================================
-- 9. TABLA: articulos
-- ============================================
CREATE TABLE articulos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo VARCHAR(50) NOT NULL UNIQUE,
    nombre VARCHAR(200) NOT NULL,
    descripcion VARCHAR(500),
    rubro_id UUID NOT NULL REFERENCES rubros(id),
    proveedor_id UUID REFERENCES proveedores(id),
    stock INTEGER NOT NULL DEFAULT 0,
    stock_minimo INTEGER NOT NULL DEFAULT 0,
    unidad VARCHAR(20) NOT NULL DEFAULT 'Unidad',
    presentacion VARCHAR(100),
    marca VARCHAR(100),
    sku VARCHAR(100),
    etm VARCHAR(100),
    stock_actual INTEGER NOT NULL DEFAULT 0,
    numero_cotizacion_interna INTEGER,
    ubicacion VARCHAR(200),
    imagen_url VARCHAR(500),
    imagen_public_id VARCHAR(255),
    costo_inicial_estimado NUMERIC(12,2),
    activo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    created_by UUID REFERENCES usuarios(id),
    updated_by UUID REFERENCES usuarios(id),
    CONSTRAINT chk_stock_positive CHECK (stock >= 0),
    CONSTRAINT chk_stock_minimo_positive CHECK (stock_minimo >= 0)
);

CREATE INDEX idx_articulos_codigo ON articulos(codigo) WHERE deleted_at IS NULL;
CREATE INDEX idx_articulos_nombre ON articulos(nombre) WHERE deleted_at IS NULL;
CREATE INDEX idx_articulos_rubro ON articulos(rubro_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_articulos_proveedor ON articulos(proveedor_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_articulos_stock_bajo ON articulos(stock, stock_minimo) WHERE deleted_at IS NULL AND activo = true;
CREATE INDEX idx_articulos_activo ON articulos(activo) WHERE deleted_at IS NULL;

-- Índice de texto completo para búsqueda
CREATE INDEX idx_articulos_busqueda ON articulos USING gin(to_tsvector('spanish', nombre || ' ' || COALESCE(descripcion, '') || ' ' || codigo));

-- ============================================
-- 10. TABLA: reposiciones
-- ============================================
CREATE TABLE reposiciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    articulo_id UUID NOT NULL REFERENCES articulos(id),
    proveedor_id UUID NOT NULL REFERENCES proveedores(id),
    cantidad INTEGER NOT NULL,
    observaciones VARCHAR(500),
    fecha_reposicion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    created_by UUID REFERENCES usuarios(id),
    updated_by UUID REFERENCES usuarios(id),
    CONSTRAINT chk_cantidad_reposicion_positive CHECK (cantidad > 0)
);

CREATE INDEX idx_reposiciones_articulo ON reposiciones(articulo_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_reposiciones_proveedor ON reposiciones(proveedor_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_reposiciones_fecha ON reposiciones(fecha_reposicion) WHERE deleted_at IS NULL;

-- ============================================
-- 11. TABLA: entregas
-- ============================================
CREATE TABLE entregas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    articulo_id UUID NOT NULL REFERENCES articulos(id),
    cliente_id UUID NOT NULL REFERENCES clientes(id),
    cantidad INTEGER NOT NULL,
    observaciones VARCHAR(500),
    fecha_entrega TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    created_by UUID REFERENCES usuarios(id),
    updated_by UUID REFERENCES usuarios(id),
    CONSTRAINT chk_cantidad_entrega_positive CHECK (cantidad > 0)
);

CREATE INDEX idx_entregas_articulo ON entregas(articulo_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_entregas_cliente ON entregas(cliente_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_entregas_fecha ON entregas(fecha_entrega) WHERE deleted_at IS NULL;

-- ============================================
-- 12. TABLA: audit_log
-- ============================================
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID REFERENCES usuarios(id),
    accion VARCHAR(20) NOT NULL,
    entidad VARCHAR(50) NOT NULL,
    entidad_id UUID,
    datos_anteriores JSONB,
    datos_nuevos JSONB,
    ip VARCHAR(45),
    user_agent VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    created_by UUID REFERENCES usuarios(id),
    updated_by UUID REFERENCES usuarios(id)
);

CREATE INDEX idx_audit_log_usuario ON audit_log(usuario_id);
CREATE INDEX idx_audit_log_accion ON audit_log(accion);
CREATE INDEX idx_audit_log_entidad ON audit_log(entidad);
CREATE INDEX idx_audit_log_fecha ON audit_log(created_at);
CREATE INDEX idx_audit_log_entidad_id ON audit_log(entidad_id);

-- ============================================
-- 13. TABLA: refresh_tokens
-- ============================================
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_refresh_tokens_usuario ON refresh_tokens(usuario_id);
CREATE INDEX idx_refresh_tokens_token ON refresh_tokens(token_hash);
CREATE INDEX idx_refresh_tokens_expires ON refresh_tokens(expires_at) WHERE revoked = false;

-- ============================================
-- FUNCIONES Y TRIGGERS
-- ============================================

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para updated_at
CREATE TRIGGER update_usuarios_updated_at BEFORE UPDATE ON usuarios FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON roles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_permisos_updated_at BEFORE UPDATE ON permisos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_rubros_updated_at BEFORE UPDATE ON rubros FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_clientes_updated_at BEFORE UPDATE ON clientes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_proveedores_updated_at BEFORE UPDATE ON proveedores FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_articulos_updated_at BEFORE UPDATE ON articulos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_reposiciones_updated_at BEFORE UPDATE ON reposiciones FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_entregas_updated_at BEFORE UPDATE ON entregas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_audit_log_updated_at BEFORE UPDATE ON audit_log FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

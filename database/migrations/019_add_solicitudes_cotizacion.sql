-- Migration: 019_add_solicitudes_cotizacion
-- Description: Módulo de Solicitudes de Cotización (matching automático contra catálogo + cotización a cliente)
-- Date: 2026

-- Cabecera de la solicitud
CREATE TABLE solicitudes_cotizacion (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id UUID NOT NULL REFERENCES clientes(id),
    numero_referencia_cliente VARCHAR(100),
    nombre_archivo VARCHAR(255),
    fecha_solicitud TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    estado VARCHAR(20) NOT NULL DEFAULT 'en_revision',
    observaciones TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    created_by UUID REFERENCES usuarios(id),
    updated_by UUID REFERENCES usuarios(id),
    CONSTRAINT chk_solicitud_cotizacion_estado CHECK (estado IN ('en_revision', 'cotizada', 'cancelada'))
);

-- Items de la solicitud: lo pedido por el cliente vs el artículo sugerido/aceptado
CREATE TABLE solicitud_cotizacion_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    solicitud_id UUID NOT NULL REFERENCES solicitudes_cotizacion(id) ON DELETE CASCADE,
    orden INTEGER NOT NULL,
    etm_solicitado VARCHAR(100),
    descripcion_solicitada TEXT NOT NULL,
    marca_solicitada VARCHAR(100),
    cantidad_solicitada INTEGER NOT NULL,
    articulo_id UUID REFERENCES articulos(id),
    match_confianza VARCHAR(20),
    estado_item VARCHAR(20) NOT NULL DEFAULT 'pendiente',
    precio_unitario NUMERIC(12, 2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_solicitud_item_cantidad CHECK (cantidad_solicitada > 0),
    CONSTRAINT chk_solicitud_item_match_confianza CHECK (match_confianza IN ('etm', 'nombre', 'sin_match')),
    CONSTRAINT chk_solicitud_item_estado CHECK (estado_item IN ('pendiente', 'aceptado', 'a_comprar'))
);

CREATE INDEX idx_solicitudes_cotizacion_cliente_id ON solicitudes_cotizacion(cliente_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_solicitudes_cotizacion_estado ON solicitudes_cotizacion(estado) WHERE deleted_at IS NULL;
CREATE INDEX idx_solicitudes_cotizacion_fecha ON solicitudes_cotizacion(fecha_solicitud) WHERE deleted_at IS NULL;
CREATE INDEX idx_solicitud_items_solicitud_id ON solicitud_cotizacion_items(solicitud_id);
CREATE INDEX idx_solicitud_items_articulo_id ON solicitud_cotizacion_items(articulo_id);

-- Trigger para updated_at
CREATE TRIGGER update_solicitudes_cotizacion_updated_at BEFORE UPDATE ON solicitudes_cotizacion
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_solicitud_cotizacion_items_updated_at BEFORE UPDATE ON solicitud_cotizacion_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Permisos del módulo
INSERT INTO permisos (modulo, accion, descripcion) VALUES
    ('solicitudes_cotizacion', 'leer', 'Ver solicitudes de cotización'),
    ('solicitudes_cotizacion', 'crear', 'Crear solicitudes de cotización'),
    ('solicitudes_cotizacion', 'actualizar', 'Actualizar solicitudes de cotización'),
    ('solicitudes_cotizacion', 'eliminar', 'Eliminar solicitudes de cotización')
ON CONFLICT (modulo, accion) DO NOTHING;

-- Asignación de permisos al rol Administrador
INSERT INTO roles_permisos (rol_id, permiso_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permisos p
WHERE r.nombre = 'Administrador'
AND p.modulo = 'solicitudes_cotizacion'
AND NOT EXISTS (
    SELECT 1 FROM roles_permisos rp WHERE rp.rol_id = r.id AND rp.permiso_id = p.id
);

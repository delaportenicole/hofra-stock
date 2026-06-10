-- Migration: 014_add_sugerencias
-- Description: Creates table for system improvement suggestions
-- Date: 2024

-- Create sugerencias table
CREATE TABLE sugerencias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titulo VARCHAR(200) NOT NULL,
    descripcion TEXT NOT NULL,
    prioridad VARCHAR(20) NOT NULL DEFAULT 'media',
    estado VARCHAR(20) NOT NULL DEFAULT 'nueva',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    created_by UUID REFERENCES usuarios(id),
    updated_by UUID REFERENCES usuarios(id),
    CONSTRAINT chk_prioridad CHECK (prioridad IN ('alta', 'media', 'baja')),
    CONSTRAINT chk_estado CHECK (estado IN ('nueva', 'en_progreso', 'resuelta', 'cancelada'))
);

CREATE INDEX idx_sugerencias_prioridad ON sugerencias(prioridad) WHERE deleted_at IS NULL;
CREATE INDEX idx_sugerencias_estado ON sugerencias(estado) WHERE deleted_at IS NULL;
CREATE INDEX idx_sugerencias_created_at ON sugerencias(created_at) WHERE deleted_at IS NULL;

-- Add trigger for updated_at
CREATE TRIGGER update_sugerencias_updated_at BEFORE UPDATE ON sugerencias FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add permission for sugerencias module
INSERT INTO permisos (modulo, accion, descripcion) VALUES
    ('sugerencias', 'leer', 'Ver sugerencias'),
    ('sugerencias', 'crear', 'Crear sugerencias'),
    ('sugerencias', 'actualizar', 'Actualizar sugerencias'),
    ('sugerencias', 'eliminar', 'Eliminar sugerencias')
ON CONFLICT (modulo, accion) DO NOTHING;

-- Assign permissions to Administrador role
INSERT INTO roles_permisos (rol_id, permiso_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permisos p
WHERE r.nombre = 'Administrador'
AND p.modulo = 'sugerencias'
AND NOT EXISTS (
    SELECT 1 FROM roles_permisos rp WHERE rp.rol_id = r.id AND rp.permiso_id = p.id
);

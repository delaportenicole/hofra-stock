-- Tabla de marcas para artículos
CREATE TABLE IF NOT EXISTS marcas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(100) NOT NULL UNIQUE,
    descripcion TEXT,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES usuarios(id),
    updated_by UUID REFERENCES usuarios(id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_marcas_nombre ON marcas(nombre);
CREATE INDEX IF NOT EXISTS idx_marcas_activo ON marcas(activo) WHERE deleted_at IS NULL;

-- Migrar marcas existentes desde artículos
INSERT INTO marcas (nombre)
SELECT DISTINCT marca
FROM articulos
WHERE marca IS NOT NULL
  AND marca != ''
  AND deleted_at IS NULL
ON CONFLICT (nombre) DO NOTHING;

-- Agregar columna marca_id a artículos (opcional, para futuro)
-- Por ahora mantenemos el campo marca como texto para compatibilidad

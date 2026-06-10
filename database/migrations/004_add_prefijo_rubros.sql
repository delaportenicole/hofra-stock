-- Migración: Agregar campo prefijo a rubros
-- Descripción: El prefijo se usa para generar automáticamente el código de los artículos

-- Agregar columna prefijo (temporalmente nullable para migrar datos existentes)
ALTER TABLE rubros ADD COLUMN prefijo VARCHAR(10);

-- Generar prefijos para rubros existentes basándose en las primeras 3 letras del nombre
UPDATE rubros
SET prefijo = UPPER(
    TRANSLATE(
        SUBSTRING(nombre FROM 1 FOR 3),
        'áéíóúÁÉÍÓÚñÑ',
        'aeiouAEIOUnN'
    )
);

-- Hacer la columna NOT NULL después de migrar los datos
ALTER TABLE rubros ALTER COLUMN prefijo SET NOT NULL;

-- Crear índice para búsquedas por prefijo
CREATE INDEX idx_rubros_prefijo ON rubros(prefijo) WHERE deleted_at IS NULL;

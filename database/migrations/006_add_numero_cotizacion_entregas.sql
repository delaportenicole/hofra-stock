-- Migración: Agregar número de cotización interna a entregas
-- Fecha: 2026-06-07

-- Agregar columna numero_cotizacion_interna a entregas
ALTER TABLE entregas ADD COLUMN numero_cotizacion_interna VARCHAR(50);

-- Para entregas existentes, asignar un valor por defecto
UPDATE entregas SET numero_cotizacion_interna = '#' || id::text WHERE numero_cotizacion_interna IS NULL;

-- Hacer la columna NOT NULL después de asignar valores
ALTER TABLE entregas ALTER COLUMN numero_cotizacion_interna SET NOT NULL;

-- Crear índice para búsquedas por número de cotización
CREATE INDEX idx_entregas_numero_cotizacion ON entregas(numero_cotizacion_interna);

-- Agregar constraint para asegurar que comience con #
ALTER TABLE entregas ADD CONSTRAINT chk_cotizacion_formato CHECK (numero_cotizacion_interna LIKE '#%');

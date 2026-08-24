-- Migration: 021_rename_a_comprar_a_no_disponible
-- Description: Renombra el estado de ítem 'a_comprar' a 'no_disponible' en
--              solicitud_cotizacion_items (mismo significado: no hay artículo
--              del catálogo asociado, se resuelve por fuera).
-- Date: 2026

UPDATE solicitud_cotizacion_items SET estado_item = 'no_disponible' WHERE estado_item = 'a_comprar';

ALTER TABLE solicitud_cotizacion_items DROP CONSTRAINT IF EXISTS chk_solicitud_item_estado;

ALTER TABLE solicitud_cotizacion_items ADD CONSTRAINT chk_solicitud_item_estado
  CHECK (estado_item IN ('pendiente', 'aceptado', 'no_disponible'));

-- Migration: 036_add_overrides_y_precio_usd_solicitud_items
-- Description: Agrega overrides editables de Unidad/Marca/Modelo (mismo patrón que
--              cantidad vs. cantidad_solicitada: el dato original queda inmutable, el
--              override pisa la vista si está cargado) y un precio unitario sin IVA en
--              USD, cargado directo a mano (ya no se deriva de precio_unitario + mark_up).
-- Date: 2026

ALTER TABLE solicitud_cotizacion_items ADD COLUMN IF NOT EXISTS unidad VARCHAR(50);
ALTER TABLE solicitud_cotizacion_items ADD COLUMN IF NOT EXISTS marca VARCHAR(100);
ALTER TABLE solicitud_cotizacion_items ADD COLUMN IF NOT EXISTS modelo VARCHAR(150);
ALTER TABLE solicitud_cotizacion_items ADD COLUMN IF NOT EXISTS precio_unitario_usd NUMERIC(12, 2);

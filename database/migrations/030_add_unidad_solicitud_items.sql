-- Migration: 030_add_unidad_solicitud_items
-- Description: Captura la unidad de medida (unidades, cajas, metros, litros, etc.)
--              detectada al normalizar el pedido del cliente.
-- Date: 2026

ALTER TABLE solicitud_cotizacion_items ADD COLUMN IF NOT EXISTS unidad_solicitada VARCHAR(50);

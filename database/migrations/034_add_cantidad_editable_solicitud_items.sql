-- Migration: 034_add_cantidad_editable_solicitud_items
-- Description: Permite editar la cantidad a cotizar de un ítem en la grilla de revisión,
--              distinta de cantidad_solicitada (lo que pidió el cliente, inmutable). Si es
--              NULL, se usa cantidad_solicitada como valor por defecto.
-- Date: 2026

ALTER TABLE solicitud_cotizacion_items ADD COLUMN IF NOT EXISTS cantidad INTEGER;

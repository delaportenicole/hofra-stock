-- Migration: 022_add_modelo_descripcion_ingles_solicitud_items
-- Description: Captura las columnas MODELO y DESCRIPCION EN INGLES del archivo
--              de solicitud del cliente, para poder volcarlas en la cotización final.
-- Date: 2026

ALTER TABLE solicitud_cotizacion_items ADD COLUMN IF NOT EXISTS modelo_solicitado VARCHAR(150);
ALTER TABLE solicitud_cotizacion_items ADD COLUMN IF NOT EXISTS descripcion_ingles_solicitada TEXT;

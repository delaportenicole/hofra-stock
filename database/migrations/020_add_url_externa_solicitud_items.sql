-- Migration: 020_add_url_externa_solicitud_items
-- Description: Permite pegar la URL de un producto externo (ej. Mercado Libre) en un ítem
--              de una Solicitud de Cotización, para aceptarlo/declinarlo como opción de compra.
-- Date: 2026

ALTER TABLE solicitud_cotizacion_items ADD COLUMN IF NOT EXISTS url_externa TEXT;

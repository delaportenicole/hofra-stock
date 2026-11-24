-- Migration: 032_cotizacion_manual_cliente_opcional
-- Description:
--   1) Número de Cotización pasa a ser de ingreso manual (ya no autoincremental).
--   2) Nuevo campo Nombre de Cotización, también de ingreso manual.
--   3) Cliente deja de ser obligatorio en la solicitud (por ahora).
-- Date: 2026

ALTER TABLE solicitudes_cotizacion ALTER COLUMN numero_cotizacion DROP DEFAULT;
DROP SEQUENCE IF EXISTS solicitudes_cotizacion_numero_seq;

ALTER TABLE solicitudes_cotizacion ADD COLUMN IF NOT EXISTS nombre_cotizacion VARCHAR(255);

ALTER TABLE solicitudes_cotizacion ALTER COLUMN cliente_id DROP NOT NULL;

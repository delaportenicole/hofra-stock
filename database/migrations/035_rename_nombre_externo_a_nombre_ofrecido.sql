-- Migration: 035_rename_nombre_externo_a_nombre_ofrecido
-- Description: nombre_externo (migración 033) se amplía de "solo compra externa" a un
--              override editable del nombre ofrecido, disponible siempre (ítem aceptado con
--              artículo propio, compra externa, o sin ningún match/link todavía) — se
--              renombra la columna para reflejar el alcance nuevo. Datos existentes se
--              preservan.
-- Date: 2026

ALTER TABLE solicitud_cotizacion_items RENAME COLUMN nombre_externo TO nombre_ofrecido;

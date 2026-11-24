-- Migration: 033_add_nombre_externo_solicitud_items
-- Description: Permite ingresar el nombre del artículo cuando la compra es externa
--              (el ítem tiene url_externa cargada), ya que en ese caso no hay un
--              artículo propio matcheado del que tomar el nombre.
-- Date: 2026

ALTER TABLE solicitud_cotizacion_items ADD COLUMN IF NOT EXISTS nombre_externo TEXT;

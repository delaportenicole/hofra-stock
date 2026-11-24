-- Migration: 031_add_articulo_sugerido_solicitud_items
-- Description: Separa el artículo SUGERIDO por el matching automático del artículo ACEPTADO
--              por el usuario. Antes compartían la misma columna articulo_id: al buscar y
--              aceptar manualmente otro artículo, la sugerencia original quedaba pisada y
--              desaparecía de la pantalla de revisión (columna "Sugerido").
-- Date: 2026
-- Nota: el backfill asume que, para las solicitudes ya existentes, articulo_id todavía
--       refleja la sugerencia original (es decir, nadie pisó manualmente la sugerencia antes
--       de esta migración). Si algún ítem ya fue reasignado a mano, el backfill no puede
--       recuperar cuál fue la sugerencia real — queda igual al valor actual de articulo_id.

ALTER TABLE solicitud_cotizacion_items ADD COLUMN IF NOT EXISTS articulo_id_sugerido UUID REFERENCES articulos(id);

UPDATE solicitud_cotizacion_items SET articulo_id_sugerido = articulo_id WHERE articulo_id_sugerido IS NULL;

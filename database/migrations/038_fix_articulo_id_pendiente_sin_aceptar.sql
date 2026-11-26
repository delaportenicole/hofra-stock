-- Migration: 038_fix_articulo_id_pendiente_sin_aceptar
-- Description: Bug de datos arrastrado desde el insert original de ítems (create/addItems en
--              solicitudCotizacion.repository.ts): al importar, articulo_id se cargaba con el
--              mismo match que articulo_id_sugerido, aunque el ítem nunca fue aceptado por el
--              usuario (estado_item seguía 'pendiente'). Eso hacía que "Item Ofrecido" se
--              precargara con el nombre del artículo matcheado apenas importado, en vez de
--              quedar en blanco hasta un "Aceptar Sug." explícito. Se corrigió el insert
--              (ahora deja articulo_id en NULL); acá se limpian los ítems ya existentes que
--              quedaron en ese estado inconsistente (pendiente + articulo_id ya cargado).
-- Date: 2026

UPDATE solicitud_cotizacion_items
SET articulo_id = NULL
WHERE estado_item = 'pendiente'
  AND articulo_id IS NOT NULL
  AND articulo_id = articulo_id_sugerido;

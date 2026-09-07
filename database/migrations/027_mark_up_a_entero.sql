ALTER TABLE solicitud_cotizacion_items
  ALTER COLUMN mark_up TYPE INTEGER USING ROUND(mark_up)::INTEGER;

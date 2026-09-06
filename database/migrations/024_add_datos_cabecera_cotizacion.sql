ALTER TABLE solicitudes_cotizacion
  ADD COLUMN fecha_entrega DATE,
  ADD COLUMN solicitado_por VARCHAR(200),
  ADD COLUMN usd_oficial_compra NUMERIC(10,2),
  ADD COLUMN usd_oficial_venta NUMERIC(10,2);

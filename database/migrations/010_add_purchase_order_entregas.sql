-- Agregar campo purchase_order a entregas
ALTER TABLE entregas ADD COLUMN IF NOT EXISTS purchase_order VARCHAR(50);

-- Comentario para documentar el campo
COMMENT ON COLUMN entregas.purchase_order IS 'Número de Purchase Order del cliente';

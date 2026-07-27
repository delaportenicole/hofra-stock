-- Add URL field to articulos table
ALTER TABLE articulos
ADD COLUMN IF NOT EXISTS url TEXT;

COMMENT ON COLUMN articulos.url IS 'URL de referencia del producto (ej: link de Mercado Libre)';

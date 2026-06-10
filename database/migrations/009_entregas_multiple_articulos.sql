-- Migration 009: Entregas con múltiples artículos
-- Date: 2026-06-07

-- 1. Crear tabla de items de entrega
CREATE TABLE IF NOT EXISTS entrega_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entrega_id UUID NOT NULL REFERENCES entregas(id) ON DELETE CASCADE,
  articulo_id UUID NOT NULL REFERENCES articulos(id),
  cantidad INTEGER NOT NULL CHECK (cantidad > 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Migrar datos existentes a la nueva estructura
INSERT INTO entrega_items (entrega_id, articulo_id, cantidad, created_at)
SELECT id, articulo_id, cantidad, created_at
FROM entregas
WHERE articulo_id IS NOT NULL AND deleted_at IS NULL;

-- 3. Eliminar columnas antiguas de entregas (ahora están en entrega_items)
ALTER TABLE entregas DROP COLUMN IF EXISTS articulo_id;
ALTER TABLE entregas DROP COLUMN IF EXISTS cantidad;

-- 4. Crear índices
CREATE INDEX idx_entrega_items_entrega_id ON entrega_items(entrega_id);
CREATE INDEX idx_entrega_items_articulo_id ON entrega_items(articulo_id);

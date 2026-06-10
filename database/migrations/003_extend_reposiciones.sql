-- ============================================
-- Migración: Extender tabla reposiciones
-- Fecha: 2026-06-07
-- Descripción: Agregar campos para costos, vencimiento, lote y lugar de compra
-- ============================================

-- Costo de reposición en pesos
ALTER TABLE reposiciones ADD COLUMN IF NOT EXISTS costo_reposicion DECIMAL(12,2);

-- Valor del dólar oficial al momento de la reposición
ALTER TABLE reposiciones ADD COLUMN IF NOT EXISTS valor_dolar_oficial DECIMAL(10,2);

-- Costo de reposición en dólares (calculado: costo_reposicion / valor_dolar_oficial)
ALTER TABLE reposiciones ADD COLUMN IF NOT EXISTS costo_reposicion_dolares DECIMAL(12,2);

-- Fecha de vencimiento del producto
ALTER TABLE reposiciones ADD COLUMN IF NOT EXISTS fecha_vencimiento DATE;

-- Lote o partida del producto
ALTER TABLE reposiciones ADD COLUMN IF NOT EXISTS lote_partida VARCHAR(100);

-- Link de la compra (factura, orden de compra, etc.)
ALTER TABLE reposiciones ADD COLUMN IF NOT EXISTS link_compra TEXT;

-- Lugar de compra (tienda física, web, etc.)
ALTER TABLE reposiciones ADD COLUMN IF NOT EXISTS lugar_compra VARCHAR(200);

-- Índice para búsqueda por fecha de vencimiento
CREATE INDEX IF NOT EXISTS idx_reposiciones_vencimiento ON reposiciones(fecha_vencimiento) WHERE deleted_at IS NULL AND fecha_vencimiento IS NOT NULL;

-- Índice para búsqueda por lote
CREATE INDEX IF NOT EXISTS idx_reposiciones_lote ON reposiciones(lote_partida) WHERE deleted_at IS NULL AND lote_partida IS NOT NULL;

COMMENT ON COLUMN reposiciones.costo_reposicion IS 'Costo de la reposición en pesos argentinos';
COMMENT ON COLUMN reposiciones.valor_dolar_oficial IS 'Valor del dólar oficial al momento de la reposición';
COMMENT ON COLUMN reposiciones.costo_reposicion_dolares IS 'Costo calculado: costo_reposicion / valor_dolar_oficial';
COMMENT ON COLUMN reposiciones.fecha_vencimiento IS 'Fecha de vencimiento del lote';
COMMENT ON COLUMN reposiciones.lote_partida IS 'Número de lote o partida del producto';
COMMENT ON COLUMN reposiciones.link_compra IS 'URL o referencia al documento de compra';
COMMENT ON COLUMN reposiciones.lugar_compra IS 'Lugar donde se realizó la compra';

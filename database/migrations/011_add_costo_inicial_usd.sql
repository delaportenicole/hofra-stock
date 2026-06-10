-- Migration: Add USD cost fields for initial estimated cost in articles
-- This allows proper USD valuation for stock without replenishments

-- Add columns for USD calculation of initial estimated cost
ALTER TABLE articulos
ADD COLUMN IF NOT EXISTS valor_dolar_costo_inicial NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS costo_inicial_estimado_usd NUMERIC(12,2);

-- Comments
COMMENT ON COLUMN articulos.valor_dolar_costo_inicial IS 'Valor del dólar oficial al momento de asignar el costo inicial estimado';
COMMENT ON COLUMN articulos.costo_inicial_estimado_usd IS 'Costo inicial estimado en USD (auto-calculado: costo_inicial_estimado / valor_dolar_costo_inicial)';

-- Update existing articles that have costo_inicial_estimado but no USD value
-- Use a default dollar value of 1000 for historical data (can be adjusted manually)
UPDATE articulos
SET valor_dolar_costo_inicial = 1000,
    costo_inicial_estimado_usd = costo_inicial_estimado / 1000
WHERE costo_inicial_estimado IS NOT NULL
  AND costo_inicial_estimado > 0
  AND costo_inicial_estimado_usd IS NULL;

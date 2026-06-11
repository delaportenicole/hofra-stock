-- Migration: Add estado field to entregas table
-- Similar to reposiciones, entregas now have states: en_curso, confirmada, cancelada

-- Add estado column with default 'confirmada' for existing records
ALTER TABLE entregas
ADD COLUMN IF NOT EXISTS estado VARCHAR(20) DEFAULT 'confirmada' NOT NULL;

-- Add check constraint (drop first if exists to avoid errors)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'entregas_estado_check'
  ) THEN
    ALTER TABLE entregas
    ADD CONSTRAINT entregas_estado_check
    CHECK (estado IN ('en_curso', 'confirmada', 'cancelada'));
  END IF;
END $$;

-- Create index for filtering by estado
CREATE INDEX IF NOT EXISTS idx_entregas_estado ON entregas(estado);

-- Update existing entregas to be 'confirmada' (they were already processed)
UPDATE entregas SET estado = 'confirmada' WHERE estado IS NULL;

COMMENT ON COLUMN entregas.estado IS 'Estado de la entrega: en_curso (pendiente de confirmar), confirmada (stock descontado), cancelada';

-- Migration 008: Remove abreviatura column from unidades_medida
-- Date: 2026-06-07

-- Remove abreviatura column
ALTER TABLE unidades_medida DROP COLUMN IF EXISTS abreviatura;

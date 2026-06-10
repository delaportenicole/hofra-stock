-- Migration: Add notas column to clientes table
-- Date: 2024

ALTER TABLE clientes ADD COLUMN IF NOT EXISTS notas TEXT;

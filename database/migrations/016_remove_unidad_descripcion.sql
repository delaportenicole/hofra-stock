-- Migración: Eliminar campos unidad y descripcion de articulos
-- Fecha: 16 de junio de 2026

ALTER TABLE articulos DROP COLUMN IF EXISTS unidad;
ALTER TABLE articulos DROP COLUMN IF EXISTS descripcion;

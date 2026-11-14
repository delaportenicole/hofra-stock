-- Migration: 029_add_configuracion_dolar
-- Description: Guarda un único valor vigente del dólar oficial, compartido entre
--              la creación de artículos y la creación de reposiciones, para
--              precargarlo automáticamente y evitar que el usuario lo tipee cada vez.
--              Tabla de una sola fila (mismo patrón que google_integracion).
-- Date: 2026

CREATE TABLE configuracion_dolar (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    valor_dolar_oficial NUMERIC(10,2) NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID REFERENCES usuarios(id)
);

CREATE TRIGGER update_configuracion_dolar_updated_at BEFORE UPDATE ON configuracion_dolar
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

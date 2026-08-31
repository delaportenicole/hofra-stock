-- Migration: 023_add_google_integracion
-- Description: Guarda el permiso (refresh token) de la única cuenta de Google
--              conectada para exportar Solicitudes de Cotización a Google Sheets.
-- Date: 2026

CREATE TABLE google_integracion (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    refresh_token TEXT NOT NULL,
    connected_email VARCHAR(255),
    connected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER update_google_integracion_updated_at BEFORE UPDATE ON google_integracion
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

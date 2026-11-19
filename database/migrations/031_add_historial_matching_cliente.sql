-- Migración: Groundwork para que el futuro Hofra AI Agent pueda aprender de confirmaciones
-- humanas pasadas. Se alimenta automáticamente (backend/src/services/solicitudCotizacion.service.ts,
-- método updateItem) cada vez que un ítem de una Solicitud de Cotización se acepta con un
-- articulo_id asociado. Por ahora solo se registra (origen 'humano'); usar este historial para
-- sugerir matches automáticamente queda para una etapa posterior.

CREATE TABLE historial_matching_cliente (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    descripcion_normalizada VARCHAR(500) NOT NULL,
    cliente_id UUID NOT NULL REFERENCES clientes(id),
    articulo_id UUID NOT NULL REFERENCES articulos(id),
    origen VARCHAR(20) NOT NULL DEFAULT 'humano',
    veces_confirmado INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_historial_matching_origen CHECK (origen IN ('humano', 'ia')),
    CONSTRAINT uq_historial_matching UNIQUE (descripcion_normalizada, cliente_id, articulo_id)
);

CREATE INDEX idx_historial_matching_descripcion ON historial_matching_cliente(descripcion_normalizada);
CREATE INDEX idx_historial_matching_cliente ON historial_matching_cliente(cliente_id);

COMMENT ON TABLE historial_matching_cliente IS 'Historial de qué artículo del catálogo correspondió a qué descripción de cliente, confirmado por un humano al aceptar un ítem de Solicitud de Cotización. Groundwork para sugerencias automáticas futuras del Hofra AI Agent.';

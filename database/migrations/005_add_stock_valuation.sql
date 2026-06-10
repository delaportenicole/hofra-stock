-- Migración: Sistema de valuación de stock por capas (FIFO)
-- Descripción: Agrega campos para rastrear stock disponible por reposición y costo inicial estimado

-- 1. Agregar stock_disponible a reposiciones
-- Indica cuántas unidades de esta reposición aún están en inventario
ALTER TABLE reposiciones ADD COLUMN stock_disponible INTEGER NOT NULL DEFAULT 0;

-- Inicializar stock_disponible para reposiciones confirmadas existentes
-- Como no tenemos historial de entregas por reposición, asumimos que el stock actual
-- proviene de las reposiciones más recientes (LIFO inverso para inicialización)
-- NOTA: Esto es una aproximación para datos existentes

-- Primero, crear una función para inicializar el stock_disponible
DO $$
DECLARE
    art RECORD;
    repo RECORD;
    stock_restante INTEGER;
BEGIN
    -- Para cada artículo
    FOR art IN SELECT id, stock FROM articulos WHERE deleted_at IS NULL LOOP
        stock_restante := art.stock;

        -- Recorrer reposiciones confirmadas de más reciente a más antigua
        FOR repo IN
            SELECT id, cantidad
            FROM reposiciones
            WHERE articulo_id = art.id
              AND estado = 'confirmada'
              AND deleted_at IS NULL
            ORDER BY fecha_reposicion DESC
        LOOP
            IF stock_restante >= repo.cantidad THEN
                -- Esta reposición tiene todo su stock disponible
                UPDATE reposiciones SET stock_disponible = repo.cantidad WHERE id = repo.id;
                stock_restante := stock_restante - repo.cantidad;
            ELSIF stock_restante > 0 THEN
                -- Esta reposición tiene parte de su stock disponible
                UPDATE reposiciones SET stock_disponible = stock_restante WHERE id = repo.id;
                stock_restante := 0;
            ELSE
                -- Esta reposición ya no tiene stock disponible
                UPDATE reposiciones SET stock_disponible = 0 WHERE id = repo.id;
            END IF;
        END LOOP;
    END LOOP;
END $$;

-- 2. Agregar costo_inicial_estimado a articulos
-- Para stock que no tiene reposición asociada
ALTER TABLE articulos ADD COLUMN costo_inicial_estimado NUMERIC(12,2);

-- Agregar constraint para que stock_disponible no sea negativo ni mayor que cantidad
ALTER TABLE reposiciones ADD CONSTRAINT chk_stock_disponible_valid
    CHECK (stock_disponible >= 0 AND stock_disponible <= cantidad);

-- Índice para búsqueda de reposiciones con stock disponible
CREATE INDEX idx_reposiciones_stock_disponible
    ON reposiciones(articulo_id, stock_disponible)
    WHERE deleted_at IS NULL AND estado = 'confirmada' AND stock_disponible > 0;

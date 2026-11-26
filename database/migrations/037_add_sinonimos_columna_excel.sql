-- Migration: 037_add_sinonimos_columna_excel
-- Description: Sinónimos de nombres de columna para la detección de encabezados al
--              importar Excel en Solicitud de Cotización — distintos clientes/proveedores
--              usan nombres distintos para el mismo campo (ej. "CANT." o "QTY" en vez de
--              "Cantidad"). Pantalla de gestión en Configuraciones.
-- Date: 2026

CREATE TABLE sinonimos_columna_excel (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campo VARCHAR(30) NOT NULL,
    sinonimo VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    created_by UUID REFERENCES usuarios(id),
    updated_by UUID REFERENCES usuarios(id),
    CONSTRAINT chk_sinonimo_columna_excel_campo CHECK (
        campo IN ('etm', 'descripcion', 'descripcion_ingles', 'cantidad', 'marca', 'modelo', 'unidad')
    )
);

-- Evita cargar el mismo sinónimo dos veces para el mismo campo (sin distinguir mayúsculas)
CREATE UNIQUE INDEX idx_sinonimos_columna_excel_campo_valor
    ON sinonimos_columna_excel (campo, UPPER(sinonimo))
    WHERE deleted_at IS NULL;

CREATE INDEX idx_sinonimos_columna_excel_campo ON sinonimos_columna_excel(campo) WHERE deleted_at IS NULL;

CREATE TRIGGER update_sinonimos_columna_excel_updated_at BEFORE UPDATE ON sinonimos_columna_excel
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Permisos del módulo: Administrador y Compras (quien sube los Excel de Solicitud de
-- Cotización). 'leer' tiene su propio permiso en este módulo (no reutiliza
-- 'solicitudes_cotizacion:leer') porque en producción el rol Compras no tiene ningún permiso
-- de 'solicitudes_cotizacion' — si el GET dependiera de ese permiso, los sinónimos nunca se
-- aplicarían al parsear un archivo para ese rol, justo el caso de uso que motivó esta feature.
INSERT INTO permisos (modulo, accion, descripcion) VALUES
    ('sinonimos_columna_excel', 'leer', 'Ver sinónimos de columnas Excel'),
    ('sinonimos_columna_excel', 'crear', 'Agregar sinónimos de columnas Excel'),
    ('sinonimos_columna_excel', 'eliminar', 'Eliminar sinónimos de columnas Excel')
ON CONFLICT (modulo, accion) DO NOTHING;

INSERT INTO roles_permisos (rol_id, permiso_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permisos p
WHERE r.nombre IN ('Administrador', 'Compras')
AND p.modulo = 'sinonimos_columna_excel'
AND NOT EXISTS (
    SELECT 1 FROM roles_permisos rp WHERE rp.rol_id = r.id AND rp.permiso_id = p.id
);

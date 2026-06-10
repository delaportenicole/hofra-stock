-- Migración: Crear tablas de Unidades de Medida y Presentaciones
-- Fecha: 2026-06-07

-- Tabla de Unidades de Medida
CREATE TABLE IF NOT EXISTS unidades_medida (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(50) NOT NULL,
  abreviatura VARCHAR(10) NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  created_by UUID REFERENCES usuarios(id),
  updated_by UUID REFERENCES usuarios(id)
);

-- Tabla de Presentaciones
CREATE TABLE IF NOT EXISTS presentaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(100) NOT NULL,
  descripcion VARCHAR(255),
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  created_by UUID REFERENCES usuarios(id),
  updated_by UUID REFERENCES usuarios(id)
);

-- Índices
CREATE INDEX idx_unidades_medida_nombre ON unidades_medida(nombre) WHERE deleted_at IS NULL;
CREATE INDEX idx_unidades_medida_activo ON unidades_medida(activo) WHERE deleted_at IS NULL;
CREATE INDEX idx_presentaciones_nombre ON presentaciones(nombre) WHERE deleted_at IS NULL;
CREATE INDEX idx_presentaciones_activo ON presentaciones(activo) WHERE deleted_at IS NULL;

-- Insertar unidades de medida por defecto (basadas en las constantes actuales)
INSERT INTO unidades_medida (nombre, abreviatura) VALUES
  ('Unidad', 'Un'),
  ('Kilogramo', 'Kg'),
  ('Gramo', 'g'),
  ('Litro', 'L'),
  ('Mililitro', 'ml'),
  ('Metro', 'm'),
  ('Centímetro', 'cm'),
  ('Metro cuadrado', 'm²'),
  ('Metro cúbico', 'm³'),
  ('Par', 'Par'),
  ('Docena', 'Doc'),
  ('Caja', 'Cja'),
  ('Paquete', 'Paq'),
  ('Rollo', 'Rll'),
  ('Bolsa', 'Bls'),
  ('Botella', 'Bot'),
  ('Lata', 'Lta'),
  ('Bidón', 'Bid'),
  ('Tambor', 'Tmb'),
  ('Paleta', 'Plt');

-- Insertar presentaciones comunes por defecto
INSERT INTO presentaciones (nombre, descripcion) VALUES
  ('Unidad individual', 'Producto vendido individualmente'),
  ('Caja x 6', 'Caja con 6 unidades'),
  ('Caja x 12', 'Caja con 12 unidades'),
  ('Caja x 24', 'Caja con 24 unidades'),
  ('Pack x 3', 'Pack de 3 unidades'),
  ('Pack x 6', 'Pack de 6 unidades'),
  ('Bolsa x 10', 'Bolsa con 10 unidades'),
  ('Bolsa x 25', 'Bolsa con 25 unidades'),
  ('Bolsa x 50', 'Bolsa con 50 unidades'),
  ('Bolsa x 100', 'Bolsa con 100 unidades');

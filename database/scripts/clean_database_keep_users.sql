-- Script para limpiar datos operativos (mantiene usuarios y roles)
-- ADVERTENCIA: Este script elimina todos los datos operativos
-- Ejecutar con precaución

-- Desactivar triggers temporalmente para evitar problemas con auditoría
SET session_replication_role = 'replica';

-- Limpiar tablas en orden (respetando foreign keys)

-- Auditoría
TRUNCATE TABLE audit_log CASCADE;

-- Movimientos de stock (entregas e items)
TRUNCATE TABLE entrega_items CASCADE;
TRUNCATE TABLE entregas CASCADE;

-- Reposiciones
TRUNCATE TABLE reposiciones CASCADE;

-- Solicitudes de cotización (items primero por la FK)
TRUNCATE TABLE solicitud_cotizacion_items CASCADE;
TRUNCATE TABLE solicitudes_cotizacion CASCADE;

-- Artículos
TRUNCATE TABLE articulos CASCADE;

-- Entidades relacionadas
TRUNCATE TABLE clientes CASCADE;
TRUNCATE TABLE proveedores CASCADE;
TRUNCATE TABLE rubros CASCADE;
TRUNCATE TABLE marcas CASCADE;

-- Sugerencias
TRUNCATE TABLE sugerencias CASCADE;

-- Reiniciar el correlativo de número de cotización (vuelve a arrancar desde 250)
ALTER SEQUENCE solicitudes_cotizacion_numero_seq RESTART WITH 250;

-- NO se eliminan: usuarios, roles, permisos, roles_permisos, usuarios_roles, google_integracion

-- Reactivar triggers
SET session_replication_role = 'origin';

-- Mensaje de confirmación
DO $$
BEGIN
  RAISE NOTICE 'Datos operativos eliminados. Usuarios y roles mantenidos.';
END $$;

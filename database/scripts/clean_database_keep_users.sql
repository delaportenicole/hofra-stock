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

-- Artículos
TRUNCATE TABLE articulos CASCADE;

-- Entidades relacionadas
TRUNCATE TABLE clientes CASCADE;
TRUNCATE TABLE proveedores CASCADE;
TRUNCATE TABLE rubros CASCADE;
TRUNCATE TABLE marcas CASCADE;

-- Sugerencias
TRUNCATE TABLE sugerencias CASCADE;

-- NO se eliminan: users, roles, user_roles, role_permissions

-- Reactivar triggers
SET session_replication_role = 'origin';

-- Mensaje de confirmación
DO $$
BEGIN
  RAISE NOTICE 'Datos operativos eliminados. Usuarios y roles mantenidos.';
END $$;

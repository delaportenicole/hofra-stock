-- Script para limpiar todos los datos de la base de datos
-- ADVERTENCIA: Este script elimina TODOS los datos de todas las tablas
-- Ejecutar con precaución

-- Desactivar triggers temporalmente para evitar problemas con auditoría
SET session_replication_role = 'replica';

-- Limpiar tablas en orden (respetando foreign keys)
-- Primero las tablas dependientes, luego las principales

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

-- Usuarios y roles (opcional - comentar si querés mantener usuarios)
TRUNCATE TABLE user_roles CASCADE;
TRUNCATE TABLE role_permissions CASCADE;
TRUNCATE TABLE roles CASCADE;
TRUNCATE TABLE users CASCADE;

-- Sugerencias
TRUNCATE TABLE sugerencias CASCADE;

-- Reactivar triggers
SET session_replication_role = 'origin';

-- Mensaje de confirmación
DO $$
BEGIN
  RAISE NOTICE 'Base de datos limpiada exitosamente';
END $$;

-- ============================================
-- MIGRATION: Add reportes permission
-- ============================================

-- Add reportes permission
INSERT INTO permisos (modulo, accion, descripcion) VALUES
('reportes', 'leer', 'Ver reportes')
ON CONFLICT DO NOTHING;

-- Assign to Administrador role
INSERT INTO roles_permisos (rol_id, permiso_id)
SELECT r.id, p.id
FROM roles r, permisos p
WHERE r.nombre = 'Administrador'
AND p.modulo = 'reportes' AND p.accion = 'leer'
ON CONFLICT DO NOTHING;

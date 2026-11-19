-- Migración: Agrega autenticación por API key para procesos externos (ej. Hofra AI Agent)
-- que necesitan llamar a la API sin ser un usuario humano logueado por contraseña.
--
-- Cada API key está atada a un usuario "identidad de servicio" real en `usuarios` (para que
-- usuario_id siga siendo una FK válida en audit_log, igual que con cualquier usuario humano),
-- pero los permisos efectivos de la key vienen de `api_keys.permisos` (un array plano
-- modulo:accion, el mismo formato que ya usa requirePermission), no de roles/permisos
-- normales — así se puede acotar una key a un subconjunto mínimo sin crear un rol completo.

CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(100) NOT NULL,
    key_hash VARCHAR(64) NOT NULL UNIQUE,
    usuario_id UUID NOT NULL REFERENCES usuarios(id),
    permisos TEXT[] NOT NULL DEFAULT '{}',
    activa BOOLEAN NOT NULL DEFAULT true,
    last_used_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES usuarios(id)
);

CREATE INDEX idx_api_keys_hash ON api_keys(key_hash) WHERE activa = true AND revoked_at IS NULL;

COMMENT ON COLUMN api_keys.key_hash IS 'SHA-256 (hex) de la API key en texto plano. La key real nunca se persiste ni se puede recuperar, solo regenerar.';
COMMENT ON COLUMN api_keys.usuario_id IS 'Usuario "identidad de servicio" que esta key representa (nunca inicia sesión por password, solo existe para que usuario_id sea una FK válida en audit_log y otros lados).';
COMMENT ON COLUMN api_keys.permisos IS 'Permisos en formato modulo:accion, mismo modelo que la tabla permisos/roles (ver requirePermission). No pasa por roles/permisos normales.';

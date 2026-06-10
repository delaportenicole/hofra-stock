-- Migration: 013_add_username
-- Description: Adds username column to usuarios table for login
-- Date: 2024

-- Add username column
ALTER TABLE usuarios ADD COLUMN username VARCHAR(50);

-- Create unique index for username
CREATE UNIQUE INDEX idx_usuarios_username ON usuarios(username) WHERE deleted_at IS NULL;

-- Update existing users with a default username based on email (part before @)
UPDATE usuarios SET username = SPLIT_PART(email, '@', 1) WHERE username IS NULL;

-- Make username NOT NULL after setting defaults
ALTER TABLE usuarios ALTER COLUMN username SET NOT NULL;

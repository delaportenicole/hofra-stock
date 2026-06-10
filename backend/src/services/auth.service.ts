import bcrypt from 'bcryptjs';
import { usuarioRepository } from '../repositories/usuario.repository.js';
import { refreshTokenRepository } from '../repositories/refreshToken.repository.js';
import { generateTokens, hashToken, verifyAccessToken, getRefreshTokenExpiry } from '../utils/jwt.js';
import { UnauthorizedError, NotFoundError } from '../utils/errors.js';
import type { AuthResponse, JwtPayload } from '@hofra/shared';

export class AuthService {
  async login(username: string, password: string): Promise<AuthResponse> {
    const usuario = await usuarioRepository.findByUsernameWithRolesAndPermisos(username);

    if (!usuario) {
      throw new UnauthorizedError('Credenciales inválidas');
    }

    if (!usuario.activo) {
      throw new UnauthorizedError('Usuario desactivado');
    }

    const isValidPassword = await bcrypt.compare(password, usuario.passwordHash);

    if (!isValidPassword) {
      throw new UnauthorizedError('Credenciales inválidas');
    }

    // Generate tokens
    const permisos = usuario.permisos.map((p) => `${p.modulo}:${p.accion}`);
    const roles = usuario.roles.map((r) => r.nombre);

    const tokens = generateTokens({
      userId: usuario.id,
      email: usuario.email,
      roles,
      permisos,
    });

    // Save refresh token
    await refreshTokenRepository.create(
      usuario.id,
      tokens.refreshTokenHash,
      getRefreshTokenExpiry()
    );

    // Update last access
    await usuarioRepository.updateLastAccess(usuario.id);

    // Remove sensitive data
    const { passwordHash: _, permisos: __, ...usuarioData } = usuario;

    return {
      usuario: usuarioData,
      tokens: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      },
    };
  }

  async refreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    const tokenHash = hashToken(refreshToken);
    const storedToken = await refreshTokenRepository.findByTokenHash(tokenHash);

    if (!storedToken) {
      throw new UnauthorizedError('Token de refresco inválido');
    }

    // Revoke old token
    await refreshTokenRepository.revoke(tokenHash);

    // Get user with roles and permisos
    const usuario = await usuarioRepository.findByIdWithRoles(storedToken.usuario_id);

    if (!usuario || !usuario.activo) {
      throw new UnauthorizedError('Usuario no encontrado o desactivado');
    }

    const permisos = await usuarioRepository.getPermisos(usuario.id);
    const permisosStrings = permisos.map((p) => `${p.modulo}:${p.accion}`);
    const roles = usuario.roles.map((r) => r.nombre);

    // Generate new tokens
    const tokens = generateTokens({
      userId: usuario.id,
      email: usuario.email,
      roles,
      permisos: permisosStrings,
    });

    // Save new refresh token
    await refreshTokenRepository.create(
      usuario.id,
      tokens.refreshTokenHash,
      getRefreshTokenExpiry()
    );

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  async logout(refreshToken: string): Promise<void> {
    const tokenHash = hashToken(refreshToken);
    await refreshTokenRepository.revoke(tokenHash);
  }

  async logoutAll(userId: string): Promise<void> {
    await refreshTokenRepository.revokeAllForUser(userId);
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    const usuario = await usuarioRepository.findByEmail(
      (await usuarioRepository.findById(userId))?.email || ''
    );

    if (!usuario) {
      throw new NotFoundError('Usuario');
    }

    const isValidPassword = await bcrypt.compare(currentPassword, usuario.passwordHash);

    if (!isValidPassword) {
      throw new UnauthorizedError('Contraseña actual incorrecta');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await usuarioRepository.updatePassword(userId, passwordHash, userId);

    // Revoke all refresh tokens
    await refreshTokenRepository.revokeAllForUser(userId);
  }

  async getProfile(userId: string): Promise<JwtPayload & { nombre: string; apellido: string }> {
    const usuario = await usuarioRepository.findByIdWithRoles(userId);

    if (!usuario) {
      throw new NotFoundError('Usuario');
    }

    const permisos = await usuarioRepository.getPermisos(userId);

    return {
      userId: usuario.id,
      email: usuario.email,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      roles: usuario.roles.map((r) => r.nombre),
      permisos: permisos.map((p) => `${p.modulo}:${p.accion}`),
    };
  }
}

export const authService = new AuthService();

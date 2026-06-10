import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../config/env.js';
import type { JwtPayload, AuthTokens } from '@hofra/shared';

export function generateAccessToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRY as string,
  } as jwt.SignOptions);
}

export function generateRefreshToken(): string {
  return crypto.randomBytes(64).toString('hex');
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function generateTokens(
  payload: Omit<JwtPayload, 'iat' | 'exp'>
): AuthTokens & { refreshTokenHash: string } {
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken();
  const refreshTokenHash = hashToken(refreshToken);

  return {
    accessToken,
    refreshToken,
    refreshTokenHash,
  };
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
}

export function decodeToken(token: string): JwtPayload | null {
  try {
    return jwt.decode(token) as JwtPayload;
  } catch {
    return null;
  }
}

export function getRefreshTokenExpiry(): Date {
  const days = parseInt(env.JWT_REFRESH_EXPIRY.replace('d', ''), 10);
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + days);
  return expiry;
}

import api from './api';
import type { AuthResponse } from '@hofra/shared';

export const authService = {
  async login(username: string, password: string): Promise<AuthResponse> {
    const response = await api.post<{ data: AuthResponse }>('/auth/login', {
      username,
      password,
    });
    return response.data.data;
  },

  async logout(refreshToken: string): Promise<void> {
    await api.post('/auth/logout', { refreshToken });
  },

  async getProfile(): Promise<{
    userId: string;
    email: string;
    nombre: string;
    apellido: string;
    roles: string[];
    permisos: string[];
  }> {
    const response = await api.get('/auth/profile');
    return response.data.data;
  },

  async changePassword(currentPassword: string, newPassword: string, confirmPassword: string): Promise<void> {
    await api.post('/auth/change-password', {
      currentPassword,
      newPassword,
      confirmPassword,
    });
  },
};

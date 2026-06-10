import { useAuthStore } from '../stores/authStore';
import { authService } from '../services/auth.service';
import { getErrorMessage } from '../services/api';
import toast from 'react-hot-toast';

export function useAuth() {
  const { usuario, isAuthenticated, clearAuth, setAuth, hasPermission, hasAnyPermission, refreshToken } = useAuthStore();

  const login = async (username: string, password: string) => {
    try {
      const result = await authService.login(username, password);

      // Store tokens first so profile call works
      useAuthStore.getState().setTokens(result.tokens);

      // Get permisos from profile
      const profile = await authService.getProfile();

      setAuth(result.usuario, result.tokens, profile.permisos);
      toast.success('Inicio de sesión exitoso');
      return true;
    } catch (error) {
      toast.error(getErrorMessage(error));
      return false;
    }
  };

  const logout = async () => {
    try {
      if (refreshToken) {
        await authService.logout(refreshToken);
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      clearAuth();
      toast.success('Sesión cerrada');
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string, confirmPassword: string) => {
    try {
      await authService.changePassword(currentPassword, newPassword, confirmPassword);
      toast.success('Contraseña actualizada correctamente');
      return true;
    } catch (error) {
      toast.error(getErrorMessage(error));
      return false;
    }
  };

  return {
    usuario,
    isAuthenticated,
    login,
    logout,
    changePassword,
    hasPermission,
    hasAnyPermission,
  };
}

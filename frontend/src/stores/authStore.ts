import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UsuarioConRoles, AuthTokens } from '@hofra/shared';

interface AuthState {
  usuario: UsuarioConRoles | null;
  accessToken: string | null;
  refreshToken: string | null;
  permisos: string[];
  isAuthenticated: boolean;

  // Actions
  setAuth: (usuario: UsuarioConRoles, tokens: AuthTokens, permisos: string[]) => void;
  setTokens: (tokens: AuthTokens) => void;
  clearAuth: () => void;
  hasPermission: (modulo: string, accion: string) => boolean;
  hasAnyPermission: (permisos: Array<{ modulo: string; accion: string }>) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      usuario: null,
      accessToken: null,
      refreshToken: null,
      permisos: [],
      isAuthenticated: false,

      setAuth: (usuario, tokens, permisos) => {
        set({
          usuario,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          permisos,
          isAuthenticated: true,
        });
      },

      setTokens: (tokens) => {
        set({
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        });
      },

      clearAuth: () => {
        set({
          usuario: null,
          accessToken: null,
          refreshToken: null,
          permisos: [],
          isAuthenticated: false,
        });
      },

      hasPermission: (modulo, accion) => {
        const state = get();
        return state.permisos.includes(`${modulo}:${accion}`);
      },

      hasAnyPermission: (permisos) => {
        const state = get();
        return permisos.some(({ modulo, accion }) =>
          state.permisos.includes(`${modulo}:${accion}`)
        );
      },
    }),
    {
      name: 'hofra-auth',
      partialize: (state) => ({
        usuario: state.usuario,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        permisos: state.permisos,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

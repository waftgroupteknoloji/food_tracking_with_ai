import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import type { PublicUser, AuthTokens } from '@yemek-takip/validators';
import { api, persistTokens, clearTokens, setAuthFailureHandler } from './api';

interface AuthState {
  user: PublicUser | null;
  status: 'idle' | 'loading' | 'authed' | 'unauthed';
  initialize: () => Promise<void>;
  setAuth: (input: { user: PublicUser; tokens: AuthTokens }) => Promise<void>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  status: 'idle',

  initialize: async () => {
    set({ status: 'loading' });
    const token = await SecureStore.getItemAsync('auth_access');
    if (!token) {
      set({ status: 'unauthed', user: null });
      return;
    }
    try {
      const me = await api.auth.me();
      set({ user: me, status: 'authed' });
    } catch {
      await clearTokens();
      set({ status: 'unauthed', user: null });
    }
  },

  setAuth: async ({ user, tokens }) => {
    await persistTokens(tokens);
    set({ user, status: 'authed' });
  },

  logout: async () => {
    try {
      await api.auth.logout();
    } catch {
      // ignore
    }
    await clearTokens();
    set({ user: null, status: 'unauthed' });
  },

  refreshMe: async () => {
    try {
      const me = await api.auth.me();
      set({ user: me });
    } catch {
      // ignore
    }
  },
}));

// 401 handler: server "session expired" derse otomatik logout
setAuthFailureHandler(() => {
  void useAuthStore.getState().logout();
});

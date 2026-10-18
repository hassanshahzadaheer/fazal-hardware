import { create } from 'zustand';
import { SessionUser } from '../../shared/types';

interface AuthState {
  user: SessionUser | null;
  loading: boolean;
  error: string | null;
  checkAuth: () => Promise<void>;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  error: null,

  checkAuth: async () => {
    try {
      const res = await window.api.auth.getCurrentUser();
      set({ user: res.ok ? res.data : null, loading: false });
    } catch {
      set({ user: null, loading: false });
    }
  },

  login: async (email, password) => {
    set({ error: null });
    try {
      const res = await window.api.auth.login(email, password);
      if (res.ok) {
        set({ user: res.data });
        return true;
      }
      set({ error: res.error.message });
      return false;
    } catch {
      set({ error: 'Unable to reach the application. Please restart.' });
      return false;
    }
  },

  logout: async () => {
    try {
      await window.api.auth.logout();
    } finally {
      set({ user: null });
    }
  },
}));

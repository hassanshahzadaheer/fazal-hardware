import { create } from 'zustand';
import { SessionUser } from '../../shared/types';

interface AuthState {
  user: SessionUser | null;
  loading: boolean;
  setUser: (user: SessionUser | null) => void;
  checkAuth: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  setUser: (user) => set({ user }),
  checkAuth: async () => {
    try {
      const res = await window.api.auth.getCurrentUser();
      if (res.ok) {
        set({ user: res.data, loading: false });
      } else {
        set({ user: null, loading: false });
      }
    } catch {
      set({ user: null, loading: false });
    }
  },
  logout: async () => {
    try {
      await window.api.auth.logout();
      set({ user: null });
    } catch {}
  }
}));

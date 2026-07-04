import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '@/lib/api';

export interface AdminUser {
  id: string;
  username: string;
}

interface AdminAuthState {
  admin: AdminUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<boolean>;
}

export const useAdminAuthStore = create<AdminAuthState>()(
  persist(
    (set, get) => ({
      admin: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (username: string, password: string) => {
        set({ isLoading: true });
        try {
          const response = await api.post('/auth/login', { username, password });
          const { token, admin } = response.data;

          localStorage.setItem('reon_admin_token', token);
          localStorage.setItem('reon_admin_user', JSON.stringify(admin));

          set({
            admin,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: () => {
        localStorage.removeItem('reon_admin_token');
        localStorage.removeItem('reon_admin_user');
        set({
          admin: null,
          isAuthenticated: false,
        });
      },

      checkAuth: async () => {
        const token = localStorage.getItem('reon_admin_token');
        if (!token) {
          set({ isAuthenticated: false, admin: null });
          return false;
        }

        try {
          const response = await api.get('/auth/verify');
          if (response.data.valid) {
            set({
              admin: response.data.admin,
              isAuthenticated: true,
            });
            return true;
          }
          set({ isAuthenticated: false, admin: null });
          return false;
        } catch {
          localStorage.removeItem('reon_admin_token');
          localStorage.removeItem('reon_admin_user');
          set({ isAuthenticated: false, admin: null });
          return false;
        }
      },
    }),
    {
      name: 'reon-admin-auth',
      partialize: (state) => ({
        admin: state.admin,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

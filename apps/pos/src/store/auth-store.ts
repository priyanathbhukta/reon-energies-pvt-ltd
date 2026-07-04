import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '@/lib/api';

export interface User {
  id: string;
  fullName: string;
  email: string;
  mobile: string;
  avatarUrl?: string;
  roles: string[];
}

export interface Partner {
  id: string;
  shopName: string;
  status: string;
  referralCode: string;
  referralSlug: string;
  commissionTier: string;
}

interface AuthState {
  user: User | null;
  partner: Partner | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Actions
  login: (username: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<{ referralCode?: string }>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  setLoading: (loading: boolean) => void;
}

export interface RegisterData {
  fullName: string;
  mobile: string;
  email: string;
  password: string;
  shopName: string;
  gstNumber?: string;
  address: string;
  state: string;
  district: string;
  pincode?: string;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      partner: null,
      isAuthenticated: false,
      isLoading: false,

      // ── Login with mobile/email + password ──────────────────
      login: async (username: string, password: string) => {
        set({ isLoading: true });
        try {
          const response = await api.post('/auth/pos-login', { username, password });
          const { accessToken, refreshToken, user, partner } = response.data;

          if (typeof window !== 'undefined') {
            localStorage.setItem('reon_access_token', accessToken);
            localStorage.setItem('reon_refresh_token', refreshToken);
          }

          set({
            user,
            partner,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      // ── Register new POS partner (no KYC/bank online) ────────
      register: async (data: RegisterData) => {
        set({ isLoading: true });
        try {
          const response = await api.post('/pos/register', data);
          set({ isLoading: false });
          return { referralCode: response.data.partner?.referralCode };
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      // ── Logout ───────────────────────────────────────────────
      logout: async () => {
        try {
          await api.post('/auth/logout');
        } catch {
          // Ignore server errors — clear local state regardless
        } finally {
          if (typeof window !== 'undefined') {
            localStorage.removeItem('reon_access_token');
            localStorage.removeItem('reon_refresh_token');
          }
          set({
            user: null,
            partner: null,
            isAuthenticated: false,
          });
        }
      },

      // ── Verify existing session on page load ─────────────────
      checkAuth: async () => {
        const token = typeof window !== 'undefined'
          ? localStorage.getItem('reon_access_token')
          : null;

        if (!token) {
          set({ isAuthenticated: false, isLoading: false, user: null, partner: null });
          return;
        }

        try {
          const response = await api.get('/auth/me');
          set({
            user: response.data.user,
            partner: response.data.partner,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch {
          // Token invalid or expired — clear everything
          if (typeof window !== 'undefined') {
            localStorage.removeItem('reon_access_token');
            localStorage.removeItem('reon_refresh_token');
          }
          set({
            isAuthenticated: false,
            isLoading: false,
            user: null,
            partner: null,
          });
        }
      },

      setLoading: (loading: boolean) => set({ isLoading: loading }),
    }),
    {
      name: 'reon-auth',
      partialize: (state) => ({
        user: state.user,
        partner: state.partner,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

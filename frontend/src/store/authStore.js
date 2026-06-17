import { create } from 'zustand';
import * as api from '../services/api';

const useAuthStore = create((set, get) => ({
  user: null,
  token: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: true,

  login: (userData, accessToken, refreshToken) => {
    localStorage.setItem('access_token', accessToken);
    if (refreshToken) {
      localStorage.setItem('refresh_token', refreshToken);
    }
    set({ 
      user: userData, 
      token: accessToken, 
      refreshToken: refreshToken || null,
      isAuthenticated: true,
      isLoading: false
    });
  },

  updateToken: (newToken) => {
    localStorage.setItem('access_token', newToken);
    set({ token: newToken });
  },

  // Clear auth state without making an API call (used internally when token is already invalid)
  silentLogout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    set({ user: null, token: null, refreshToken: null, isAuthenticated: false, isLoading: false });
  },

  logout: () => {
    // Only hit the server if we have a token in state (avoids 401 when token is already dead)
    const token = get().token;
    if (token) {
      api.logoutUser().catch(() => {});
    }
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    set({ user: null, token: null, refreshToken: null, isAuthenticated: false, isLoading: false });
  },

  updateUser: (updates) => {
    set((state) => ({
      user: state.user ? { ...state.user, ...updates } : null,
    }));
  },

  updateAvatar: (avatarUrl) => {
    set((state) => ({
      user: state.user ? { ...state.user, avatar_url: avatarUrl } : null,
    }));
  },

  restore: async () => {
    set({ isLoading: true });
    const token = localStorage.getItem('access_token');
    if (!token) {
      set({ isLoading: false });
      return;
    }

    try {
      const { data, error } = await api.getMe();
      if (!error) {
        set({
          user: data.user,
          token,
          refreshToken: localStorage.getItem('refresh_token'),
          isAuthenticated: true,
          isLoading: false
        });
      } else {
        throw new Error(error);
      }
    } catch {
      // Try refresh before giving up
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        try {
          const { data: refreshData, error: refreshError } = await api.refreshTokenApi(refreshToken);
          if (!refreshError && refreshData?.access_token) {
            const newToken = refreshData.access_token;
            localStorage.setItem('access_token', newToken);
            
            const { data: meData, error: meError } = await api.getMe();
            if (!meError) {
              set({
                user: meData.user,
                token: newToken,
                refreshToken,
                isAuthenticated: true,
                isLoading: false
              });
              return;
            }
          }
        } catch {
          // Refresh also failed
        }
      }
      // Token + refresh both failed: clear storage silently (no API call — token is already dead)
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      set({ user: null, token: null, refreshToken: null, isAuthenticated: false, isLoading: false });
    }
  },

  setLoading: (v) => set({ isLoading: v }),
}));

export default useAuthStore;

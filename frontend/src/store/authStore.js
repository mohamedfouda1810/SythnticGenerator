import { create } from 'zustand';

const useAuthStore = create((set, get) => ({
  user: null,
  token: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: true,

  login: (userData, accessToken, refreshTkn) => {
    localStorage.setItem('token', accessToken);
    if (refreshTkn) localStorage.setItem('refreshToken', refreshTkn);
    set({
      user: userData,
      token: accessToken,
      refreshToken: refreshTkn || null,
      isAuthenticated: true,
      isLoading: false,
    });
  },

  logout: () => {
    const token = get().token;
    if (token) {
      fetch('/api/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    set({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
    });
  },

  updateUser: (updates) => {
    set((state) => ({
      user: state.user ? { ...state.user, ...updates } : null,
    }));
  },

  restore: async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      set({ isLoading: false });
      return;
    }

    try {
      const resp = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (resp.ok) {
        const data = await resp.json();
        set({
          user: data.user,
          token,
          refreshToken: localStorage.getItem('refreshToken'),
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        // Token invalid, clear
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },

  setLoading: (v) => set({ isLoading: v }),
}));

export default useAuthStore;

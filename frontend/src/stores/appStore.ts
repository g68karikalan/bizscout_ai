import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'light' | 'dark' | 'system';

interface User {
  userId: string;
  email?: string;
  name?: string;
  profile?: {
    fullName: string;
    businessName?: string;
    role?: string;
    services?: string[];
    targetIndustries?: string[];
    defaultCountry?: string;
    defaultState?: string;
    defaultCity?: string;
    onboardingComplete: boolean;
  };
}

interface AppState {
  // Auth
  token: string | null;
  user: User | null;
  isAuthLoading: boolean;

  // Theme
  theme: Theme;

  // Sidebar
  sidebarCollapsed: boolean;

  // Actions
  setToken: (token: string) => void;
  setUser: (user: User) => void;
  logout: () => void;
  setTheme: (theme: Theme) => void;
  toggleSidebar: () => void;
  setAuthLoading: (loading: boolean) => void;
  updateProfile: (profile: Partial<User['profile']>) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      isAuthLoading: true,
      theme: 'system',
      sidebarCollapsed: false,

      setToken: (token) => {
        localStorage.setItem('bs_token', token);
        set({ token });
      },

      setUser: (user) => {
        set({ user });
      },

      logout: () => {
        localStorage.removeItem('bs_token');
        localStorage.removeItem('bs_user');
        set({ token: null, user: null });
      },

      setTheme: (theme) => {
        set({ theme });
        applyTheme(theme);
      },

      toggleSidebar: () => {
        set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed }));
      },

      setAuthLoading: (loading) => set({ isAuthLoading: loading }),

      updateProfile: (profile) => {
        const user = get().user;
        if (!user) return;
        set({
          user: {
            ...user,
            profile: { ...user.profile, ...profile } as User['profile'],
          },
        });
      },
    }),
    {
      name: 'bizscout-store',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        theme: state.theme,
        sidebarCollapsed: state.sidebarCollapsed,
      }),
    }
  )
);

export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.classList.toggle('dark', prefersDark);
  } else {
    root.classList.toggle('dark', theme === 'dark');
  }
}

// Initialize theme on load
export function initTheme() {
  const stored = localStorage.getItem('bizscout-store');
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      const theme = parsed.state?.theme || 'system';
      applyTheme(theme);
    } catch {
      applyTheme('system');
    }
  } else {
    applyTheme('system');
  }
}

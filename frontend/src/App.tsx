import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useAppStore, initTheme } from './stores/appStore';

// Layouts
import { AppLayout } from './components/layout/AppLayout';
import { AuthLayout } from './components/layout/AuthLayout';

// Auth pages
import { LoginPage } from './pages/auth/LoginPage';
import { SignupPage } from './pages/auth/SignupPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';

// Onboarding
import { OnboardingPage } from './pages/OnboardingPage';

// App pages
import { DashboardPage } from './pages/DashboardPage';
import { FindLeadsPage } from './pages/FindLeadsPage';
import { LeadsPage } from './pages/LeadsPage';
import { HotLeadsPage } from './pages/HotLeadsPage';
import { LeadDetailPage } from './pages/LeadDetailPage';
import { CampaignsPage } from './pages/CampaignsPage';
import { CampaignDetailPage } from './pages/CampaignDetailPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { ExportsPage } from './pages/ExportsPage';
import { SettingsPage } from './pages/SettingsPage';

// Guards
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { GuestRoute } from './components/auth/GuestRoute';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function AppInitializer({ children }: { children: React.ReactNode }) {
  const { theme, setAuthLoading, token, setUser } = useAppStore();

  useEffect(() => {
    initTheme();
  }, []);

  useEffect(() => {
    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (theme === 'system') {
        document.documentElement.classList.toggle('dark', mediaQuery.matches);
      }
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  useEffect(() => {
    // Validate stored token on mount
    if (token) {
      // Token exists — assume valid, auth state is loaded
      setAuthLoading(false);
    } else {
      setAuthLoading(false);
    }
  }, [token, setAuthLoading]);

  return <>{children}</>;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppInitializer>
          <Routes>
            {/* Guest routes (redirect if logged in) */}
            <Route element={<GuestRoute />}>
              <Route element={<AuthLayout />}>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/signup" element={<SignupPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              </Route>
            </Route>

            {/* Onboarding */}
            <Route element={<ProtectedRoute />}>
              <Route path="/onboarding" element={<OnboardingPage />} />
            </Route>

            {/* App routes */}
            <Route element={<ProtectedRoute requireOnboarding />}>
              <Route element={<AppLayout />}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/find-leads" element={<FindLeadsPage />} />
                <Route path="/search" element={<FindLeadsPage />} />
                <Route path="/leads" element={<LeadsPage />} />
                <Route path="/leads/hot" element={<HotLeadsPage />} />
                <Route path="/leads/:id" element={<LeadDetailPage />} />
                <Route path="/campaigns" element={<CampaignsPage />} />
                <Route path="/campaigns/:id" element={<CampaignDetailPage />} />
                <Route path="/analytics" element={<AnalyticsPage />} />
                <Route path="/exports" element={<ExportsPage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Route>
            </Route>

            {/* Redirects */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </AppInitializer>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

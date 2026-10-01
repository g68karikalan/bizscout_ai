import { Navigate, Outlet } from 'react-router-dom';
import { useAppStore } from '../../stores/appStore';

export function ProtectedRoute({ requireOnboarding = false }: { requireOnboarding?: boolean }) {
  const { token, user, isAuthLoading } = useAppStore();

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[--bg]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-[--text-muted]">Loading BizScout AI...</p>
        </div>
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (requireOnboarding && user?.profile && !user.profile.onboardingComplete) {
    return <Navigate to="/onboarding" replace />;
  }

  return <Outlet />;
}

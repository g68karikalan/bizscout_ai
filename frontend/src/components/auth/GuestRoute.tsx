import { Navigate, Outlet } from 'react-router-dom';
import { useAppStore } from '../../stores/appStore';

export function GuestRoute() {
  const { token } = useAppStore();

  if (token) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}

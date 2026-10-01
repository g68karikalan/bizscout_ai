import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Search,
  Users,
  Flame,
  Megaphone,
  BarChart2,
  Download,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Radar,
  Sun,
  Moon,
  Monitor,
} from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { cn } from '../../lib/utils';
import { apiClient } from '../../lib/api';

const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/find-leads', icon: Search, label: 'Find Leads' },
  { to: '/leads', icon: Users, label: 'All Leads' },
  { to: '/leads/hot', icon: Flame, label: 'Hot Leads' },
  { to: '/campaigns', icon: Megaphone, label: 'Campaigns' },
  { to: '/analytics', icon: BarChart2, label: 'Analytics' },
  { to: '/exports', icon: Download, label: 'Exports' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar, theme, setTheme, user, logout } = useAppStore();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch { /* ignore */ }
    logout();
    navigate('/login');
  };

  const themeOptions = [
    { value: 'light' as const, icon: Sun, label: 'Light' },
    { value: 'dark' as const, icon: Moon, label: 'Dark' },
    { value: 'system' as const, icon: Monitor, label: 'System' },
  ];

  return (
    <aside
      className={cn(
        'hidden lg:flex flex-col fixed top-0 left-0 h-screen border-r border-[--border] bg-[--surface] transition-all duration-200 z-40',
        sidebarCollapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-between px-4 h-16 border-b border-[--border] shrink-0">
        {!sidebarCollapsed && (
          <Link to="/dashboard" className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-brand-600 rounded-xl flex items-center justify-center shrink-0">
              <Radar className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-bold text-[--text] whitespace-nowrap">BizScout AI</span>
          </Link>
        )}
        {sidebarCollapsed && (
          <Link to="/dashboard" className="w-8 h-8 bg-brand-600 rounded-xl flex items-center justify-center mx-auto">
            <Radar className="w-4 h-4 text-white" />
          </Link>
        )}
        {!sidebarCollapsed && (
          <button
            onClick={toggleSidebar}
            className="btn-ghost btn-sm !p-1.5 shrink-0"
            aria-label="Collapse sidebar"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => {
          const active = location.pathname === to || (to !== '/dashboard' && location.pathname.startsWith(to));
          return (
            <Link
              key={to}
              to={to}
              className={cn(active ? 'sidebar-link-active' : 'sidebar-link', sidebarCollapsed && 'justify-center px-0')}
              title={sidebarCollapsed ? label : undefined}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {!sidebarCollapsed && <span className="truncate">{label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="px-2 py-3 border-t border-[--border] space-y-1 shrink-0">
        {/* Theme toggle */}
        {!sidebarCollapsed && (
          <div className="flex items-center gap-1 p-1 bg-[--surface-2] rounded-xl mb-2">
            {themeOptions.map(({ value, icon: Icon, label }) => (
              <button
                key={value}
                onClick={() => setTheme(value)}
                className={cn(
                  'flex-1 flex items-center justify-center py-1.5 rounded-lg transition-all',
                  theme === value
                    ? 'bg-[--surface] shadow-sm text-[--text]'
                    : 'text-[--text-muted] hover:text-[--text]'
                )}
                title={label}
              >
                <Icon className="w-3.5 h-3.5" />
              </button>
            ))}
          </div>
        )}

        {/* Collapse toggle when collapsed */}
        {sidebarCollapsed && (
          <button
            onClick={toggleSidebar}
            className="btn-ghost btn-sm w-full justify-center !p-2"
            aria-label="Expand sidebar"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}

        {/* User */}
        <div className={cn('flex items-center gap-2.5 px-2 py-2', sidebarCollapsed && 'justify-center px-0')}>
          <div className="w-7 h-7 bg-brand-600 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0">
            {user?.profile?.fullName?.[0]?.toUpperCase() || user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          {!sidebarCollapsed && (
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-[--text] truncate">
                {user?.profile?.fullName || user?.name || 'User'}
              </div>
              <div className="text-xs text-[--text-subtle] truncate">
                {user?.profile?.role || 'Freelancer'}
              </div>
            </div>
          )}
        </div>

        <button
          onClick={handleLogout}
          className={cn('sidebar-link w-full text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20', sidebarCollapsed && 'justify-center px-0')}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!sidebarCollapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}

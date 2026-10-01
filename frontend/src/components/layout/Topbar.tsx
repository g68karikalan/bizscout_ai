import { Bell, Sun, Moon, Monitor, ChevronDown } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { cn } from '../../lib/utils';
import { apiClient } from '../../lib/api';

export function Topbar() {
  const { user, theme, setTheme, logout } = useAppStore();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);

  const handleLogout = async () => {
    try { await apiClient.post('/auth/logout'); } catch { /* ignore */ }
    logout();
    navigate('/login');
  };

  const themes = [
    { value: 'light' as const, icon: Sun, label: 'Light' },
    { value: 'dark' as const, icon: Moon, label: 'Dark' },
    { value: 'system' as const, icon: Monitor, label: 'System' },
  ];

  const ThemeIcon = themes.find((t) => t.value === theme)?.icon || Monitor;

  return (
    <header className="h-16 border-b border-[--border] bg-[--surface] px-4 sm:px-6 flex items-center justify-between gap-4 shrink-0 sticky top-0 z-30">
      {/* Left: page context */}
      <div className="flex-1 min-w-0" />

      {/* Right: actions */}
      <div className="flex items-center gap-2">
        {/* Theme toggle */}
        <div className="relative hidden sm:block">
          <div className="flex items-center gap-0.5 p-1 bg-[--surface-2] rounded-xl">
            {themes.map(({ value, icon: Icon }) => (
              <button
                key={value}
                onClick={() => setTheme(value)}
                className={cn(
                  'p-1.5 rounded-lg transition-all',
                  theme === value
                    ? 'bg-[--surface] shadow-sm text-[--text]'
                    : 'text-[--text-muted] hover:text-[--text]'
                )}
                title={value}
              >
                <Icon className="w-3.5 h-3.5" />
              </button>
            ))}
          </div>
        </div>

        {/* Notifications placeholder */}
        <button className="btn-ghost btn-sm !p-2 relative" aria-label="Notifications">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-brand-500 rounded-full" />
        </button>

        {/* Profile dropdown */}
        <div className="relative">
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-xl hover:bg-[--surface-2] transition-all"
          >
            <div className="w-7 h-7 bg-brand-600 rounded-lg flex items-center justify-center text-white text-xs font-bold">
              {user?.profile?.fullName?.[0]?.toUpperCase() || user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <span className="hidden sm:block text-sm font-medium text-[--text] max-w-24 truncate">
              {user?.profile?.fullName || user?.name || 'User'}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-[--text-muted]" />
          </button>

          {profileOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
              <div className="absolute right-0 top-full mt-2 w-52 bg-[--surface] border border-[--border] rounded-2xl shadow-xl z-50 py-1.5 animate-slide-up">
                <div className="px-4 py-2.5 border-b border-[--border]">
                  <div className="text-sm font-medium text-[--text] truncate">
                    {user?.profile?.fullName || user?.name}
                  </div>
                  <div className="text-xs text-[--text-muted] truncate">
                    {user?.profile?.role || 'Freelancer'}
                  </div>
                </div>
                <button
                  onClick={() => { navigate('/settings'); setProfileOpen(false); }}
                  className="w-full text-left px-4 py-2 text-sm text-[--text-muted] hover:bg-[--surface-2] hover:text-[--text] transition-colors"
                >
                  Settings
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  Logout
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

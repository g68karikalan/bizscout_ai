import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Search, Users, BarChart2, Settings } from 'lucide-react';
import { cn } from '../../lib/utils';

const MOBILE_NAV = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Home' },
  { to: '/find-leads', icon: Search, label: 'Search' },
  { to: '/leads', icon: Users, label: 'Leads' },
  { to: '/analytics', icon: BarChart2, label: 'Analytics' },
  { to: '/settings', icon: Settings, label: 'Profile' },
];

export function MobileNav() {
  const location = useLocation();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-[--surface] border-t border-[--border] flex items-center z-40">
      {MOBILE_NAV.map(({ to, icon: Icon, label }) => {
        const active = location.pathname === to || (to !== '/dashboard' && location.pathname.startsWith(to));
        return (
          <Link
            key={to}
            to={to}
            className={cn(
              'flex-1 flex flex-col items-center justify-center gap-1 py-2 transition-colors',
              active ? 'text-brand-600 dark:text-brand-400' : 'text-[--text-muted]'
            )}
          >
            <Icon className="w-5 h-5" />
            <span className="text-xs font-medium">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

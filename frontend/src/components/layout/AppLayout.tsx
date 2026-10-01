import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { MobileNav } from './MobileNav';
import { useAppStore } from '../../stores/appStore';
import { cn } from '../../lib/utils';

export function AppLayout() {
  const { sidebarCollapsed } = useAppStore();

  return (
    <div className="min-h-screen flex bg-[--bg]">
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Main content */}
      <div
        className={cn(
          'flex-1 flex flex-col min-w-0 transition-all duration-200',
          sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'
        )}
      >
        <Topbar />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-20 lg:pb-8 max-w-[1440px] w-full mx-auto">
          <div className="page-enter">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <MobileNav />
    </div>
  );
}

import { Outlet, Link } from 'react-router-dom';
import { Radar } from 'lucide-react';

export function AuthLayout() {
  return (
    <div className="min-h-screen bg-[--bg] flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-brand-800 to-brand-950 relative overflow-hidden flex-col justify-between p-12">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-brand-300 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur">
              <Radar className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white">BizScout AI</span>
          </Link>
        </div>

        <div className="relative z-10 space-y-6">
          <div className="space-y-3">
            <h1 className="text-4xl font-bold text-white leading-tight">
              Find local businesses that actually need your service.
            </h1>
            <p className="text-brand-200 text-lg leading-relaxed">
              AI-powered lead discovery, scoring, and outreach — all in one workspace.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Lead Score', value: '87/100', color: 'text-emerald-300' },
              { label: 'Businesses Found', value: '2,400+', color: 'text-brand-200' },
              { label: 'Contact Rate', value: '64%', color: 'text-yellow-300' },
              { label: 'Avg. Response', value: '3.2 days', color: 'text-cyan-300' },
            ].map((stat) => (
              <div key={stat.label} className="bg-white/5 rounded-2xl p-4 backdrop-blur border border-white/10">
                <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
                <div className="text-xs text-brand-300 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 text-sm text-brand-400">
          © 2024 BizScout AI. Built for freelancers and agencies.
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-16 xl:px-24">
        {/* Mobile logo */}
        <div className="lg:hidden mb-8">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand-600 rounded-xl flex items-center justify-center">
              <Radar className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold text-[--text]">BizScout AI</span>
          </Link>
        </div>
        <div className="max-w-md w-full mx-auto">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

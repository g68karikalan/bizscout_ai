import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Users, Flame, MessageSquare, TrendingUp, Trophy, BarChart3,
  Search, Upload, Download, Zap, ArrowUpRight, ArrowDownRight,
  Activity, Sparkles,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, FunnelChart, Funnel, LabelList,
} from 'recharts';
import { apiClient } from '../lib/api';
import { useAppStore } from '../stores/appStore';
import { formatDate, scoreColor, statusConfig, cn } from '../lib/utils';

interface DashboardStats {
  total: number;
  hot: number;
  newLeads?: number;
  searches?: number;
  contacted: number;
  replied: number;
  won: number;
  conversionRate: number;
  byCategory: Record<string, number>;
  leadsOverTime: { date: string; count: number }[];
  recentLeads: any[];
  recentActivities?: { id: string; activityType: string; createdAt: string; metadata?: any }[];
}

function StatCard({
  title, value, icon: Icon, color = 'brand', trend, trendLabel,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  color?: string;
  trend?: 'up' | 'down';
  trendLabel?: string;
}) {
  const colorMap: Record<string, string> = {
    brand: 'bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-400',
    emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
    yellow: 'bg-yellow-50 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400',
    cyan: 'bg-cyan-50 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400',
    violet: 'bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400',
    red: 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  };

  return (
    <div className="stat-card">
      <div className="flex items-start justify-between">
        <div className={cn('p-2.5 rounded-xl', colorMap[color])}>
          <Icon className="w-4 h-4" />
        </div>
        {trend && trendLabel && (
          <div className={cn('flex items-center gap-1 text-xs font-medium', trend === 'up' ? 'text-emerald-600' : 'text-red-500')}>
            {trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {trendLabel}
          </div>
        )}
      </div>
      <div>
        <div className="text-2xl font-bold text-[--text] mt-3">{value}</div>
        <div className="text-xs text-[--text-muted] mt-0.5">{title}</div>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="stat-card">
      <div className="skeleton h-9 w-9 rounded-xl" />
      <div className="mt-3 space-y-2">
        <div className="skeleton h-7 w-16 rounded-lg" />
        <div className="skeleton h-3 w-24 rounded" />
      </div>
    </div>
  );
}

export function DashboardPage() {
  const { user } = useAppStore();
  const firstName = (user?.profile?.fullName || user?.name || 'there').split(' ')[0];

  const { data, isLoading, error } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const res = await apiClient.get('/dashboard/stats');
      return res.data.data;
    },
  });

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const categoryChartData = data?.byCategory
    ? Object.entries(data.byCategory)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 7)
        .map(([name, count]) => ({ name, count }))
    : [];

  const funnelData = data
    ? [
        { name: 'Found', value: data.total, fill: '#6071f3' },
        { name: 'Contacted', value: data.contacted, fill: '#818cf8' },
        { name: 'Replied', value: data.replied, fill: '#a5b4fc' },
        { name: 'Won', value: data.won, fill: '#c7d5fd' },
      ]
    : [];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[--text]">
            {greeting}, {firstName} 👋
          </h1>
          <p className="text-sm text-[--text-muted] mt-1">
            Find and convert better local business opportunities.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/find-leads" className="btn btn-primary btn-md">
            <Search className="w-4 h-4" />
            Find Leads
          </Link>
          <Link to="/exports" className="btn btn-secondary btn-md hidden sm:flex">
            <Download className="w-4 h-4" />
            Export
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <StatCard title="Total Leads" value={data?.total || 0} icon={Users} color="brand" />
            <StatCard title="New Leads" value={data?.newLeads ?? data?.total ?? 0} icon={Sparkles} color="cyan" />
            <StatCard title="Hot Leads" value={data?.hot || 0} icon={Flame} color="red" />
            <StatCard title="Searches" value={data?.searches || 0} icon={Search} color="yellow" />
            <StatCard title="Contacted" value={data?.contacted || 0} icon={MessageSquare} color="emerald" />
            <StatCard
              title="Conversion Rate"
              value={`${data?.conversionRate || 0}%`}
              icon={BarChart3}
              color="violet"
            />
          </>
        )}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Leads over time */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-[--text] mb-4">Leads discovered</h3>
          {isLoading ? (
            <div className="skeleton h-48 rounded-xl" />
          ) : data && data.leadsOverTime.some((d) => d.count > 0) ? (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={data.leadsOverTime}>
                <defs>
                  <linearGradient id="leadGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6071f3" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#6071f3" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-subtle)' }} tickLine={false} axisLine={false} tickFormatter={(d) => d.slice(5)} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-subtle)' }} tickLine={false} axisLine={false} width={25} />
                <Tooltip
                  contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', fontSize: '12px' }}
                  labelStyle={{ color: 'var(--text)' }}
                />
                <Area type="monotone" dataKey="count" stroke="#6071f3" strokeWidth={2} fill="url(#leadGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-sm text-[--text-muted]">
              No lead data yet — start a search!
            </div>
          )}
        </div>

        {/* By category */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-[--text] mb-4">Leads by category</h3>
          {isLoading ? (
            <div className="skeleton h-48 rounded-xl" />
          ) : categoryChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={categoryChartData} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--text-subtle)' }} tickLine={false} axisLine={false} />
                <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', fontSize: '12px' }}
                />
                <Bar dataKey="count" fill="#6071f3" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-sm text-[--text-muted]">
              No category data yet
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions + Recent Leads */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Quick Actions */}
        <div className="card p-5 space-y-3">
          <h3 className="text-sm font-semibold text-[--text]">Quick actions</h3>
          <div className="space-y-2">
            {[
              { to: '/find-leads', icon: Search, label: 'Find new leads', desc: 'Search local businesses', color: 'brand' },
              { to: '/exports', icon: Download, label: 'Export leads', desc: 'CSV or Excel', color: 'emerald' },
              { to: '/campaigns', icon: Zap, label: 'Start campaign', desc: 'Organize your outreach', color: 'yellow' },
            ].map(({ to, icon: Icon, label, desc, color }) => (
              <Link
                key={to}
                to={to}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-[--surface-2] transition-all group"
              >
                <div className={cn(
                  'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                  color === 'brand' ? 'bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-400' :
                  color === 'emerald' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' :
                  'bg-yellow-50 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400'
                )}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-[--text] group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">{label}</div>
                  <div className="text-xs text-[--text-muted]">{desc}</div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-[--text-subtle] opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Leads */}
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[--text]">Recent leads</h3>
            <Link to="/leads" className="text-xs text-brand-600 dark:text-brand-400 hover:underline">
              View all →
            </Link>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="skeleton h-8 w-8 rounded-lg" />
                  <div className="flex-1 space-y-1.5">
                    <div className="skeleton h-3.5 w-32 rounded" />
                    <div className="skeleton h-3 w-20 rounded" />
                  </div>
                  <div className="skeleton h-6 w-12 rounded-lg" />
                </div>
              ))}
            </div>
          ) : !data || data.recentLeads.length === 0 ? (
            <div className="empty-state py-12">
              <Search className="w-10 h-10 text-[--text-subtle] mx-auto mb-3" />
              <p className="text-sm font-medium text-[--text]">No leads yet</p>
              <p className="text-xs text-[--text-muted] mt-1">Start your first local business search.</p>
              <Link to="/find-leads" className="btn btn-primary btn-sm mt-4">
                Find your first 10 leads
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-[--border]">
              {data.recentLeads.map((lead) => {
                const { label, className } = statusConfig(lead.status);
                return (
                  <Link
                    key={lead.id}
                    to={`/leads/${lead.id}`}
                    className="flex items-center gap-3 py-3 first:pt-0 last:pb-0 hover:opacity-80 transition-opacity"
                  >
                    <div className="w-8 h-8 bg-[--surface-2] rounded-lg flex items-center justify-center text-xs font-bold text-[--text-muted] shrink-0">
                      {lead.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-[--text] truncate">{lead.name}</div>
                      <div className="text-xs text-[--text-muted] truncate">{lead.category} · {lead.city}</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={cn('badge text-xs hidden sm:inline-flex', className)}>{label}</span>
                      <span className={cn('text-xs font-semibold', scoreColor(lead.leadScore))}>
                        {lead.leadScore}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity Feed */}
      {data?.recentActivities && data.recentActivities.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-brand-600 dark:text-brand-400" />
            <h3 className="text-sm font-semibold text-[--text]">Recent activity</h3>
          </div>
          <div className="divide-y divide-[--border]">
            {data.recentActivities.map((act) => (
              <div key={act.id} className="py-2.5 flex items-center justify-between text-xs">
                <span className="text-[--text] font-medium capitalize">
                  {act.activityType.replace(/_/g, ' ')}
                  {act.metadata?.location ? ` in ${act.metadata.location}` : ''}
                  {act.metadata?.businessName ? ` (${act.metadata.businessName})` : ''}
                </span>
                <span className="text-[--text-muted]">
                  {formatDate(act.createdAt)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Funnel, FunnelChart, LabelList,
} from 'recharts';
import { BarChart2 } from 'lucide-react';
import { apiClient } from '../lib/api';
import { cn } from '../lib/utils';

const PERIODS = [
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: '90d', label: '90 days' },
];

const PIE_COLORS = ['#6071f3', '#818cf8', '#a5b4fc', '#c7d5fd', '#e0e9ff', '#3e46cc', '#333ba4'];

export function AnalyticsPage() {
  const [period, setPeriod] = useState('30d');

  const { data, isLoading } = useQuery({
    queryKey: ['analytics', period],
    queryFn: async () => {
      const res = await apiClient.get(`/analytics?period=${period}`);
      return res.data.data;
    },
  });

  const bucketData: { range: string; count: number }[] = data?.scoreBuckets
    ? Object.entries(data.scoreBuckets).map(([range, count]) => ({ range, count: Number(count) }))
    : [];

  const categoryData = data?.byCategory
    ? Object.entries(data.byCategory)
        .sort((a, b) => (b[1] as number) - (a[1] as number))
        .slice(0, 8)
        .map(([name, value]) => ({ name, value }))
    : [];

  const funnelData = data?.funnel
    ? [
        { name: 'Found', value: data.funnel.found, fill: '#6071f3' },
        { name: 'Contacted', value: data.funnel.contacted, fill: '#818cf8' },
        { name: 'Replied', value: data.funnel.replied, fill: '#a5b4fc' },
        { name: 'Converted', value: data.funnel.converted, fill: '#c7d5fd' },
      ]
    : [];

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[--text]">Analytics</h1>
          <p className="text-sm text-[--text-muted] mt-0.5">Track your lead generation performance</p>
        </div>
        <div className="flex items-center gap-1 p-1 bg-[--surface-2] rounded-xl">
          {PERIODS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setPeriod(value)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                period === value ? 'bg-[--surface] text-[--text] shadow-sm' : 'text-[--text-muted] hover:text-[--text]'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats cards */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton h-24 rounded-2xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {[
            { label: 'Total', value: data?.totals?.total || 0, color: 'text-[--text]' },
            { label: 'This period', value: data?.totals?.newThisPeriod || 0, color: 'text-brand-600 dark:text-brand-400' },
            { label: 'Contacted', value: data?.totals?.contacted || 0, color: 'text-yellow-600 dark:text-yellow-400' },
            { label: 'Replied', value: data?.totals?.replied || 0, color: 'text-cyan-600 dark:text-cyan-400' },
            { label: 'Won', value: data?.totals?.won || 0, color: 'text-emerald-600 dark:text-emerald-400' },
            { label: 'Hot leads', value: data?.totals?.hot || 0, color: 'text-red-500' },
          ].map(({ label, value, color }) => (
            <div key={label} className="stat-card">
              <div className={cn('text-2xl font-bold', color)}>{value}</div>
              <div className="text-xs text-[--text-muted]">{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Acquisition trend */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-[--text] mb-4">Lead acquisition trend</h3>
          {isLoading ? (
            <div className="skeleton h-48 rounded-xl" />
          ) : data?.acquisitionTrend?.some((d: any) => d.count > 0) ? (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={data.acquisitionTrend}>
                <defs>
                  <linearGradient id="analyticsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6071f3" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#6071f3" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-subtle)' }} tickLine={false} axisLine={false} tickFormatter={(d) => d.slice(5)} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10, fill: 'var(--text-subtle)' }} tickLine={false} axisLine={false} width={25} />
                <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', fontSize: '12px' }} />
                <Area type="monotone" dataKey="count" stroke="#6071f3" strokeWidth={2} fill="url(#analyticsGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-sm text-[--text-muted]">No data for this period</div>
          )}
        </div>

        {/* Score distribution */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-[--text] mb-4">Lead score distribution</h3>
          {isLoading ? (
            <div className="skeleton h-48 rounded-xl" />
          ) : bucketData.some((d) => d.count > 0) ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={bucketData}>
                <XAxis dataKey="range" tick={{ fontSize: 10, fill: 'var(--text-subtle)' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--text-subtle)' }} tickLine={false} axisLine={false} width={25} />
                <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', fontSize: '12px' }} />
                <Bar dataKey="count" fill="#6071f3" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-sm text-[--text-muted]">No leads yet</div>
          )}
        </div>

        {/* Category breakdown */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-[--text] mb-4">Leads by category</h3>
          {isLoading ? (
            <div className="skeleton h-48 rounded-xl" />
          ) : categoryData.length > 0 ? (
            <div className="flex gap-4">
              <ResponsiveContainer width="50%" height={180}>
                <PieChart>
                  <Pie data={categoryData} cx="50%" cy="50%" outerRadius={70} dataKey="value" strokeWidth={2} stroke="var(--surface)">
                    {categoryData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-1.5 self-center">
                {categoryData.slice(0, 6).map((item, i) => (
                  <div key={item.name} className="flex items-center gap-2 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="text-[--text-muted] truncate flex-1">{item.name}</span>
                    <span className="text-[--text] font-medium">{item.value as number}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-sm text-[--text-muted]">No data</div>
          )}
        </div>

        {/* Conversion funnel */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-[--text] mb-4">Conversion funnel</h3>
          {isLoading ? (
            <div className="skeleton h-48 rounded-xl" />
          ) : data?.funnel ? (
            <div className="space-y-3">
              {funnelData.map((item, i) => {
                const maxVal = funnelData[0]?.value || 1;
                const pct = maxVal > 0 ? Math.round((item.value / maxVal) * 100) : 0;
                return (
                  <div key={item.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[--text-muted]">{item.name}</span>
                      <span className="font-semibold text-[--text]">{item.value} ({pct}%)</span>
                    </div>
                    <div className="h-2.5 bg-[--surface-2] rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: item.fill }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-sm text-[--text-muted]">No funnel data</div>
          )}
        </div>
      </div>

      {data?.totals?.total === 0 && !isLoading && (
        <div className="empty-state card p-16">
          <BarChart2 className="w-12 h-12 text-[--text-subtle] mb-4" />
          <p className="text-base font-semibold text-[--text]">No analytics data yet</p>
          <p className="text-sm text-[--text-muted] mt-1">Analytics will appear after you start adding leads.</p>
        </div>
      )}
    </div>
  );
}

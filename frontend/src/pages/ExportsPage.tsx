import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, FileText, AlertCircle, Loader2, CheckCircle } from 'lucide-react';
import { apiClient } from '../lib/api';
import { LEAD_STATUSES, downloadCSV, cn } from '../lib/utils';

export function ExportsPage() {
  const [format, setFormat] = useState<'csv' | 'xlsx'>('csv');
  const [statusFilter, setStatusFilter] = useState('');
  const [minScore, setMinScore] = useState('');
  const [exporting, setExporting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const { data: statsData } = useQuery({
    queryKey: ['export-stats'],
    queryFn: async () => {
      const res = await apiClient.get('/dashboard/stats');
      return res.data.data;
    },
  });

  const handleExport = async () => {
    setExporting(true);
    setError('');
    setSuccess(false);

    try {
      const filters: any = {};
      if (statusFilter) filters.status = statusFilter;
      if (minScore) filters.minScore = parseInt(minScore);

      const res = await apiClient.post('/exports/csv', { format: 'csv', filters }, { responseType: 'text' });
      downloadCSV(res.data, `bizscout-leads-${new Date().toISOString().split('T')[0]}.csv`);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      setError('Export failed. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-5 animate-fade-in max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-[--text]">Export Leads</h1>
        <p className="text-sm text-[--text-muted] mt-0.5">Download your leads in CSV or Excel format</p>
      </div>

      <div className="card p-6 space-y-5">
        {/* Format */}
        <div>
          <label className="label">Export format</label>
          <div className="flex gap-3">
            {(['csv', 'xlsx'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFormat(f)}
                className={cn(
                  'flex items-center gap-2.5 px-4 py-3 rounded-xl border transition-all',
                  format === f ? 'bg-brand-600 text-white border-brand-600' : 'border-[--border] text-[--text-muted] hover:border-brand-400 hover:text-[--text]'
                )}
              >
                <FileText className="w-4 h-4" />
                <div className="text-left">
                  <div className="text-sm font-medium uppercase">{f}</div>
                  <div className="text-xs opacity-75">{f === 'csv' ? 'Universal' : 'Excel'}</div>
                </div>
              </button>
            ))}
          </div>
          {format === 'xlsx' && (
            <p className="mt-2 text-xs text-[--text-muted] bg-[--surface-2] px-3 py-2 rounded-lg">
              ⚠️ XLSX export uses CSV format in this version. Full Excel support coming soon.
            </p>
          )}
        </div>

        {/* Filters */}
        <div className="space-y-3">
          <label className="label">Filters (optional)</label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label text-xs">Status</label>
              <select className="input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="">All statuses</option>
                {LEAD_STATUSES.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label text-xs">Minimum score</label>
              <input
                type="number"
                className="input"
                placeholder="0"
                min="0"
                max="100"
                value={minScore}
                onChange={(e) => setMinScore(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="p-4 bg-[--surface-2] rounded-xl">
          <div className="text-sm text-[--text-muted]">
            Exporting from workspace: <span className="font-semibold text-[--text]">{statsData?.total || 0} leads</span>
          </div>
          <div className="text-xs text-[--text-subtle] mt-1">
            Columns: Business, Category, Location, Phone, Email, Website, Instagram, Facebook, Rating, Score, Status, Notes, Source, Date
          </div>
        </div>

        {/* Status messages */}
        {error && (
          <div className="flex items-center gap-2 p-3.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-600 dark:text-red-400">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 p-3.5 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl text-sm text-emerald-600 dark:text-emerald-400">
            <CheckCircle className="w-4 h-4 shrink-0" />
            Export downloaded successfully!
          </div>
        )}

        {/* Export button */}
        <button
          onClick={handleExport}
          disabled={exporting || (statsData?.total || 0) === 0}
          className="btn btn-primary btn-lg w-full"
        >
          {exporting ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Exporting...</>
          ) : (
            <><Download className="w-4 h-4" /> Export {statsData?.total || 0} leads as {format.toUpperCase()}</>
          )}
        </button>

        {(statsData?.total || 0) === 0 && (
          <p className="text-xs text-center text-[--text-subtle]">No leads to export. Find some leads first.</p>
        )}
      </div>
    </div>
  );
}

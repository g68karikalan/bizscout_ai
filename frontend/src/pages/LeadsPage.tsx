import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search, Filter, ChevronDown, Users, ArrowUpDown,
  Phone, Globe, Star, Trash2, Download, CheckSquare, MoreHorizontal,
} from 'lucide-react';
import { Instagram } from '../components/ui/SocialIcons';
import { apiClient } from '../lib/api';
import {
  cn, formatDate, scoreColor, scoreBgColor, scoreLabel,
  statusConfig, LEAD_STATUSES,
} from '../lib/utils';
import { debounce } from '../lib/debounce';

interface Lead {
  id: string;
  name: string;
  category: string;
  city?: string;
  state?: string;
  phone?: string;
  email?: string;
  website?: string;
  instagramUrl?: string;
  rating?: number;
  reviewCount?: number;
  leadScore: number;
  status: string;
  createdAt: string;
}

export function LeadsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [minScore, setMinScore] = useState('');
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const debouncedSetSearch = useCallback(
    debounce((val: string) => setDebouncedSearch(val), 400),
    []
  );

  const handleSearch = (val: string) => {
    setSearch(val);
    debouncedSetSearch(val);
    setPage(1);
  };

  const { data, isLoading } = useQuery({
    queryKey: ['leads', debouncedSearch, statusFilter, minScore, page, sortBy, sortOrder],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '25',
        sortBy,
        sortOrder,
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(statusFilter && { status: statusFilter }),
        ...(minScore && { minScore }),
      });
      const res = await apiClient.get(`/leads?${params}`);
      return res.data.data;
    },
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: async ({ ids, status }: { ids: string[]; status: string }) => {
      await apiClient.post('/leads/bulk-update', { ids, status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      setSelected(new Set());
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await apiClient.post('/leads/bulk-delete', { ids });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      setSelected(new Set());
    },
  });

  const leads: Lead[] = data?.leads || [];
  const pagination = data?.pagination;

  const toggleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === leads.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(leads.map((l) => l.id)));
    }
  };

  const handleBulkUpdate = () => {
    if (!bulkStatus || selected.size === 0) return;
    bulkUpdateMutation.mutate({ ids: Array.from(selected), status: bulkStatus });
  };

  const handleBulkDelete = () => {
    if (selected.size === 0) return;
    if (window.confirm(`Archive ${selected.size} leads? This can be undone.`)) {
      bulkDeleteMutation.mutate(Array.from(selected));
    }
  };

  const exportSelected = async () => {
    try {
      const res = await apiClient.post('/exports/csv', {}, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `leads-${Date.now()}.csv`;
      a.click();
    } catch { /* show error */ }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[--text]">All Leads</h1>
          <p className="text-sm text-[--text-muted] mt-0.5">
            {pagination?.total || 0} total leads
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/find-leads" className="btn btn-primary btn-md">
            <Search className="w-4 h-4" />
            Find more
          </Link>
          <button onClick={exportSelected} className="btn btn-secondary btn-md">
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="card p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[--text-muted]" />
            <input
              className="input pl-9"
              placeholder="Search by name, city, category..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn('btn btn-secondary btn-md', showFilters && 'bg-brand-50 text-brand-600 border-brand-300 dark:bg-brand-950 dark:text-brand-400')}
          >
            <Filter className="w-4 h-4" />
            Filters
          </button>
        </div>

        {showFilters && (
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <select
              className="input w-40 py-2"
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            >
              <option value="">All statuses</option>
              {LEAD_STATUSES.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>

            <div className="flex items-center gap-2">
              <label className="text-xs text-[--text-muted] whitespace-nowrap">Min score</label>
              <input
                type="number"
                className="input w-20 py-2 text-sm"
                placeholder="0"
                min="0"
                max="100"
                value={minScore}
                onChange={(e) => { setMinScore(e.target.value); setPage(1); }}
              />
            </div>

            {(statusFilter || minScore || debouncedSearch) && (
              <button
                onClick={() => { setStatusFilter(''); setMinScore(''); setSearch(''); setDebouncedSearch(''); setPage(1); }}
                className="text-xs text-[--text-muted] hover:text-[--text] underline"
              >
                Clear filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Bulk actions bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 p-3.5 bg-brand-50 dark:bg-brand-950 border border-brand-200 dark:border-brand-800 rounded-xl">
          <CheckSquare className="w-4 h-4 text-brand-600 dark:text-brand-400" />
          <span className="text-sm font-medium text-brand-700 dark:text-brand-300">
            {selected.size} selected
          </span>
          <div className="flex items-center gap-2 ml-auto">
            <select
              className="input py-1.5 text-xs w-36"
              value={bulkStatus}
              onChange={(e) => setBulkStatus(e.target.value)}
            >
              <option value="">Update status...</option>
              {LEAD_STATUSES.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <button
              className="btn btn-sm btn-primary"
              onClick={handleBulkUpdate}
              disabled={!bulkStatus || bulkUpdateMutation.isPending}
            >
              Apply
            </button>
            <button
              className="btn btn-sm btn-danger"
              onClick={handleBulkDelete}
              disabled={bulkDeleteMutation.isPending}
            >
              <Trash2 className="w-3.5 h-3.5" />
              Archive
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-[--border] bg-[--surface-2]">
              <tr>
                <th className="table-header w-10">
                  <input
                    type="checkbox"
                    className="accent-brand-600"
                    checked={selected.size === leads.length && leads.length > 0}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th className="table-header">Business</th>
                <th className="table-header hidden sm:table-cell">Category</th>
                <th className="table-header hidden md:table-cell">Contact</th>
                <th className="table-header hidden lg:table-cell">
                  <button className="flex items-center gap-1" onClick={() => toggleSort('rating')}>
                    Rating <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="table-header">
                  <button className="flex items-center gap-1" onClick={() => toggleSort('leadScore')}>
                    Score <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="table-header">Status</th>
                <th className="table-header hidden xl:table-cell">
                  <button className="flex items-center gap-1" onClick={() => toggleSort('createdAt')}>
                    Added <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="table-header w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[--border]">
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="table-cell"><div className="skeleton h-4 w-24 rounded" /></td>
                    ))}
                  </tr>
                ))
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={9}>
                    <div className="empty-state py-16">
                      <Users className="w-10 h-10 text-[--text-subtle] mb-3" />
                      <p className="text-sm font-medium text-[--text]">No leads found</p>
                      <p className="text-xs text-[--text-muted] mt-1">
                        {debouncedSearch || statusFilter || minScore ? 'Try adjusting your filters.' : 'Start your first lead search.'}
                      </p>
                      {!debouncedSearch && !statusFilter && !minScore && (
                        <Link to="/find-leads" className="btn btn-primary btn-sm mt-4">
                          Find leads
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                leads.map((lead) => {
                  const { label: statusLabel, className: statusClass } = statusConfig(lead.status);
                  return (
                    <tr key={lead.id} className="hover:bg-[--surface-2] transition-colors">
                      <td className="table-cell">
                        <input
                          type="checkbox"
                          className="accent-brand-600"
                          checked={selected.has(lead.id)}
                          onChange={() => toggleSelect(lead.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </td>
                      <td className="table-cell">
                        <Link to={`/leads/${lead.id}`} className="font-medium text-[--text] hover:text-brand-600 dark:hover:text-brand-400 transition-colors">
                          {lead.name}
                        </Link>
                        <div className="text-xs text-[--text-muted]">{lead.city}</div>
                      </td>
                      <td className="table-cell hidden sm:table-cell">
                        <span className="text-xs bg-[--surface-2] px-2.5 py-1 rounded-lg text-[--text-muted]">
                          {lead.category}
                        </span>
                      </td>
                      <td className="table-cell hidden md:table-cell">
                        <div className="flex items-center gap-1.5">
                          {lead.phone && <span title="Has phone"><Phone className="w-3.5 h-3.5 text-brand-500" /></span>}
                          {lead.website && <span title="Has website"><Globe className="w-3.5 h-3.5 text-brand-500" /></span>}
                          {lead.instagramUrl && <span title="Has Instagram"><Instagram className="w-3.5 h-3.5 text-brand-500" /></span>}
                        </div>
                      </td>
                      <td className="table-cell hidden lg:table-cell">
                        {lead.rating ? (
                          <div className="flex items-center gap-1 text-xs">
                            <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                            {lead.rating.toFixed(1)}
                          </div>
                        ) : <span className="text-[--text-subtle] text-xs">—</span>}
                      </td>
                      <td className="table-cell">
                        <span className={cn('text-sm font-bold', scoreColor(lead.leadScore))}>
                          {lead.leadScore}
                        </span>
                      </td>
                      <td className="table-cell">
                        <span className={cn('badge', statusClass)}>{statusLabel}</span>
                      </td>
                      <td className="table-cell hidden xl:table-cell text-xs text-[--text-muted]">
                        {formatDate(lead.createdAt)}
                      </td>
                      <td className="table-cell">
                        <Link
                          to={`/leads/${lead.id}`}
                          className="btn btn-ghost btn-sm !p-1.5"
                          aria-label="View lead"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[--border]">
            <span className="text-xs text-[--text-muted]">
              Page {pagination.page} of {pagination.totalPages} · {pagination.total} total
            </span>
            <div className="flex items-center gap-2">
              <button
                className="btn btn-secondary btn-sm"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </button>
              <button
                className="btn btn-secondary btn-sm"
                disabled={page >= pagination.totalPages}
                onClick={() => setPage(page + 1)}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

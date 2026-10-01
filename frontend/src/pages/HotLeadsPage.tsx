import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Flame, Star, ArrowRight } from 'lucide-react';
import { apiClient } from '../lib/api';
import { cn, scoreColor, scoreBgColor, statusConfig } from '../lib/utils';

export function HotLeadsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['hot-leads'],
    queryFn: async () => {
      const res = await apiClient.get('/leads/hot');
      return res.data.data;
    },
  });

  const leads = data?.leads || [];
  const threshold = data?.threshold || 70;

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-red-50 dark:bg-red-900/30 rounded-xl">
          <Flame className="w-5 h-5 text-red-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[--text]">Hot Leads</h1>
          <p className="text-sm text-[--text-muted]">Leads with score ≥ {threshold} — highest priority opportunities</p>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton h-48 rounded-2xl" />
          ))}
        </div>
      ) : leads.length === 0 ? (
        <div className="empty-state card p-16">
          <Flame className="w-12 h-12 text-[--text-subtle] mb-4" />
          <p className="text-base font-semibold text-[--text]">No hot leads yet</p>
          <p className="text-sm text-[--text-muted] mt-1">Leads with a score of {threshold}+ will appear here.</p>
          <Link to="/find-leads" className="btn btn-primary btn-md mt-5">Find leads</Link>
        </div>
      ) : (
        <>
          <p className="text-sm text-[--text-muted]">{leads.length} high-priority leads</p>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {leads.map((lead: any) => {
              const { label: statusLabel, className: statusClass } = statusConfig(lead.status);
              return (
                <Link
                  key={lead.id}
                  to={`/leads/${lead.id}`}
                  className="card-hover p-5 space-y-3 block"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-semibold text-[--text]">{lead.name}</h3>
                      <p className="text-xs text-[--text-muted] mt-0.5">{lead.category} · {lead.city}</p>
                    </div>
                    <span className={cn('badge shrink-0', statusClass)}>{statusLabel}</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={cn('px-3 py-1.5 rounded-xl text-xs font-bold', scoreBgColor(lead.leadScore))}>
                      {lead.leadScore}/100
                    </span>
                    {lead.rating && (
                      <div className="flex items-center gap-1 text-xs text-[--text-muted]">
                        <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                        {lead.rating.toFixed(1)}
                      </div>
                    )}
                  </div>

                  {lead.opportunitySummary && (
                    <p className="text-xs text-[--text-muted] leading-relaxed line-clamp-2">
                      {lead.opportunitySummary}
                    </p>
                  )}

                  <div className="flex items-center justify-between pt-1">
                    <div className="flex gap-1.5 text-xs text-[--text-subtle]">
                      {lead.phone && <span>📞</span>}
                      {lead.email && <span>📧</span>}
                      {lead.website && <span>🌐</span>}
                      {lead.instagramUrl && <span>📸</span>}
                      {lead.whatsappUrl && <span>💬</span>}
                    </div>
                    <span className="text-xs text-brand-600 dark:text-brand-400 flex items-center gap-1">
                      View <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

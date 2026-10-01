import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Megaphone } from 'lucide-react';
import { apiClient } from '../lib/api';
import { SERVICE_TYPES, cn, statusConfig } from '../lib/utils';

export function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['campaign', id],
    queryFn: async () => {
      const res = await apiClient.get(`/campaigns/${id}`);
      return res.data.data.campaign;
    },
  });

  if (isLoading) return <div className="skeleton h-96 rounded-2xl" />;
  if (!data) return <div className="empty-state">Campaign not found</div>;

  const campaign = data;
  const serviceLabel = SERVICE_TYPES.find(s => s.value === campaign.serviceType)?.label || campaign.serviceType;

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center gap-2 text-sm text-[--text-muted]">
        <button onClick={() => navigate(-1)} className="btn btn-ghost btn-sm !px-2">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <span>Campaigns</span>
        <span>/</span>
        <span className="text-[--text] font-medium">{campaign.name}</span>
      </div>

      <div className="card p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-[--text]">{campaign.name}</h1>
            <p className="text-sm text-[--text-muted] mt-1">{serviceLabel}</p>
          </div>
          <span className={cn(
            'badge',
            campaign.status === 'active' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'badge-follow_up'
          )}>
            {campaign.status}
          </span>
        </div>

        {campaign.offerName && (
          <div className="p-4 bg-[--surface-2] rounded-xl">
            <div className="text-sm font-semibold text-[--text]">{campaign.offerName}</div>
            {campaign.offerPrice && <div className="text-sm text-[--text-muted]">₹{campaign.offerPrice}</div>}
          </div>
        )}

        {campaign.stats && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 pt-4 border-t border-[--border]">
            {[
              { label: 'Total Leads', value: campaign.stats.totalLeads },
              { label: 'Contacted', value: campaign.stats.contacted },
              { label: 'Replied', value: campaign.stats.replied },
              { label: 'Won', value: campaign.stats.won },
              { label: 'Response Rate', value: `${campaign.stats.responseRate}%` },
            ].map(({ label, value }) => (
              <div key={label} className="text-center p-3 bg-[--surface-2] rounded-xl">
                <div className="text-xl font-bold text-[--text]">{value}</div>
                <div className="text-xs text-[--text-muted] mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Leads in campaign */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-[--text] mb-4">Campaign leads</h3>
        {!campaign.leads || campaign.leads.length === 0 ? (
          <div className="empty-state py-10">
            <Megaphone className="w-8 h-8 text-[--text-subtle] mb-3" />
            <p className="text-sm text-[--text]">No leads in this campaign yet</p>
            <p className="text-xs text-[--text-muted] mt-1">Add leads from the All Leads page.</p>
          </div>
        ) : (
          <div className="divide-y divide-[--border]">
            {campaign.leads.map((lead: any) => {
              const { label, className } = statusConfig(lead.status);
              return (
                <div key={lead.id} className="py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-[--text]">{lead.name}</div>
                    <div className="text-xs text-[--text-muted]">{lead.category} · {lead.city}</div>
                  </div>
                  <span className={cn('badge', className)}>{label}</span>
                  <span className="text-sm font-bold text-[--text-muted]">{lead.leadScore}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

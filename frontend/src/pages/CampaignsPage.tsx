import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Megaphone, Plus, Loader2, X, TrendingUp } from 'lucide-react';
import { apiClient } from '../lib/api';
import { SERVICE_TYPES, cn } from '../lib/utils';

const campaignSchema = z.object({
  name: z.string().min(2, 'Campaign name required'),
  serviceType: z.string().min(1, 'Service required'),
  targetCategory: z.string().optional(),
  targetLocation: z.string().optional(),
  offerName: z.string().optional(),
  offerPrice: z.number().positive().optional(),
});
type CampaignForm = z.infer<typeof campaignSchema>;

export function CampaignsPage() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['campaigns'],
    queryFn: async () => {
      const res = await apiClient.get('/campaigns');
      return res.data.data.campaigns;
    },
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<CampaignForm>({
    resolver: zodResolver(campaignSchema),
    defaultValues: { serviceType: 'social_media_design' },
  });

  const createMutation = useMutation({
    mutationFn: async (data: CampaignForm) => {
      await apiClient.post('/campaigns', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      setShowModal(false);
      reset();
    },
  });

  const campaigns = data || [];

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[--text]">Campaigns</h1>
          <p className="text-sm text-[--text-muted] mt-0.5">Organize your outreach campaigns</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn btn-primary btn-md">
          <Plus className="w-4 h-4" />
          New Campaign
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-40 rounded-2xl" />)}
        </div>
      ) : campaigns.length === 0 ? (
        <div className="empty-state card p-16">
          <Megaphone className="w-12 h-12 text-[--text-subtle] mb-4" />
          <p className="text-base font-semibold text-[--text]">No campaigns yet</p>
          <p className="text-sm text-[--text-muted] mt-1">Create a campaign to organize your outreach.</p>
          <button onClick={() => setShowModal(true)} className="btn btn-primary btn-md mt-5">
            Create campaign
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {campaigns.map((c: any) => (
            <Link key={c.id} to={`/campaigns/${c.id}`} className="card-hover p-5 space-y-4 block">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-[--text]">{c.name}</h3>
                  <p className="text-xs text-[--text-muted] mt-0.5">
                    {SERVICE_TYPES.find(s => s.value === c.serviceType)?.label || c.serviceType}
                  </p>
                </div>
                <span className={cn(
                  'badge',
                  c.status === 'active' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' :
                  c.status === 'paused' ? 'badge-follow_up' : 'bg-gray-100 text-gray-600'
                )}>
                  {c.status}
                </span>
              </div>

              {(c.targetCategory || c.targetLocation) && (
                <div className="text-xs text-[--text-muted]">
                  {c.targetCategory} {c.targetLocation ? `· ${c.targetLocation}` : ''}
                </div>
              )}

              {c.offerName && (
                <div className="px-3 py-2 bg-[--surface-2] rounded-xl">
                  <div className="text-xs font-medium text-[--text]">{c.offerName}</div>
                  {c.offerPrice && <div className="text-xs text-[--text-muted]">₹{c.offerPrice}</div>}
                </div>
              )}

              {c.stats && (
                <div className="grid grid-cols-3 gap-2 pt-1 border-t border-[--border]">
                  {[
                    { label: 'Leads', value: c.stats.totalLeads },
                    { label: 'Contacted', value: c.stats.contacted },
                    { label: 'Won', value: c.stats.won },
                  ].map(({ label, value }) => (
                    <div key={label} className="text-center">
                      <div className="text-base font-bold text-[--text]">{value}</div>
                      <div className="text-xs text-[--text-muted]">{label}</div>
                    </div>
                  ))}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}

      {/* New Campaign Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="bg-[--surface] rounded-2xl p-6 w-full max-w-md shadow-xl animate-slide-up">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-[--text]">New Campaign</h2>
              <button onClick={() => setShowModal(false)} className="btn btn-ghost btn-sm !p-1.5">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="space-y-4">
              <div>
                <label className="label">Campaign name <span className="text-red-400">*</span></label>
                <input className="input" placeholder="Dindigul Salon Outreach" {...register('name')} />
                {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
              </div>

              <div>
                <label className="label">Service <span className="text-red-400">*</span></label>
                <select className="input" {...register('serviceType')}>
                  {SERVICE_TYPES.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Target category</label>
                  <input className="input" placeholder="Salon" {...register('targetCategory')} />
                </div>
                <div>
                  <label className="label">Target location</label>
                  <input className="input" placeholder="Dindigul" {...register('targetLocation')} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Offer name</label>
                  <input className="input" placeholder="₹999 Starter" {...register('offerName')} />
                </div>
                <div>
                  <label className="label">Price (₹)</label>
                  <input type="number" className="input" placeholder="999" {...register('offerPrice', { valueAsNumber: true })} />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowModal(false); reset(); }} className="btn btn-secondary btn-md flex-1">
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting || createMutation.isPending} className="btn btn-primary btn-md flex-1">
                  {createMutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</> : 'Create Campaign'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

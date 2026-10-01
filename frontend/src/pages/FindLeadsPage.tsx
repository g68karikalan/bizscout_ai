import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Search, MapPin, Tag, Hash, Filter, ChevronDown, Loader2,
  CheckCircle, Circle, AlertCircle, Wifi,
} from 'lucide-react';
import { apiClient } from '../lib/api';
import { useAppStore } from '../stores/appStore';
import { cn, CATEGORIES, SERVICE_TYPES } from '../lib/utils';
import { LeadCard } from '../components/leads/LeadCard';

const searchSchema = z.object({
  city: z.string().min(1, 'City is required'),
  state: z.string().optional(),
  country: z.string().min(1, 'Country is required'),
  category: z.string().min(1, 'Category is required'),
  limit: z.number().min(1).max(100),
  serviceType: z.string(),
  filters: z.object({
    minRating: z.number().optional(),
    minReviews: z.number().optional(),
    hasPhone: z.boolean().optional(),
    hasWebsite: z.boolean().optional(),
    onlyOpen: z.boolean().optional(),
  }).optional(),
});
type SearchForm = z.infer<typeof searchSchema>;

type SearchStage =
  | 'idle'
  | 'searching'
  | 'enriching'
  | 'analyzing'
  | 'saving'
  | 'completed'
  | 'failed';

const STAGE_LABELS: Record<string, string> = {
  queued: 'Queuing search...',
  searching: 'Searching local businesses...',
  enriching: 'Enriching contact information...',
  analyzing: 'Scoring and evaluating opportunities...',
  saving: 'Saving leads to your workspace...',
  completed: 'Done!',
  failed: 'Search failed',
};

const STAGE_ORDER = ['queued', 'searching', 'enriching', 'analyzing', 'saving', 'completed'];

export function FindLeadsPage() {
  const navigate = useNavigate();
  const { user } = useAppStore();
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<string>('idle');
  const [jobStage, setJobStage] = useState<string>('');
  const [results, setResults] = useState<any[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [customCategory, setCustomCategory] = useState('');
  const [error, setError] = useState('');

  const profile = user?.profile;

  const { register, handleSubmit, control, watch, setValue, formState: { errors } } = useForm<SearchForm>({
    resolver: zodResolver(searchSchema),
    defaultValues: {
      city: profile?.defaultCity || '',
      state: profile?.defaultState || '',
      country: profile?.defaultCountry || 'India',
      category: profile?.targetIndustries?.[0] || '',
      limit: 10,
      serviceType: profile?.services?.[0] || 'social_media_design',
    },
  });

  const pollJob = useCallback(async (id: string) => {
    let attempts = 0;
    const maxAttempts = 60; // 60s max

    const poll = async () => {
      try {
        const statusRes = await apiClient.get(`/search-jobs/${id}`);
        const { status, stage, error: jobError } = statusRes.data.data;

        setJobStatus(status);
        setJobStage(stage || STAGE_LABELS[status] || status);

        if (status === 'completed') {
          const resultsRes = await apiClient.get(`/search-jobs/${id}/results`);
          setResults(resultsRes.data.data.results || []);
          return;
        }

        if (status === 'failed') {
          setError(jobError || 'Search failed. Please try again.');
          return;
        }

        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 1500);
        } else {
          setError('Search timed out. Please try again.');
        }
      } catch {
        setError('Lost connection to server. Please try again.');
      }
    };

    poll();
  }, []);

  const onSubmit = async (data: SearchForm) => {
    setError('');
    setResults([]);
    setJobId(null);

    const categoryValue = customCategory || data.category;
    if (!categoryValue) {
      setError('Please enter or select a business category.');
      return;
    }

    try {
      const res = await apiClient.post('/leads/search', {
        ...data,
        category: categoryValue,
      });
      const { jobId: newJobId } = res.data.data;
      setJobId(newJobId);
      setJobStatus('queued');
      pollJob(newJobId);
    } catch (err: any) {
      const msg = err.response?.data?.error?.message;
      setError(msg || 'Unable to start search. Please try again.');
    }
  };

  const isRunning = jobStatus !== 'idle' && jobStatus !== 'completed' && jobStatus !== 'failed';
  const currentStageIndex = STAGE_ORDER.indexOf(jobStatus);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[--text]">Find Leads</h1>
        <p className="text-sm text-[--text-muted] mt-1">
          Search for local businesses and score them as potential clients.
        </p>
      </div>

      {/* Search form */}
      <form onSubmit={handleSubmit(onSubmit)} className="card p-6 space-y-5">
        {/* Row 1: Location */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="w-4 h-4 text-[--text-muted]" />
            <span className="text-sm font-semibold text-[--text]">Location</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="label">City <span className="text-red-400">*</span></label>
              <input className="input" placeholder="Dindigul" {...register('city')} />
              {errors.city && <p className="mt-1 text-xs text-red-500">{errors.city.message}</p>}
            </div>
            <div>
              <label className="label">State</label>
              <input className="input" placeholder="Tamil Nadu" {...register('state')} />
            </div>
            <div>
              <label className="label">Country <span className="text-red-400">*</span></label>
              <input className="input" placeholder="India" {...register('country')} />
              {errors.country && <p className="mt-1 text-xs text-red-500">{errors.country.message}</p>}
            </div>
          </div>
        </div>

        {/* Row 2: Category + Count + Service */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Tag className="w-4 h-4 text-[--text-muted]" />
              <span className="text-sm font-semibold text-[--text]">Category</span>
            </div>
            <select
              className="input"
              value={customCategory ? '__custom' : watch('category')}
              onChange={(e) => {
                if (e.target.value === '__custom') {
                  setCustomCategory('');
                  setValue('category', '');
                } else {
                  setCustomCategory('');
                  setValue('category', e.target.value);
                }
              }}
            >
              <option value="">Select category</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              <option value="__custom">Custom...</option>
            </select>
            {(watch('category') === '' || customCategory !== undefined) && (
              <input
                className="input mt-2"
                placeholder="Enter custom category"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
              />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2 mb-3">
              <Hash className="w-4 h-4 text-[--text-muted]" />
              <span className="text-sm font-semibold text-[--text]">Lead count</span>
            </div>
            <div className="flex gap-2 flex-wrap">
              {[10, 25, 50, 100].map((n) => (
                <Controller
                  key={n}
                  control={control}
                  name="limit"
                  render={({ field }) => (
                    <button
                      type="button"
                      onClick={() => field.onChange(n)}
                      className={cn(
                        'px-4 py-2 rounded-xl text-sm font-medium border transition-all',
                        field.value === n
                          ? 'bg-brand-600 text-white border-brand-600'
                          : 'border-[--border] text-[--text-muted] hover:border-brand-400 hover:text-[--text]'
                      )}
                    >
                      {n}
                    </button>
                  )}
                />
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-3">
              <Wifi className="w-4 h-4 text-[--text-muted]" />
              <span className="text-sm font-semibold text-[--text]">Service type</span>
            </div>
            <select className="input" {...register('serviceType')}>
              {SERVICE_TYPES.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Optional filters */}
        <div>
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-1.5 text-sm text-[--text-muted] hover:text-[--text] transition-colors"
          >
            <Filter className="w-4 h-4" />
            Optional filters
            <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', showFilters && 'rotate-180')} />
          </button>

          {showFilters && (
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 p-4 bg-[--surface-2] rounded-xl">
              <label className="flex items-center gap-2 text-sm text-[--text-muted] cursor-pointer">
                <input type="checkbox" className="accent-brand-600" {...register('filters.hasPhone')} />
                Has phone
              </label>
              <label className="flex items-center gap-2 text-sm text-[--text-muted] cursor-pointer">
                <input type="checkbox" className="accent-brand-600" {...register('filters.hasWebsite')} />
                Has website
              </label>
              <label className="flex items-center gap-2 text-sm text-[--text-muted] cursor-pointer">
                <input type="checkbox" className="accent-brand-600" {...register('filters.onlyOpen')} />
                Only open
              </label>
              <div>
                <label className="label text-xs">Min rating</label>
                <input type="number" step="0.5" min="0" max="5" className="input text-xs py-1.5" placeholder="4.0" {...register('filters.minRating', { valueAsNumber: true })} />
              </div>
              <div>
                <label className="label text-xs">Min reviews</label>
                <input type="number" min="0" className="input text-xs py-1.5" placeholder="20" {...register('filters.minReviews', { valueAsNumber: true })} />
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-600 dark:text-red-400">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isRunning}
          className="btn btn-primary btn-lg w-full sm:w-auto"
        >
          {isRunning ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Searching...</>
          ) : (
            <><Search className="w-4 h-4" /> Find Leads</>
          )}
        </button>
      </form>

      {/* Progress stages */}
      {jobStatus !== 'idle' && (
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-[--text] mb-4">Search progress</h3>
          <div className="space-y-3">
            {STAGE_ORDER.filter((s) => s !== 'queued').map((stage, i) => {
              const stageIdx = STAGE_ORDER.indexOf(stage);
              const done = currentStageIndex > stageIdx;
              const current = currentStageIndex === stageIdx;
              const failed = jobStatus === 'failed' && current;

              return (
                <div key={stage} className="flex items-center gap-3">
                  <div className="shrink-0">
                    {failed ? (
                      <AlertCircle className="w-5 h-5 text-red-500" />
                    ) : done ? (
                      <CheckCircle className="w-5 h-5 text-emerald-500" />
                    ) : current ? (
                      <Loader2 className="w-5 h-5 text-brand-500 animate-spin" />
                    ) : (
                      <Circle className="w-5 h-5 text-[--text-subtle]" />
                    )}
                  </div>
                  <span className={cn(
                    'text-sm',
                    done ? 'text-[--text]' : current ? 'text-brand-600 dark:text-brand-400 font-medium' : 'text-[--text-subtle]'
                  )}>
                    {STAGE_LABELS[stage]}
                  </span>
                  {current && jobStage && jobStage !== STAGE_LABELS[stage] && (
                    <span className="text-xs text-[--text-subtle] ml-1">({jobStage})</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-[--text]">
              {results.length} lead{results.length !== 1 ? 's' : ''} found
            </h3>
            <button
              onClick={() => navigate('/leads')}
              className="btn btn-secondary btn-sm"
            >
              View all leads →
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {results.map((lead) => (
              <LeadCard key={lead.id} lead={lead} />
            ))}
          </div>
        </div>
      )}

      {/* No results after complete */}
      {jobStatus === 'completed' && results.length === 0 && (
        <div className="empty-state card p-10">
          <Search className="w-10 h-10 text-[--text-subtle] mb-3" />
          <p className="text-sm font-medium text-[--text]">No results found</p>
          <p className="text-xs text-[--text-muted] mt-1">Try a different category or broader location.</p>
        </div>
      )}
    </div>
  );
}

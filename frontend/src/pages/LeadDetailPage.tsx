import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Phone, Globe, MessageCircle,
  Mail, Star, MapPin, ArrowLeft, Copy, ExternalLink,
  Wand2, Loader2, Edit3, CheckCircle, Target, AlertCircle,
} from 'lucide-react';
import { Instagram, Facebook, Linkedin, Youtube } from '../components/ui/SocialIcons';
import { apiClient } from '../lib/api';
import {
  cn, formatDate, scoreColor, scoreBgColor, scoreLabel,
  statusConfig, LEAD_STATUSES, SERVICE_TYPES, copyToClipboard,
} from '../lib/utils';

export function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'overview' | 'outreach' | 'activity'>('overview');
  const [outreachChannel, setOutreachChannel] = useState('whatsapp');
  const [outreachTone, setOutreachTone] = useState('friendly');
  const [outreachService, setOutreachService] = useState('social_media_design');
  const [generatedMessage, setGeneratedMessage] = useState('');
  const [editedMessage, setEditedMessage] = useState('');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<any>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['lead', id],
    queryFn: async () => {
      const res = await apiClient.get(`/leads/${id}`);
      return res.data.data.lead;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: any) => {
      await apiClient.patch(`/leads/${id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead', id] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });

  const generateOutreachMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post(`/leads/${id}/outreach`, {
        channel: outreachChannel,
        tone: outreachTone,
        serviceType: outreachService,
      });
      return res.data.data.message;
    },
    onSuccess: (message) => {
      setGeneratedMessage(message);
      setEditedMessage(message);
    },
  });

  const analyzeLeadMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post(`/leads/${id}/analyze`, {
        serviceType: outreachService,
      });
      return res.data.data.analysis;
    },
    onSuccess: (data) => setAnalysis(data),
  });

  const handleCopy = async (text: string, field: string) => {
    await copyToClipboard(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  if (isLoading) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="skeleton h-8 w-48 rounded-xl" />
        <div className="skeleton h-48 w-full rounded-2xl" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="skeleton h-48 rounded-2xl" />
          <div className="skeleton h-48 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="empty-state">
        <AlertCircle className="w-10 h-10 text-red-400 mb-3" />
        <p className="text-sm font-medium text-[--text]">Lead not found</p>
        <button onClick={() => navigate('/leads')} className="btn btn-secondary btn-md mt-4">
          Back to leads
        </button>
      </div>
    );
  }

  const lead = data;
  const { label: statusLabel, className: statusClass } = statusConfig(lead.status);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Back + breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-[--text-muted]">
        <button onClick={() => navigate(-1)} className="btn btn-ghost btn-sm !px-2">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <Link to="/leads" className="hover:text-[--text]">All Leads</Link>
        <span>/</span>
        <span className="text-[--text] font-medium truncate">{lead.name}</span>
      </div>

      {/* Header */}
      <div className="card p-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-[--text]">{lead.name}</h1>
              <span className={cn('badge', statusClass)}>{statusLabel}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-[--text-muted] flex-wrap">
              <span className="flex items-center gap-1"><Target className="w-3.5 h-3.5" />{lead.category}</span>
              {lead.city && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{lead.city}{lead.state ? `, ${lead.state}` : ''}</span>}
              {lead.rating && (
                <span className="flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                  {lead.rating.toFixed(1)} ({lead.reviewCount || 0} reviews)
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className={cn('px-4 py-2 rounded-xl text-sm font-bold', scoreBgColor(lead.leadScore))}>
              {lead.leadScore}/100 · {scoreLabel(lead.leadScore)}
            </div>
            <select
              className="input w-40 py-2 text-sm"
              value={lead.status}
              onChange={(e) => updateMutation.mutate({ status: e.target.value })}
            >
              {LEAD_STATUSES.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick contact actions */}
        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-[--border]">
          {lead.phone && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => handleCopy(lead.phone!, 'phone')}
            >
              {copiedField === 'phone' ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              Copy Phone
            </button>
          )}
          {lead.website && (
            <a href={lead.website} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">
              <Globe className="w-3.5 h-3.5" /> Website
            </a>
          )}
          {lead.whatsappUrl && (
            <a href={lead.whatsappUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">
              <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
            </a>
          )}
          <button
            className="btn btn-primary btn-sm ml-auto"
            onClick={() => setActiveTab('outreach')}
          >
            <Wand2 className="w-3.5 h-3.5" />
            Generate Message
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-[--border]">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'outreach', label: 'Generate Outreach' },
          { id: 'activity', label: 'Notes & Activity' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              'px-4 py-2.5 text-sm font-medium border-b-2 transition-all -mb-px',
              activeTab === tab.id
                ? 'border-brand-600 text-brand-600 dark:border-brand-400 dark:text-brand-400'
                : 'border-transparent text-[--text-muted] hover:text-[--text]'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Contact Information */}
          <div className="card p-5 space-y-4">
            <h3 className="text-sm font-semibold text-[--text]">Contact Information</h3>
            <div className="space-y-3">
              <ContactRow icon={Phone} label="Phone" value={lead.phone} onCopy={() => handleCopy(lead.phone!, 'phone')} copied={copiedField === 'phone'} />
              <ContactRow icon={Mail} label="Email" value={lead.email} onCopy={() => handleCopy(lead.email!, 'email')} copied={copiedField === 'email'} />
              <ContactRow icon={Globe} label="Website" value={lead.website} href={lead.website} />
              <ContactRow icon={MessageCircle} label="WhatsApp" value={lead.whatsappUrl ? 'Available' : undefined} href={lead.whatsappUrl} />
              <ContactRow icon={Instagram} label="Instagram" value={lead.instagramUrl} href={lead.instagramUrl} />
              <ContactRow icon={Facebook} label="Facebook" value={lead.facebookUrl} href={lead.facebookUrl} />
              <ContactRow icon={Linkedin} label="LinkedIn" value={lead.linkedinUrl} href={lead.linkedinUrl} />
              <ContactRow icon={Youtube} label="YouTube" value={lead.youtubeUrl} href={lead.youtubeUrl} />
            </div>
          </div>

          {/* Opportunity Analysis */}
          <div className="space-y-4">
            <div className="card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[--text]">Opportunity Analysis</h3>
                {!analysis && (
                  <button
                    onClick={() => analyzeLeadMutation.mutate()}
                    disabled={analyzeLeadMutation.isPending}
                    className="btn btn-secondary btn-sm"
                  >
                    {analyzeLeadMutation.isPending ? (
                      <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Analyzing...</>
                    ) : (
                      <><Wand2 className="w-3.5 h-3.5" /> Analyze</>
                    )}
                  </button>
                )}
              </div>

              {lead.opportunitySummary && (
                <p className="text-sm text-[--text-muted] leading-relaxed">{lead.opportunitySummary}</p>
              )}

              {analysis && (
                <div className="space-y-3">
                  {[
                    { label: 'Why they need this service', value: analysis.whyTheyNeedService },
                    { label: 'Pitch angle', value: analysis.pitchAngle },
                    { label: 'First message opener', value: analysis.recommendedFirstMessage },
                  ].map(({ label, value }) => (
                    <div key={label} className="p-3 bg-[--surface-2] rounded-xl">
                      <div className="text-xs font-semibold text-[--text-muted] mb-1">{label}</div>
                      <div className="text-sm text-[--text]">{value}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Score breakdown */}
            {lead.scoreBreakdown && (
              <div className="card p-5 space-y-3">
                <h3 className="text-sm font-semibold text-[--text]">Score Breakdown</h3>
                {Object.entries(lead.scoreBreakdown)
                  .filter(([key]) => key !== 'total')
                  .map(([key, val]) => {
                    const labels: Record<string, string> = {
                      noSocialPresence: 'No social presence',
                      weakSocialPresence: 'Weak/improvable social',
                      publicPhone: 'Has phone/WhatsApp',
                      publicEmail: 'Has public email',
                      hasWebsite: 'Has website',
                      recentActivity: 'Recent activity',
                      strongCategory: 'Strong category fit',
                      promotionSuitable: 'Promotion-suitable',
                    };
                    const score = val as number;
                    if (score === 0) return null;
                    return (
                      <div key={key} className="flex items-center gap-3">
                        <div className="flex-1 text-xs text-[--text-muted]">{labels[key] || key}</div>
                        <div className="w-24 h-2 bg-[--surface-2] rounded-full overflow-hidden">
                          <div className="h-full bg-brand-500 rounded-full" style={{ width: `${(score / 25) * 100}%` }} />
                        </div>
                        <div className="text-xs font-semibold text-[--text] w-8 text-right">+{score}</div>
                      </div>
                    );
                  })}
                <div className="flex items-center justify-between pt-2 border-t border-[--border]">
                  <span className="text-sm font-semibold text-[--text]">Total</span>
                  <span className={cn('text-sm font-bold', scoreColor(lead.leadScore))}>{lead.leadScore}/100</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'outreach' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Config */}
          <div className="card p-5 space-y-4">
            <h3 className="text-sm font-semibold text-[--text]">Generate outreach message</h3>

            <div>
              <label className="label">Channel</label>
              <div className="grid grid-cols-2 gap-2">
                {['whatsapp', 'instagram_dm', 'email', 'call_script'].map((ch) => (
                  <button
                    key={ch}
                    type="button"
                    onClick={() => setOutreachChannel(ch)}
                    className={cn(
                      'px-3 py-2 rounded-xl text-sm font-medium border transition-all text-left',
                      outreachChannel === ch
                        ? 'bg-brand-600 text-white border-brand-600'
                        : 'border-[--border] text-[--text-muted] hover:border-brand-400 hover:text-[--text]'
                    )}
                  >
                    {ch === 'whatsapp' ? '💬 WhatsApp' : ch === 'instagram_dm' ? '📸 Instagram DM' : ch === 'email' ? '📧 Email' : '📞 Call Script'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="label">Tone</label>
              <div className="flex flex-wrap gap-2">
                {['professional', 'friendly', 'short', 'sales_focused', 'formal'].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setOutreachTone(t)}
                    className={cn(
                      'px-3 py-1.5 rounded-xl text-xs font-medium border transition-all capitalize',
                      outreachTone === t
                        ? 'bg-brand-600 text-white border-brand-600'
                        : 'border-[--border] text-[--text-muted] hover:border-brand-400 hover:text-[--text]'
                    )}
                  >
                    {t.replace(/_/g, ' ')}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="label">Service to pitch</label>
              <select className="input" value={outreachService} onChange={(e) => setOutreachService(e.target.value)}>
                {SERVICE_TYPES.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            <button
              onClick={() => generateOutreachMutation.mutate()}
              disabled={generateOutreachMutation.isPending}
              className="btn btn-primary btn-md w-full"
            >
              {generateOutreachMutation.isPending ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
              ) : (
                <><Wand2 className="w-4 h-4" /> Generate Message</>
              )}
            </button>
          </div>

          {/* Generated message */}
          <div className="card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[--text]">Generated message</h3>
              {generatedMessage && (
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => handleCopy(editedMessage, 'message')}
                >
                  {copiedField === 'message' ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  Copy
                </button>
              )}
            </div>

            {generatedMessage ? (
              <textarea
                className="input resize-none min-h-[280px] font-mono text-xs leading-relaxed"
                value={editedMessage}
                onChange={(e) => setEditedMessage(e.target.value)}
              />
            ) : (
              <div className="min-h-[280px] flex items-center justify-center text-center">
                <div>
                  <Wand2 className="w-8 h-8 text-[--text-subtle] mx-auto mb-2" />
                  <p className="text-sm text-[--text-muted]">Click "Generate Message"</p>
                  <p className="text-xs text-[--text-subtle] mt-1">Choose your channel and tone first.</p>
                </div>
              </div>
            )}

            {generatedMessage && (
              <div className="flex gap-2">
                <button
                  className="btn btn-primary btn-sm flex-1"
                  onClick={() => handleCopy(editedMessage, 'message')}
                >
                  <Copy className="w-3.5 h-3.5" />
                  Copy & Use
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'activity' && (
        <div className="card p-5 space-y-4">
          <h3 className="text-sm font-semibold text-[--text]">Notes</h3>
          <NoteEditor lead={lead} onSave={(notes) => updateMutation.mutate({ notes })} />

          <div className="pt-2 border-t border-[--border]">
            <div className="text-xs text-[--text-muted]">
              Created {formatDate(lead.createdAt)} · Source: {lead.source || 'manual'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ContactRow({
  icon: Icon, label, value, href, onCopy, copied,
}: {
  icon: React.ElementType;
  label: string;
  value?: string;
  href?: string;
  onCopy?: () => void;
  copied?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 py-1">
      <div className="w-8 h-8 bg-[--surface-2] rounded-lg flex items-center justify-center shrink-0">
        <Icon className="w-3.5 h-3.5 text-[--text-muted]" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-[--text-subtle]">{label}</div>
        {value ? (
          href ? (
            <a href={href} target="_blank" rel="noopener noreferrer" className="text-sm text-brand-600 dark:text-brand-400 hover:underline truncate block">
              {value.length > 40 ? value.slice(0, 40) + '...' : value}
            </a>
          ) : (
            <span className="text-sm text-[--text] truncate block">{value}</span>
          )
        ) : (
          <span className="text-sm text-[--text-subtle] italic">Not available</span>
        )}
      </div>
      {value && onCopy && (
        <button onClick={onCopy} className="btn btn-ghost btn-sm !p-1.5 shrink-0" aria-label="Copy">
          {copied ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      )}
    </div>
  );
}

function NoteEditor({ lead, onSave }: { lead: any; onSave: (notes: string) => void }) {
  const [notes, setNotes] = useState(lead.notes || '');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    onSave(notes);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-3">
      <textarea
        className="input resize-none min-h-[150px]"
        placeholder="Add notes about this lead, contact attempts, or follow-up details..."
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />
      <button onClick={handleSave} className="btn btn-primary btn-sm">
        {saved ? <><CheckCircle className="w-3.5 h-3.5" /> Saved!</> : <><Edit3 className="w-3.5 h-3.5" /> Save notes</>}
      </button>
    </div>
  );
}

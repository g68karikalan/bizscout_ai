import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Radar, Check, ChevronRight, Loader2 } from 'lucide-react';
import { useAppStore } from '../stores/appStore';
import { apiClient } from '../lib/api';
import { cn } from '../lib/utils';

const ROLES = ['Freelancer', 'Agency', 'Designer', 'Developer', 'Marketer', 'Salesperson', 'Other'];
const SERVICES = [
  'Social media design', 'Web development', 'SEO', 'Photography',
  'Video editing', 'Marketing', 'Branding', 'Advertising', 'Other',
];
const INDUSTRIES = [
  'Bakery', 'Restaurant', 'Salon', 'Gym', 'Tuition Centre',
  'Real Estate', 'Retail', 'Mobile Shop', 'Healthcare', 'Local Services',
  'Cafe', 'Hotel', 'Pharmacy', 'Photography Studio', 'Event Planner',
];

export function OnboardingPage() {
  const navigate = useNavigate();
  const { user, updateProfile } = useAppStore();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    fullName: user?.profile?.fullName || user?.name || '',
    businessName: '',
    role: '',
    services: [] as string[],
    targetIndustries: [] as string[],
    defaultCountry: 'India',
    defaultState: '',
    defaultCity: '',
  });

  const totalSteps = 4;

  const toggle = (key: 'services' | 'targetIndustries', value: string) => {
    setForm((prev) => ({
      ...prev,
      [key]: prev[key].includes(value)
        ? prev[key].filter((v) => v !== value)
        : [...prev[key], value],
    }));
  };

  const handleNext = () => {
    if (step < totalSteps - 1) setStep(step + 1);
    else handleComplete();
  };

  const handleComplete = async () => {
    setSaving(true);
    try {
      const profileData = {
        fullName: form.fullName,
        businessName: form.businessName,
        role: form.role,
        services: form.services.map((s) => s.toLowerCase().replace(/ /g, '_')),
        targetIndustries: form.targetIndustries,
        defaultCountry: form.defaultCountry,
        defaultState: form.defaultState,
        defaultCity: form.defaultCity,
        onboardingComplete: true,
      };
      await apiClient.post('/auth/profile', profileData);
      updateProfile({ ...profileData, onboardingComplete: true });
      navigate('/dashboard');
    } catch {
      navigate('/dashboard');
    } finally {
      setSaving(false);
    }
  };

  const canProceed = () => {
    if (step === 0) return form.fullName.length >= 2;
    if (step === 1) return form.services.length > 0;
    if (step === 2) return form.targetIndustries.length > 0;
    if (step === 3) return form.defaultCity.length > 0;
    return true;
  };

  const steps = [
    {
      title: 'Your profile',
      desc: 'Tell us a bit about yourself',
      content: (
        <div className="space-y-4">
          <div>
            <label className="label">Full name</label>
            <input className="input" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} placeholder="Your full name" />
          </div>
          <div>
            <label className="label">Business/agency name <span className="text-[--text-subtle] font-normal">(optional)</span></label>
            <input className="input" value={form.businessName} onChange={(e) => setForm({ ...form, businessName: e.target.value })} placeholder="Your brand or agency" />
          </div>
          <div>
            <label className="label">Your role</label>
            <div className="flex flex-wrap gap-2">
              {ROLES.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setForm({ ...form, role: r })}
                  className={cn(
                    'px-4 py-2 rounded-xl text-sm font-medium border transition-all',
                    form.role === r
                      ? 'bg-brand-600 text-white border-brand-600'
                      : 'border-[--border] text-[--text-muted] hover:border-brand-400 hover:text-[--text]'
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'What services do you sell?',
      desc: 'Select all that apply — this helps us score leads better',
      content: (
        <div className="flex flex-wrap gap-2">
          {SERVICES.map((s) => {
            const selected = form.services.includes(s);
            return (
              <button
                key={s}
                type="button"
                onClick={() => toggle('services', s)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all',
                  selected
                    ? 'bg-brand-600 text-white border-brand-600'
                    : 'border-[--border] text-[--text-muted] hover:border-brand-400 hover:text-[--text]'
                )}
              >
                {selected && <Check className="w-3.5 h-3.5" />}
                {s}
              </button>
            );
          })}
        </div>
      ),
    },
    {
      title: 'Target industries',
      desc: 'Which businesses do you want to reach?',
      content: (
        <div className="flex flex-wrap gap-2">
          {INDUSTRIES.map((ind) => {
            const selected = form.targetIndustries.includes(ind);
            return (
              <button
                key={ind}
                type="button"
                onClick={() => toggle('targetIndustries', ind)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all',
                  selected
                    ? 'bg-brand-600 text-white border-brand-600'
                    : 'border-[--border] text-[--text-muted] hover:border-brand-400 hover:text-[--text]'
                )}
              >
                {selected && <Check className="w-3.5 h-3.5" />}
                {ind}
              </button>
            );
          })}
        </div>
      ),
    },
    {
      title: 'Where do you operate?',
      desc: 'Set your default search location',
      content: (
        <div className="space-y-4">
          <div>
            <label className="label">Country</label>
            <input className="input" value={form.defaultCountry} onChange={(e) => setForm({ ...form, defaultCountry: e.target.value })} placeholder="India" />
          </div>
          <div>
            <label className="label">State</label>
            <input className="input" value={form.defaultState} onChange={(e) => setForm({ ...form, defaultState: e.target.value })} placeholder="Tamil Nadu" />
          </div>
          <div>
            <label className="label">City <span className="text-red-400">*</span></label>
            <input className="input" value={form.defaultCity} onChange={(e) => setForm({ ...form, defaultCity: e.target.value })} placeholder="Dindigul" />
          </div>
        </div>
      ),
    },
  ];

  const current = steps[step];

  return (
    <div className="min-h-screen bg-[--bg] flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 bg-brand-600 rounded-xl flex items-center justify-center">
            <Radar className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-bold text-[--text]">BizScout AI</span>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[--text-muted] font-medium">Step {step + 1} of {totalSteps}</span>
            <span className="text-xs text-[--text-subtle]">{Math.round(((step) / totalSteps) * 100)}% complete</span>
          </div>
          <div className="h-1.5 bg-[--surface-2] rounded-full">
            <div
              className="h-full bg-brand-600 rounded-full transition-all duration-500"
              style={{ width: `${((step + 1) / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        {/* Card */}
        <div className="card p-8 space-y-6">
          <div>
            <h2 className="text-xl font-bold text-[--text]">{current.title}</h2>
            <p className="mt-1 text-sm text-[--text-muted]">{current.desc}</p>
          </div>

          {current.content}

          <div className="flex items-center justify-between pt-2">
            {step > 0 ? (
              <button type="button" className="btn btn-ghost btn-md" onClick={() => setStep(step - 1)}>
                Back
              </button>
            ) : (
              <button type="button" className="btn btn-ghost btn-md" onClick={() => navigate('/dashboard')}>
                Skip
              </button>
            )}

            <button
              type="button"
              onClick={handleNext}
              disabled={!canProceed() || saving}
              className="btn btn-primary btn-md"
            >
              {saving ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
              ) : step === totalSteps - 1 ? (
                'Finish setup'
              ) : (
                <>Continue <ChevronRight className="w-4 h-4" /></>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

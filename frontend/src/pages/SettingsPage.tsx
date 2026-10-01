import { useState } from 'react';
import { useAppStore } from '../stores/appStore';
import { apiClient } from '../lib/api';
import { cn, SERVICE_TYPES } from '../lib/utils';
import { CheckCircle, Loader2, Moon, Sun, Monitor, User, Sliders, Database } from 'lucide-react';

export function SettingsPage() {
  const { user, theme, setTheme, updateProfile } = useAppStore();
  const [activeSection, setActiveSection] = useState('profile');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [profileForm, setProfileForm] = useState({
    fullName: user?.profile?.fullName || '',
    businessName: user?.profile?.businessName || '',
    role: user?.profile?.role || '',
    defaultCity: user?.profile?.defaultCity || '',
    defaultState: user?.profile?.defaultState || '',
    defaultCountry: user?.profile?.defaultCountry || 'India',
  });

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await apiClient.patch('/auth/profile', profileForm);
      updateProfile(profileForm);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch { /* show error */ }
    finally { setSaving(false); }
  };

  const sections = [
    { id: 'profile', icon: User, label: 'Profile' },
    { id: 'theme', icon: Sun, label: 'Appearance' },
    { id: 'defaults', icon: Sliders, label: 'Search Defaults' },
    { id: 'data', icon: Database, label: 'Data & Privacy' },
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-[--text]">Settings</h1>
        <p className="text-sm text-[--text-muted] mt-0.5">Manage your account and preferences</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-5">
        {/* Sidebar nav */}
        <div className="lg:w-48 shrink-0">
          <nav className="space-y-1">
            {sections.map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                onClick={() => setActiveSection(id)}
                className={cn(
                  'flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                  activeSection === id
                    ? 'bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-400'
                    : 'text-[--text-muted] hover:bg-[--surface-2] hover:text-[--text]'
                )}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1">
          {activeSection === 'profile' && (
            <div className="card p-6 space-y-5">
              <h2 className="text-base font-semibold text-[--text]">Profile</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Full name</label>
                  <input className="input" value={profileForm.fullName} onChange={(e) => setProfileForm({ ...profileForm, fullName: e.target.value })} />
                </div>
                <div>
                  <label className="label">Business/agency name</label>
                  <input className="input" value={profileForm.businessName} onChange={(e) => setProfileForm({ ...profileForm, businessName: e.target.value })} />
                </div>
                <div>
                  <label className="label">Role</label>
                  <select className="input" value={profileForm.role} onChange={(e) => setProfileForm({ ...profileForm, role: e.target.value })}>
                    <option value="">Select role</option>
                    {['Freelancer', 'Agency', 'Designer', 'Developer', 'Marketer', 'Salesperson', 'Other'].map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
              </div>

              {saved && (
                <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
                  <CheckCircle className="w-4 h-4" /> Profile saved!
                </div>
              )}

              <button onClick={handleSaveProfile} disabled={saving} className="btn btn-primary btn-md">
                {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : 'Save changes'}
              </button>
            </div>
          )}

          {activeSection === 'theme' && (
            <div className="card p-6 space-y-5">
              <h2 className="text-base font-semibold text-[--text]">Appearance</h2>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: 'light' as const, icon: Sun, label: 'Light', preview: 'bg-white border-gray-200' },
                  { value: 'dark' as const, icon: Moon, label: 'Dark', preview: 'bg-gray-900 border-gray-700' },
                  { value: 'system' as const, icon: Monitor, label: 'System', preview: 'bg-gradient-to-br from-white to-gray-900 border-gray-400' },
                ].map(({ value, icon: Icon, label, preview }) => (
                  <button
                    key={value}
                    onClick={() => setTheme(value)}
                    className={cn(
                      'p-4 rounded-xl border-2 transition-all space-y-3',
                      theme === value ? 'border-brand-500' : 'border-[--border] hover:border-[--text-muted]'
                    )}
                  >
                    <div className={cn('h-16 rounded-lg border', preview)} />
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-[--text]">{label}</span>
                      <Icon className="w-4 h-4 text-[--text-muted]" />
                    </div>
                    {theme === value && <div className="w-2 h-2 bg-brand-500 rounded-full mx-auto" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeSection === 'defaults' && (
            <div className="card p-6 space-y-5">
              <h2 className="text-base font-semibold text-[--text]">Default search preferences</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="label">Default city</label>
                  <input className="input" value={profileForm.defaultCity} onChange={(e) => setProfileForm({ ...profileForm, defaultCity: e.target.value })} placeholder="Dindigul" />
                </div>
                <div>
                  <label className="label">Default state</label>
                  <input className="input" value={profileForm.defaultState} onChange={(e) => setProfileForm({ ...profileForm, defaultState: e.target.value })} placeholder="Tamil Nadu" />
                </div>
                <div>
                  <label className="label">Default country</label>
                  <input className="input" value={profileForm.defaultCountry} onChange={(e) => setProfileForm({ ...profileForm, defaultCountry: e.target.value })} placeholder="India" />
                </div>
              </div>

              {saved && (
                <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
                  <CheckCircle className="w-4 h-4" /> Saved!
                </div>
              )}

              <button onClick={handleSaveProfile} disabled={saving} className="btn btn-primary btn-md">
                {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : 'Save defaults'}
              </button>
            </div>
          )}

          {activeSection === 'data' && (
            <div className="card p-6 space-y-5">
              <h2 className="text-base font-semibold text-[--text]">Data & Privacy</h2>
              <div className="space-y-3 text-sm text-[--text-muted]">
                <p>BizScout AI only stores publicly available business contact information you discover through lead searches.</p>
                <p>Your data is private to your workspace — no other users can access your leads, campaigns, or outreach messages.</p>
                <p>We do not sell or share your data with third parties.</p>
              </div>
              <div className="p-4 bg-[--surface-2] rounded-xl space-y-2">
                <div className="text-xs font-semibold text-[--text]">Data stored per lead:</div>
                <ul className="text-xs text-[--text-muted] space-y-1 list-disc list-inside">
                  <li>Publicly listed business name, address, phone, email</li>
                  <li>Publicly visible social media handles</li>
                  <li>Publicly listed business hours and rating</li>
                  <li>Your own CRM notes and outreach messages</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

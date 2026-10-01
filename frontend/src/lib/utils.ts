import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(dateStr);
}

export function formatScore(score: number): string {
  return `${score}/100`;
}

export function scoreColor(score: number): string {
  if (score >= 70) return 'text-emerald-600 dark:text-emerald-400';
  if (score >= 40) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-slate-500 dark:text-slate-400';
}

export function scoreLabel(score: number): string {
  if (score >= 70) return 'Hot';
  if (score >= 40) return 'Warm';
  return 'Cold';
}

export function scoreBgColor(score: number): string {
  if (score >= 70) return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
  if (score >= 40) return 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300';
  return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
}

export function statusConfig(status: string): { label: string; className: string } {
  const configs: Record<string, { label: string; className: string }> = {
    new: { label: 'New', className: 'badge-new' },
    saved: { label: 'Saved', className: 'badge-saved' },
    contacted: { label: 'Contacted', className: 'badge-contacted' },
    follow_up: { label: 'Follow Up', className: 'badge-follow_up' },
    replied: { label: 'Replied', className: 'badge-replied' },
    qualified: { label: 'Qualified', className: 'badge-qualified' },
    won: { label: 'Won', className: 'badge-won' },
    lost: { label: 'Lost', className: 'badge-lost' },
    do_not_contact: { label: 'Do Not Contact', className: 'badge-do_not_contact' },
  };
  return configs[status] || { label: status, className: 'badge' };
}

export function serviceTypeLabel(serviceType: string): string {
  const labels: Record<string, string> = {
    social_media_design: 'Social Media Design',
    web_development: 'Web Development',
    seo: 'SEO',
    photography: 'Photography',
    video_editing: 'Video Editing',
    marketing: 'Marketing',
    branding: 'Branding',
    advertising: 'Advertising',
    other: 'Other',
  };
  return labels[serviceType] || serviceType;
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + '...';
}

export function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return url;
  }
}

export function copyToClipboard(text: string): Promise<void> {
  return navigator.clipboard.writeText(text);
}

export function downloadCSV(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export const CATEGORIES = [
  'Bakery', 'Salon', 'Gym', 'Restaurant', 'Cafe', 'Tuition Centre',
  'Mobile Shop', 'Real Estate', 'Hospital', 'Clinic', 'Pharmacy',
  'Hotel', 'Spa', 'Photography Studio', 'Boutique', 'Grocery Store',
  'Hardware Shop', 'Electronics', 'Jewellery', 'Furniture', 'Event Planner',
  'Travel Agency', 'Coaching Centre', 'Dental Clinic', 'Yoga Studio',
  'Beauty Parlour', 'Tailor', 'Laundry', 'Car Wash', 'Petrol Pump',
];

export const SERVICE_TYPES = [
  { value: 'social_media_design', label: 'Social Media Design' },
  { value: 'web_development', label: 'Web Development' },
  { value: 'seo', label: 'SEO' },
  { value: 'photography', label: 'Photography' },
  { value: 'video_editing', label: 'Video Editing' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'branding', label: 'Branding' },
  { value: 'advertising', label: 'Advertising' },
  { value: 'other', label: 'Other' },
];

export const LEAD_STATUSES = [
  { value: 'new', label: 'New' },
  { value: 'saved', label: 'Saved' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'follow_up', label: 'Follow Up' },
  { value: 'replied', label: 'Replied' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'won', label: 'Won' },
  { value: 'lost', label: 'Lost' },
  { value: 'do_not_contact', label: 'Do Not Contact' },
];

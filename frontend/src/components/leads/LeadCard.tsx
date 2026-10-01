import { Link } from 'react-router-dom';
import {
  Phone, Globe, MessageCircle,
  Star, Users, ExternalLink,
} from 'lucide-react';
import { Instagram, Facebook } from '../ui/SocialIcons';
import { cn, scoreColor, scoreBgColor, scoreLabel, statusConfig, formatRelativeTime } from '../../lib/utils';

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
  facebookUrl?: string;
  whatsappUrl?: string;
  rating?: number;
  reviewCount?: number;
  leadScore: number;
  status: string;
  opportunitySummary?: string;
  createdAt: string;
}

export function LeadCard({ lead }: { lead: Lead }) {
  const { label: statusLabel, className: statusClass } = statusConfig(lead.status);

  return (
    <div className="card-hover p-5 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-[--text] truncate">{lead.name}</h3>
          </div>
          <p className="text-xs text-[--text-muted] mt-0.5 truncate">
            {lead.category} · {lead.city}{lead.state ? `, ${lead.state}` : ''}
          </p>
        </div>
        <div className={cn('badge shrink-0', statusClass)}>{statusLabel}</div>
      </div>

      {/* Score + Rating */}
      <div className="flex items-center gap-3">
        <div className={cn('px-3 py-1.5 rounded-xl text-xs font-semibold', scoreBgColor(lead.leadScore))}>
          {lead.leadScore}/100 · {scoreLabel(lead.leadScore)}
        </div>
        {lead.rating && (
          <div className="flex items-center gap-1 text-xs text-[--text-muted]">
            <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
            {lead.rating.toFixed(1)}
            {lead.reviewCount && <span className="text-[--text-subtle]">({lead.reviewCount})</span>}
          </div>
        )}
      </div>

      {/* Opportunity summary */}
      {lead.opportunitySummary && (
        <p className="text-xs text-[--text-muted] leading-relaxed line-clamp-2">
          {lead.opportunitySummary}
        </p>
      )}

      {/* Contact availability icons */}
      <div className="flex items-center gap-2">
        <ContactIcon icon={Phone} active={!!lead.phone} label="Phone" href={lead.phone ? `tel:${lead.phone}` : undefined} />
        <ContactIcon icon={Globe} active={!!lead.website} label="Website" href={lead.website} external />
        <ContactIcon icon={Instagram} active={!!lead.instagramUrl} label="Instagram" href={lead.instagramUrl} external />
        <ContactIcon icon={Facebook} active={!!lead.facebookUrl} label="Facebook" href={lead.facebookUrl} external />
        <ContactIcon icon={MessageCircle} active={!!lead.whatsappUrl} label="WhatsApp" href={lead.whatsappUrl} external />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        <Link to={`/leads/${lead.id}`} className="btn btn-secondary btn-sm flex-1 justify-center">
          View
        </Link>
        <Link to={`/leads/${lead.id}`} className="btn btn-primary btn-sm flex-1 justify-center">
          Generate Pitch
        </Link>
      </div>

      <div className="text-xs text-[--text-subtle]">{formatRelativeTime(lead.createdAt)}</div>
    </div>
  );
}

function ContactIcon({
  icon: Icon,
  active,
  label,
  href,
  external,
}: {
  icon: React.ElementType;
  active: boolean;
  label: string;
  href?: string;
  external?: boolean;
}) {
  const cls = cn(
    'w-7 h-7 rounded-lg flex items-center justify-center transition-all',
    active
      ? 'bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-400 hover:bg-brand-100'
      : 'bg-[--surface-2] text-[--text-subtle] cursor-default'
  );

  if (active && href) {
    return (
      <a href={href} target={external ? '_blank' : undefined} rel="noopener noreferrer" className={cls} title={label} onClick={(e) => e.stopPropagation()}>
        <Icon className="w-3.5 h-3.5" />
      </a>
    );
  }

  return (
    <div className={cls} title={`No ${label}`}>
      <Icon className="w-3.5 h-3.5" />
    </div>
  );
}

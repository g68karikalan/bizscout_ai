import { EnrichedLead, ScoreBreakdown, ScoredLead } from '../types/index.js';

// ── Category signal maps ───────────────────────────────────────────────────────
const STRONG_VISUAL_CATEGORIES = new Set([
  'bakery', 'salon', 'beauty', 'restaurant', 'cafe', 'hotel', 'fashion',
  'boutique', 'jewelry', 'florist', 'spa', 'nail', 'bridal', 'event',
  'wedding', 'catering', 'food', 'dessert', 'ice cream', 'sweet',
]);

const PROMOTION_SUITABLE_CATEGORIES = new Set([
  'bakery', 'salon', 'restaurant', 'cafe', 'gym', 'fitness', 'spa', 'beauty',
  'mobile', 'electronics', 'clothing', 'fashion', 'retail', 'shop', 'store',
  'supermarket', 'food', 'sweet', 'dessert',
]);

const NEEDS_WEB_CATEGORIES = new Set([
  'real estate', 'hospital', 'clinic', 'doctor', 'lawyer', 'advocate',
  'architect', 'consultant', 'school', 'coaching', 'tuition', 'hotel',
  'resort', 'travel', 'tour', 'service', 'repair', 'contractor',
]);

// ── Service-specific scoring profiles ─────────────────────────────────────────

type ServiceProfile = (lead: EnrichedLead) => ScoreBreakdown;

const socialMediaDesignProfile: ServiceProfile = (lead) => {
  const cat = lead.category.toLowerCase();
  const breakdown: ScoreBreakdown = {
    noSocialPresence: 0,
    weakSocialPresence: 0,
    publicPhone: 0,
    publicEmail: 0,
    hasWebsite: 0,
    recentActivity: 0,
    strongCategory: 0,
    promotionSuitable: 0,
    total: 0,
  };

  // No Instagram/Facebook/social = highest opportunity
  const hasSocial = !!lead.instagramUrl || !!lead.facebookUrl;
  if (!hasSocial) {
    breakdown.noSocialPresence = 25;
  } else {
    // Has social but we can still improve it
    breakdown.weakSocialPresence = 15;
  }

  // Contactability
  if (lead.phone || lead.whatsappUrl) breakdown.publicPhone = 15;
  if (lead.email) breakdown.publicEmail = 10;

  // Website presence (they can afford services if they have a site)
  if (lead.website) breakdown.hasWebsite = 5;

  // Recent activity signals (use review count as proxy)
  if ((lead.reviewCount ?? 0) >= 50) breakdown.recentActivity = 15;
  else if ((lead.reviewCount ?? 0) >= 10) breakdown.recentActivity = 8;

  // Category signals
  if ([...STRONG_VISUAL_CATEGORIES].some((c) => cat.includes(c))) {
    breakdown.strongCategory = 15;
  }
  if ([...PROMOTION_SUITABLE_CATEGORIES].some((c) => cat.includes(c))) {
    breakdown.promotionSuitable = 15;
  }

  breakdown.total = Math.min(
    100,
    breakdown.noSocialPresence +
      breakdown.weakSocialPresence +
      breakdown.publicPhone +
      breakdown.publicEmail +
      breakdown.hasWebsite +
      breakdown.recentActivity +
      breakdown.strongCategory +
      breakdown.promotionSuitable
  );

  return breakdown;
};

const webDevelopmentProfile: ServiceProfile = (lead) => {
  const breakdown: ScoreBreakdown = {
    noSocialPresence: 0,
    weakSocialPresence: 0,
    publicPhone: 0,
    publicEmail: 0,
    hasWebsite: 0,
    recentActivity: 0,
    strongCategory: 0,
    promotionSuitable: 0,
    total: 0,
  };

  const cat = lead.category.toLowerCase();

  // No website = highest opportunity
  if (!lead.website) {
    breakdown.noSocialPresence = 30; // re-using field for "no website"
  } else {
    breakdown.weakSocialPresence = 10; // site exists but might need redesign
  }

  if (lead.phone || lead.whatsappUrl) breakdown.publicPhone = 15;
  if (lead.email) breakdown.publicEmail = 10;

  // Categories that benefit from web presence
  if ([...NEEDS_WEB_CATEGORIES].some((c) => cat.includes(c))) {
    breakdown.strongCategory = 20;
  }

  if ((lead.reviewCount ?? 0) >= 30) breakdown.recentActivity = 15;

  breakdown.promotionSuitable = 0;
  breakdown.hasWebsite = 0;

  breakdown.total = Math.min(
    100,
    breakdown.noSocialPresence +
      breakdown.weakSocialPresence +
      breakdown.publicPhone +
      breakdown.publicEmail +
      breakdown.recentActivity +
      breakdown.strongCategory
  );

  return breakdown;
};

const seoProfile: ServiceProfile = (lead) => {
  const breakdown: ScoreBreakdown = {
    noSocialPresence: 0,
    weakSocialPresence: 0,
    publicPhone: 0,
    publicEmail: 0,
    hasWebsite: 0,
    recentActivity: 0,
    strongCategory: 0,
    promotionSuitable: 0,
    total: 0,
  };

  const cat = lead.category.toLowerCase();

  // Must have a website for SEO
  if (lead.website) {
    breakdown.hasWebsite = 20;
  } else {
    // No website = still a lead (needs web dev first, then SEO)
    breakdown.hasWebsite = 5;
  }

  if (lead.phone || lead.whatsappUrl) breakdown.publicPhone = 10;
  if (lead.email) breakdown.publicEmail = 10;

  // Low review count = opportunity to build local SEO
  if ((lead.reviewCount ?? 0) < 20) {
    breakdown.recentActivity = 20;
  } else if ((lead.reviewCount ?? 0) < 50) {
    breakdown.recentActivity = 10;
  }

  if ([...NEEDS_WEB_CATEGORIES].some((c) => cat.includes(c))) {
    breakdown.strongCategory = 20;
  }

  const hasSocial = !!lead.instagramUrl || !!lead.facebookUrl;
  if (!hasSocial) breakdown.noSocialPresence = 10;

  breakdown.total = Math.min(
    100,
    breakdown.hasWebsite +
      breakdown.publicPhone +
      breakdown.publicEmail +
      breakdown.recentActivity +
      breakdown.strongCategory +
      breakdown.noSocialPresence
  );

  return breakdown;
};

const SERVICE_PROFILES: Record<string, ServiceProfile> = {
  social_media_design: socialMediaDesignProfile,
  web_development: webDevelopmentProfile,
  seo: seoProfile,
  marketing: socialMediaDesignProfile, // fallback to social
  branding: socialMediaDesignProfile,
  photography: socialMediaDesignProfile,
  video_editing: socialMediaDesignProfile,
  advertising: socialMediaDesignProfile,
  other: socialMediaDesignProfile,
};

export function scoreLead(lead: EnrichedLead, serviceType: string): ScoredLead {
  const profileFn = SERVICE_PROFILES[serviceType] ?? socialMediaDesignProfile;
  const breakdown = profileFn(lead);

  return {
    ...lead,
    leadScore: breakdown.total,
    scoreBreakdown: breakdown,
  };
}

export function generateScoreReasoning(breakdown: ScoreBreakdown, serviceType: string): string {
  const reasons: string[] = [];

  if (breakdown.noSocialPresence > 0) {
    if (serviceType === 'web_development') {
      reasons.push('No website found — strong opportunity to pitch web development');
    } else {
      reasons.push('No social media presence detected — high opportunity for design services');
    }
  }
  if (breakdown.weakSocialPresence > 0) {
    if (serviceType === 'web_development') {
      reasons.push('Website exists but may need redesign or modernization');
    } else {
      reasons.push('Has social presence but may benefit from professional design');
    }
  }
  if (breakdown.publicPhone > 0) reasons.push('Publicly contactable via phone/WhatsApp');
  if (breakdown.publicEmail > 0) reasons.push('Business email is publicly available');
  if (breakdown.hasWebsite > 0 && serviceType === 'seo') reasons.push('Has a website — ready for SEO optimization');
  if (breakdown.recentActivity > 0) reasons.push('Active business with review history');
  if (breakdown.strongCategory > 0) reasons.push('Business category is a strong fit for this service');
  if (breakdown.promotionSuitable > 0) reasons.push('Products/services are well-suited for promotions and campaigns');

  if (reasons.length === 0) reasons.push('General opportunity identified based on business profile');

  return reasons.join('. ') + '.';
}

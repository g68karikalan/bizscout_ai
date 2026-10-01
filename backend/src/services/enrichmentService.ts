import axios from 'axios';
import * as cheerio from 'cheerio';
import { EnrichedLead, BusinessLeadCandidate } from '../types/index.js';

const TIMEOUT_MS = 8000;
const MAX_PAGES = 3;

const PAGES_TO_CHECK = [
  '',
  '/contact',
  '/contact-us',
  '/about',
  '/about-us',
];

const EMAIL_REGEX = /\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b/g;
const PHONE_REGEX = /(?:\+91[\s\-]?)?(?:\d{10}|\d{5}[\s\-]\d{5}|\(\d{3}\)[\s\-]?\d{3}[\s\-]?\d{4})/g;
const WHATSAPP_REGEX = /(?:api\.whatsapp\.com|wa\.me|whatsapp\.com\/send)[^\s"'>]*/gi;
const INSTAGRAM_REGEX = /instagram\.com\/(?!p\/|reel\/|explore\/|tv\/)[A-Za-z0-9_\.]+/gi;
const FACEBOOK_REGEX = /facebook\.com\/(?!sharer|share|login|pg\/)[A-Za-z0-9_\.\-]+/gi;
const LINKEDIN_REGEX = /linkedin\.com\/(?:company|in)\/[A-Za-z0-9_\-]+/gi;
const YOUTUBE_REGEX = /youtube\.com\/(?:channel|c|user|@)[A-Za-z0-9_\-]+/gi;

interface ExtractedContacts {
  emails: string[];
  phones: string[];
  whatsappUrls: string[];
  instagramUrls: string[];
  facebookUrls: string[];
  linkedinUrls: string[];
  youtubeUrls: string[];
}

function extractContacts(html: string, baseUrl: string): ExtractedContacts {
  const $ = cheerio.load(html);
  const text = $.text();
  const fullContent = html + ' ' + text;

  const emails: string[] = Array.from(
    new Set((fullContent.match(EMAIL_REGEX) || []).filter((e: string) => !e.includes('example.com') && !e.includes('your@') && !e.includes('@sentry')))
  );

  const phones: string[] = Array.from(
    new Set((text.match(PHONE_REGEX) || []).map((p: string) => p.trim()).filter((p: string) => p.length >= 10))
  );

  const whatsappUrls: string[] = Array.from(
    new Set((fullContent.match(WHATSAPP_REGEX) || []).map((u: string) => `https://${u}`))
  );

  const instagramUrls: string[] = Array.from(
    new Set(
      (fullContent.match(INSTAGRAM_REGEX) || [])
        .map((u: string) => `https://www.${u}`)
        .filter((u: string) => !u.includes('/p/') && !u.includes('/reel/'))
    )
  );

  const facebookUrls: string[] = Array.from(
    new Set((fullContent.match(FACEBOOK_REGEX) || []).map((u: string) => `https://www.${u}`))
  );

  const linkedinUrls: string[] = Array.from(
    new Set((fullContent.match(LINKEDIN_REGEX) || []).map((u: string) => `https://www.${u}`))
  );

  const youtubeUrls: string[] = Array.from(
    new Set((fullContent.match(YOUTUBE_REGEX) || []).map((u: string) => `https://www.${u}`))
  );

  return { emails, phones, whatsappUrls, instagramUrls, facebookUrls, linkedinUrls, youtubeUrls };
}

async function fetchPage(url: string): Promise<string | null> {
  try {
    const response = await axios.get(url, {
      timeout: TIMEOUT_MS,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; BizScoutBot/1.0; business-enrichment)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      maxRedirects: 5,
      validateStatus: (status: number) => status < 400,
    });
    return typeof response.data === 'string' ? response.data : null;
  } catch {
    return null;
  }
}

function normalizeUrl(website: string): string {
  let url = website.trim();
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = `https://${url}`;
  }
  return url.replace(/\/$/, '');
}

export async function enrichBusinessWebsite(
  business: BusinessLeadCandidate
): Promise<Partial<EnrichedLead>> {
  if (!business.website) return {};

  const baseUrl = normalizeUrl(business.website);
  const allContacts: ExtractedContacts = {
    emails: [],
    phones: [],
    whatsappUrls: [],
    instagramUrls: [],
    facebookUrls: [],
    linkedinUrls: [],
    youtubeUrls: [],
  };

  let pagesChecked = 0;

  for (const path of PAGES_TO_CHECK) {
    if (pagesChecked >= MAX_PAGES) break;

    const url = `${baseUrl}${path}`;
    const html = await fetchPage(url);
    if (!html) continue;

    pagesChecked++;
    const contacts = extractContacts(html, baseUrl);

    allContacts.emails.push(...contacts.emails);
    allContacts.phones.push(...contacts.phones);
    allContacts.whatsappUrls.push(...contacts.whatsappUrls);
    allContacts.instagramUrls.push(...contacts.instagramUrls);
    allContacts.facebookUrls.push(...contacts.facebookUrls);
    allContacts.linkedinUrls.push(...contacts.linkedinUrls);
    allContacts.youtubeUrls.push(...contacts.youtubeUrls);

    // If we found key contacts on homepage, we may not need to crawl more
    if (contacts.emails.length > 0 && contacts.phones.length > 0) break;
  }

  // Deduplicate
  const uniqueEmails = [...new Set(allContacts.emails)];
  const uniquePhones = [...new Set(allContacts.phones)];

  const result: Partial<EnrichedLead> = {};

  if (uniqueEmails.length > 0) {
    result.email = uniqueEmails[0];
    result.emailConfidence = 'high';
  }

  if (uniquePhones.length > 0 && !business.phone) {
    result.phone = uniquePhones[0];
    result.phoneConfidence = 'medium';
  }

  if (allContacts.whatsappUrls.length > 0) {
    result.whatsappUrl = allContacts.whatsappUrls[0];
  }

  if (allContacts.instagramUrls.length > 0) {
    result.instagramUrl = allContacts.instagramUrls[0];
  }

  if (allContacts.facebookUrls.length > 0) {
    result.facebookUrl = allContacts.facebookUrls[0];
  }

  if (allContacts.linkedinUrls.length > 0) {
    result.linkedinUrl = allContacts.linkedinUrls[0];
  }

  if (allContacts.youtubeUrls.length > 0) {
    result.youtubeUrl = allContacts.youtubeUrls[0];
  }

  return result;
}

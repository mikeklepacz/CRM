import axios from 'axios';
import { URL } from 'url';
import dns from 'dns';
import { promisify } from 'util';

const dnsLookup = promisify(dns.lookup);
const dnsLookupAll = promisify(dns.lookup) as (hostname: string, options: { all: true }) => Promise<Array<{ address: string; family: number }>>;

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

const CONTACT_PATHS = [
  // English
  '/contact', '/contact-us', '/about', '/about-us',
  // German
  '/kontakt', '/impressum', '/uber-uns', '/ueber-uns', '/about',
  // French
  '/contact', '/contactez-nous', '/a-propos', '/nous-contacter',
  // Italian
  '/contatti', '/chi-siamo', '/contattaci',
  // Spanish
  '/contacto', '/contactenos', '/sobre-nosotros', '/quienes-somos',
  // Portuguese
  '/contacto', '/contato', '/sobre', '/sobre-nos', '/fale-conosco',
  // Dutch
  '/contact', '/over-ons', '/neem-contact-op',
  // Polish
  '/kontakt', '/o-nas',
  // Russian (transliterated)
  '/kontakty', '/o-nas', '/svyaz',
  // Ukrainian (transliterated)
  '/kontakty', '/pro-nas',
  // Romanian
  '/contact', '/despre-noi',
  // Greek (transliterated)
  '/epikoinonia', '/contact',
  // Hungarian
  '/kapcsolat', '/rolunk',
  // Czech
  '/kontakt', '/o-nas',
  // Swedish
  '/kontakt', '/kontakta-oss', '/om-oss',
  // Serbian/Croatian
  '/kontakt', '/o-nama',
  // Bulgarian (transliterated)
  '/kontakti', '/za-nas',
  // Danish
  '/kontakt', '/om-os',
  // Finnish
  '/yhteystiedot', '/ota-yhteytta', '/meista',
  // Norwegian
  '/kontakt', '/om-oss', '/kontakt-oss',
];

const PRIORITY_PREFIXES = [
  // English
  'contact', 'info', 'hello', 'sales', 'support', 'admin', 'office', 'enquiry', 'inquiry', 'team', 'hq', 'business',
  // German
  'kontakt', 'anfrage', 'buero', 'zentrale',
  // French
  'contact', 'accueil', 'bureau',
  // Italian
  'contatti', 'ufficio', 'segreteria',
  // Spanish
  'contacto', 'oficina', 'atencion',
  // Portuguese
  'contato', 'atendimento', 'escritorio',
  // Dutch
  'contact', 'kantoor',
  // Polish
  'kontakt', 'biuro',
  // Russian
  'info', 'office', 'priemnaya',
  // Swedish/Danish/Norwegian
  'kontakt', 'kontor',
  // Finnish
  'asiakaspalvelu', 'toimisto',
  // Hungarian
  'iroda',
  // Czech
  'kancelar',
  // Romanian
  'birou',
];

const EXCLUDED_DOMAINS = [
  'example.com', 'sentry.io', 'wixpress.com', 'w3.org', 'schema.org',
  'googleapis.com', 'google.com', 'facebook.com', 'twitter.com',
  'instagram.com', 'linkedin.com', 'youtube.com', 'cloudflare.com',
];

function isPrivateIP(ip: string): boolean {
  // Handle IPv4-mapped IPv6 addresses
  const ipv4Match = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  const testIp = ipv4Match ? ipv4Match[1] : ip;
  
  const privateRanges = [
    /^127\./, /^10\./, /^192\.168\./, /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
    /^169\.254\./, /^0\./, /^224\./, /^240\./, /^255\./,
    /^::1$/, /^fe80:/i, /^fc00:/i, /^fd00:/i, /^::$/,
  ];
  
  return privateRanges.some(range => range.test(testIp));
}

async function isUrlSafe(urlString: string): Promise<{ safe: boolean; error?: string }> {
  try {
    const parsed = new URL(urlString);
    
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return { safe: false, error: 'Only HTTP/HTTPS allowed' };
    }
    
    const hostname = parsed.hostname.toLowerCase();
    if (hostname === 'localhost' || hostname.endsWith('.local') || 
        hostname.endsWith('.internal') || hostname.match(/^[\d.]+$/) ||
        hostname.includes('[')) {
      return { safe: false, error: 'Invalid hostname' };
    }
    
    try {
      const results = await dns.promises.lookup(hostname, { all: true });
      for (const result of results) {
        if (isPrivateIP(result.address)) {
          return { safe: false, error: 'Private IP not allowed' };
        }
      }
    } catch {
      return { safe: false, error: 'DNS lookup failed' };
    }
    
    return { safe: true };
  } catch {
    return { safe: false, error: 'Invalid URL' };
  }
}

function extractEmails(html: string): string[] {
  const matches = html.match(EMAIL_REGEX) || [];
  return Array.from(new Set(matches))
    .filter(email => {
      const domain = email.split('@')[1]?.toLowerCase();
      if (!domain || EXCLUDED_DOMAINS.some(ex => domain.includes(ex))) return false;
      const lower = email.toLowerCase();
      return !lower.includes('example') && !lower.includes('test@') && 
             !lower.includes('noreply') && !lower.includes('no-reply') &&
             !lower.endsWith('.png') && !lower.endsWith('.jpg');
    });
}

function extractMailtoEmails(html: string): string[] {
  const mailtoRegex = /href=["']mailto:([^"'?]+)/gi;
  const emails: string[] = [];
  let match;
  while ((match = mailtoRegex.exec(html)) !== null) {
    const email = match[1].toLowerCase().trim();
    if (email && email.includes('@')) {
      const domain = email.split('@')[1];
      if (domain && !EXCLUDED_DOMAINS.some(ex => domain.includes(ex))) {
        emails.push(email);
      }
    }
  }
  return Array.from(new Set(emails));
}

function extractFooterContent(html: string): string {
  const footerPatterns = [
    /<footer[^>]*>([\s\S]*?)<\/footer>/gi,
    /<div[^>]*(?:class|id)=["'][^"']*footer[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi,
    /<section[^>]*(?:class|id)=["'][^"']*footer[^"']*["'][^>]*>([\s\S]*?)<\/section>/gi,
  ];
  
  let footerContent = '';
  for (const pattern of footerPatterns) {
    let match;
    while ((match = pattern.exec(html)) !== null) {
      footerContent += ' ' + match[1];
    }
  }
  return footerContent;
}

function prioritizeEmails(emails: string[]): string | null {
  if (emails.length === 0) return null;
  for (const prefix of PRIORITY_PREFIXES) {
    const found = emails.find(e => e.toLowerCase().startsWith(prefix + '@'));
    if (found) return found;
  }
  return emails[0];
}

async function fetchPage(url: string, timeout: number = 5000): Promise<string | null> {
  try {
    const response = await axios.get(url, {
      timeout,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
        'Accept': 'text/html',
      },
      maxRedirects: 0, // Disable redirects to prevent SSRF bypass
      validateStatus: (status) => status >= 200 && status < 400,
      maxContentLength: 2 * 1024 * 1024,
    });
    return typeof response.data === 'string' ? response.data : null;
  } catch {
    return null;
  }
}

function normalizeUrl(url: string): string {
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return url.replace(/\/$/, '');
  }
}

export interface CrawlResult {
  email: string | null;
  allEmails: string[];
  searched: boolean;
  error?: string;
  skipped?: boolean;
}

export async function crawlWebsiteForEmail(websiteUrl: string): Promise<CrawlResult> {
  try {
    const baseUrl = normalizeUrl(websiteUrl);
    
    const safeCheck = await isUrlSafe(baseUrl);
    if (!safeCheck.safe) {
      return { email: null, allEmails: [], searched: false, skipped: true, error: safeCheck.error };
    }
    
    const allEmails: string[] = [];
    
    const mainHtml = await fetchPage(baseUrl);
    if (mainHtml) {
      // Priority 1: mailto links (most reliable)
      allEmails.push(...extractMailtoEmails(mainHtml));
      // Priority 2: Footer content (common location for contact info)
      const footerContent = extractFooterContent(mainHtml);
      if (footerContent) {
        allEmails.push(...extractMailtoEmails(footerContent));
        allEmails.push(...extractEmails(footerContent));
      }
      // Priority 3: General page scraping
      allEmails.push(...extractEmails(mainHtml));
    }
    
    // Check contact pages if main page had no emails (deduplicated paths)
    if (allEmails.length === 0) {
      const uniquePaths = Array.from(new Set(CONTACT_PATHS));
      for (const path of uniquePaths) {
        const html = await fetchPage(baseUrl + path);
        if (html) {
          // Try mailto links first
          const mailtoEmails = extractMailtoEmails(html);
          allEmails.push(...mailtoEmails);
          // Then footer
          const footerContent = extractFooterContent(html);
          if (footerContent) {
            allEmails.push(...extractMailtoEmails(footerContent));
            allEmails.push(...extractEmails(footerContent));
          }
          // Then general scraping
          const emails = extractEmails(html);
          allEmails.push(...emails);
          if (allEmails.length > 0) break;
        }
      }
    }
    
    const unique = Array.from(new Set(allEmails));
    return { email: prioritizeEmails(unique), allEmails: unique, searched: true };
  } catch (error: any) {
    return { email: null, allEmails: [], searched: false, error: error.message };
  }
}

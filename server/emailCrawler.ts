import axios from 'axios';
import { URL } from 'url';
import dns from 'dns';
import { promisify } from 'util';

const dnsLookup = promisify(dns.lookup);
const dnsLookupAll = promisify(dns.lookup) as (hostname: string, options: { all: true }) => Promise<Array<{ address: string; family: number }>>;

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

const CONTACT_PATHS = ['/contact', '/contact-us', '/about'];

const PRIORITY_PREFIXES = ['contact', 'info', 'hello', 'sales', 'support', 'admin', 'office'];

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
  return [...new Set(matches)]
    .filter(email => {
      const domain = email.split('@')[1]?.toLowerCase();
      if (!domain || EXCLUDED_DOMAINS.some(ex => domain.includes(ex))) return false;
      const lower = email.toLowerCase();
      return !lower.includes('example') && !lower.includes('test@') && 
             !lower.includes('noreply') && !lower.includes('no-reply') &&
             !lower.endsWith('.png') && !lower.endsWith('.jpg');
    });
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
      allEmails.push(...extractEmails(mainHtml));
    }
    
    // Only check contact pages if main page had no emails
    if (allEmails.length === 0) {
      for (const path of CONTACT_PATHS) {
        const html = await fetchPage(baseUrl + path);
        if (html) {
          const emails = extractEmails(html);
          allEmails.push(...emails);
          if (emails.length > 0) break;
        }
      }
    }
    
    const unique = [...new Set(allEmails)];
    return { email: prioritizeEmails(unique), allEmails: unique, searched: true };
  } catch (error: any) {
    return { email: null, allEmails: [], searched: false, error: error.message };
  }
}

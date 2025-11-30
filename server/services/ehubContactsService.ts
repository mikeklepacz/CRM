import { eq, sql, inArray, and } from 'drizzle-orm';
import { db } from '../db';
import * as googleSheets from '../googleSheets';
import { storage } from '../storage';
import { sequenceRecipients, sequences } from '../../shared/schema';
import type { EhubContact, AllContactsResponse } from '../../shared/schema';
import { detectTimezone } from './timezoneHours';

interface TenantCache {
  contacts: EhubContact[];
  timestamp: number;
}
const tenantCacheMap = new Map<string, TenantCache>();
const CACHE_TTL_MS = 5 * 60 * 1000;

// Commission Tracker status classification patterns
// Negative patterns: Explicitly indicate the contact has NOT been emailed
// Note: Normalization converts curly apostrophes to straight, so patterns only need straight apostrophes
const NEGATION_PATTERNS = [
  /\b(?:no|not|never)\s+emailed\b/,           // "not emailed", "never emailed"
  /\b(?:hasn't|haven't|didn't|won't|wasn't|weren't)\s+emailed\b/, // "hasn't emailed", "haven't emailed"
  /\b(?:un|non)emailed\b/,                    // "unemailed", "nonemailed"
  /\bemailed\s+(?:yet|ever)\b/,              // "emailed yet", "emailed ever"
  /\bno\s+one\s+emailed\b/,                 // "no one emailed"
];

// Positive patterns: Indicate the contact HAS been reached
const POSITIVE_PATTERNS = [
  /\bemailed\b/,         // "emailed", "emailed - step 1", "status: emailed"
  /\bcontacted\b/,       // "contacted"
  /\breached\s+out\b/,   // "reached out"
  /\breplied\b/,         // "replied"
];

/**
 * Determine if a Commission Tracker status indicates the contact has been reached.
 * Uses short-range negation patterns to avoid false positives like "Emailed – not interested"
 * (which means the customer WAS emailed, they just declined).
 */
export function isTrackerContacted(rawStatus: string | null | undefined): boolean {
  if (!rawStatus) return false;
  
  // Normalize: lowercase, convert curly apostrophes to straight, remove special chars (except apostrophes/hyphens), collapse whitespace
  const normalized = rawStatus
    .toLowerCase()
    .replace(/[\u2018\u2019]/g, "'")  // Convert curly apostrophes (U+2018, U+2019) to straight apostrophe
    .replace(/[^\p{L}\p{N}\s'_-]+/gu, ' ')  // Now only preserve straight apostrophes
    .replace(/\s+/g, ' ')
    .trim();
  
  if (!normalized) return false;
  
  // Check negation patterns first
  if (NEGATION_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return false;
  }
  
  // Check positive patterns
  return POSITIVE_PATTERNS.some((pattern) => pattern.test(normalized));
}

export async function getAllContacts(options: {
  page?: number;
  pageSize?: number;
  search?: string;
  statusFilter?: 'all' | 'neverContacted' | 'contacted' | 'inSequence' | 'replied' | 'bounced';
  tenantId: string;
}): Promise<AllContactsResponse> {
  const {
    page = 1,
    pageSize = 50,
    search = '',
    statusFilter = 'all',
    tenantId
  } = options;

  const now = Date.now();
  const tenantCache = tenantCacheMap.get(tenantId);
  const cacheValid = tenantCache && (now - tenantCache.timestamp < CACHE_TTL_MS);

  if (!cacheValid) {
    const contacts = await fetchAndEnrichContacts(tenantId);
    tenantCacheMap.set(tenantId, { contacts, timestamp: now });
  }

  let filteredContacts = tenantCacheMap.get(tenantId)?.contacts || [];

  if (search) {
    const searchLower = search.toLowerCase();
    filteredContacts = filteredContacts.filter(contact =>
      contact.name.toLowerCase().includes(searchLower) ||
      contact.email.toLowerCase().includes(searchLower) ||
      contact.state?.toLowerCase().includes(searchLower) ||
      contact.salesSummary?.toLowerCase().includes(searchLower)
    );
  }

  let contactsAfterSearch = filteredContacts;

  if (statusFilter !== 'all') {
    filteredContacts = filteredContacts.filter(contact => {
      switch (statusFilter) {
        case 'neverContacted':
          return contact.neverContacted;
        case 'contacted':
          return contact.contacted;
        case 'inSequence':
          return contact.inSequence;
        case 'replied':
          return contact.replied;
        case 'bounced':
          return contact.bounced;
        default:
          return true;
      }
    });
  }

  const statusCounts = {
    all: contactsAfterSearch.length,
    neverContacted: contactsAfterSearch.filter(c => c.neverContacted).length,
    contacted: contactsAfterSearch.filter(c => c.contacted).length,
    inSequence: contactsAfterSearch.filter(c => c.inSequence).length,
    replied: contactsAfterSearch.filter(c => c.replied).length,
    bounced: contactsAfterSearch.filter(c => c.bounced).length,
  };

  const total = filteredContacts.length;
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedContacts = filteredContacts.slice(startIndex, endIndex);

  return {
    contacts: paginatedContacts,
    total,
    statusCounts,
  };
}

async function fetchAndEnrichContacts(tenantId: string): Promise<EhubContact[]> {
  const allContacts: Array<{
    name: string;
    email: string;
    state?: string;
    hours?: string;
    link?: string;
    salesSummary?: string;
  }> = [];

  const storeSheet = await storage.getGoogleSheetByPurpose('Store Database', tenantId);
  
  if (storeSheet) {
    const storeData = await googleSheets.readSheetData(
      storeSheet.spreadsheetId,
      `${storeSheet.sheetName}!A:ZZ`
    );

    if (storeData && storeData.length > 0) {
      const headers = storeData[0].map((h: string) => h.toLowerCase().trim());
      const rows = storeData.slice(1);

      const nameIndex = headers.indexOf('name');
      const emailIndex = headers.indexOf('email');
      const stateIndex = headers.indexOf('state');
      const hoursIndex = headers.indexOf('hours');
      const linkIndex = headers.indexOf('link');
      const salesSummaryIndex = headers.indexOf('sales-ready summary');

      if (emailIndex !== -1) {
        const storeContacts = rows
          .filter((row: any[]) => row[emailIndex] && row[emailIndex].includes('@'))
          .map((row: any[]) => ({
            name: nameIndex !== -1 ? (row[nameIndex] || 'Unknown') : 'Unknown',
            email: row[emailIndex].trim().toLowerCase(),
            state: stateIndex !== -1 ? row[stateIndex] : undefined,
            hours: hoursIndex !== -1 ? row[hoursIndex] : undefined,
            link: linkIndex !== -1 ? row[linkIndex] : undefined,
            salesSummary: salesSummaryIndex !== -1 ? row[salesSummaryIndex] : undefined,
          }));
        allContacts.push(...storeContacts);
      }
    }
  }

  // Track emails that have been contacted according to Commission Tracker
  const trackerEmailedMap = new Map<string, boolean>();
  
  const commissionSheet = await storage.getGoogleSheetByPurpose('commissions', tenantId);
  
  if (commissionSheet) {
    const commissionData = await googleSheets.readSheetData(
      commissionSheet.spreadsheetId,
      `${commissionSheet.sheetName}!A:ZZ`
    );

    if (commissionData && commissionData.length > 0) {
      const headers = commissionData[0];
      const rows = commissionData.slice(1);

      const pocEmailIndex = headers.findIndex((h: string) => h.trim() === 'POC EMAIL');
      const linkIndex = headers.findIndex((h: string) => h.toLowerCase().trim() === 'link');
      const nameIndex = headers.findIndex((h: string) => h.toLowerCase().trim() === 'name');
      const stateIndex = headers.findIndex((h: string) => h.toLowerCase().trim() === 'state');
      const statusIndex = headers.findIndex((h: string) => h.toLowerCase().trim() === 'status');

      if (pocEmailIndex !== -1) {
        const commissionContacts = rows
          .filter((row: any[]) => row[pocEmailIndex] && row[pocEmailIndex].includes('@'))
          .map((row: any[]) => {
            const email = row[pocEmailIndex].trim().toLowerCase();
            const status = statusIndex !== -1 ? (row[statusIndex] || '').trim() : '';
            
            // Track if this email has been contacted according to Commission Tracker
            if (isTrackerContacted(status)) {
              trackerEmailedMap.set(email, true);
            }
            
            return {
              name: nameIndex !== -1 ? (row[nameIndex] || 'Unknown') : 'Unknown',
              email,
              state: stateIndex !== -1 ? row[stateIndex] : undefined,
              hours: undefined,
              link: linkIndex !== -1 ? row[linkIndex] : undefined,
              salesSummary: undefined,
            };
          });
        allContacts.push(...commissionContacts);
      }
    }
  }

  const emailMap = new Map<string, typeof allContacts[0]>();
  allContacts.forEach(contact => {
    if (!emailMap.has(contact.email)) {
      emailMap.set(contact.email, contact);
    }
  });

  const contactsFromSheet = Array.from(emailMap.values());

  const uniqueEmails = [...new Set(contactsFromSheet.map(c => c.email))];

  // Query ALL sequence_recipients to build complete history
  let allRecipientData: Array<{
    email: string;
    sequenceId: string;
    sequenceName: string | null;
    replied: Date | null;
    bounced: string | null;
    status: string;
  }> = [];

  if (uniqueEmails.length > 0) {
    allRecipientData = await db
      .select({
        email: sql<string>`LOWER(${sequenceRecipients.email})`,
        sequenceId: sequenceRecipients.sequenceId,
        sequenceName: sql<string>`${sequences.name}`,
        replied: sequenceRecipients.repliedAt,
        bounced: sequenceRecipients.bounceType,
        status: sequenceRecipients.status,
      })
      .from(sequenceRecipients)
      .innerJoin(sequences, eq(sequenceRecipients.sequenceId, sequences.id))
      .where(
        and(
          eq(sequences.tenantId, tenantId),
          sql`LOWER(${sequenceRecipients.email}) = ANY(${sql.raw(`ARRAY[${uniqueEmails.map(e => `'${e.replace(/'/g, "''")}'`).join(',')}]`)})`
        )
      );
  }

  // Build hasSequenceHistory map (any email that was EVER in a sequence)
  const hasSequenceHistoryMap = new Map<string, boolean>();
  allRecipientData.forEach(row => {
    hasSequenceHistoryMap.set(row.email, true);
  });

  // Build emailStatusMap for ACTIVE recipients only
  const emailStatusMap = new Map<string, {
    inSequence: boolean;
    replied: boolean;
    bounced: boolean;
    sequenceNames: string[];
  }>();

  allRecipientData.forEach(row => {
    const existing = emailStatusMap.get(row.email) || {
      inSequence: false,
      replied: false,
      bounced: false,
      sequenceNames: [],
    };

    // Only mark as inSequence if status is 'in_sequence'
    if (row.status === 'in_sequence') {
      existing.inSequence = true;
      if (row.sequenceName && !existing.sequenceNames.includes(row.sequenceName)) {
        existing.sequenceNames.push(row.sequenceName);
      }
    }
    
    if (row.replied) existing.replied = true;
    if (row.bounced) existing.bounced = true;

    emailStatusMap.set(row.email, existing);
  });

  const enrichedContacts: EhubContact[] = contactsFromSheet.map(contact => {
    const status = emailStatusMap.get(contact.email) || {
      inSequence: false,
      replied: false,
      bounced: false,
      sequenceNames: [],
    };

    const timezone = contact.state ? detectTimezone(contact.state) : undefined;
    
    // Check if contact has been emailed according to Commission Tracker
    const emailedInTracker = trackerEmailedMap.get(contact.email) || false;
    
    // Check if contact has EVER been in a sequence (historical record)
    const hasSequenceHistory = hasSequenceHistoryMap.get(contact.email) || false;

    return {
      name: contact.name,
      email: contact.email,
      state: contact.state,
      timezone,
      hours: contact.hours,
      link: contact.link,
      salesSummary: contact.salesSummary,
      neverContacted: !emailedInTracker && !hasSequenceHistory,
      contacted: (emailedInTracker || hasSequenceHistory) && !status.inSequence,
      inSequence: status.inSequence,
      replied: status.replied,
      bounced: status.bounced,
      sequenceNames: status.sequenceNames,
    };
  });

  return enrichedContacts;
}

export function invalidateCache(tenantId?: string) {
  if (tenantId) {
    tenantCacheMap.delete(tenantId);
  } else {
    tenantCacheMap.clear();
  }
}

import { eq, sql, inArray } from 'drizzle-orm';
import { db } from '../db';
import * as googleSheets from '../googleSheets';
import { storage } from '../storage';
import { sequenceRecipients, sequences } from '../../shared/schema';
import type { EhubContact, AllContactsResponse } from '../../shared/schema';
import { detectTimezone } from './timezoneHours';

let cachedContacts: EhubContact[] | null = null;
let cacheTimestamp: number | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000;

export async function getAllContacts(options: {
  page?: number;
  pageSize?: number;
  search?: string;
  statusFilter?: 'all' | 'neverContacted' | 'inSequence' | 'replied' | 'bounced';
}): Promise<AllContactsResponse> {
  const {
    page = 1,
    pageSize = 50,
    search = '',
    statusFilter = 'all'
  } = options;

  const now = Date.now();
  const cacheValid = cachedContacts && cacheTimestamp && (now - cacheTimestamp < CACHE_TTL_MS);

  if (!cacheValid) {
    cachedContacts = await fetchAndEnrichContacts();
    cacheTimestamp = now;
  }

  let filteredContacts = cachedContacts || [];

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

async function fetchAndEnrichContacts(): Promise<EhubContact[]> {
  const allContacts: Array<{
    name: string;
    email: string;
    state?: string;
    hours?: string;
    link?: string;
    salesSummary?: string;
  }> = [];

  const storeSheet = await storage.getGoogleSheetByPurpose('Store Database');
  
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

  const commissionSheet = await storage.getGoogleSheetByPurpose('commissions');
  
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

      if (pocEmailIndex !== -1) {
        const commissionContacts = rows
          .filter((row: any[]) => row[pocEmailIndex] && row[pocEmailIndex].includes('@'))
          .map((row: any[]) => ({
            name: nameIndex !== -1 ? (row[nameIndex] || 'Unknown') : 'Unknown',
            email: row[pocEmailIndex].trim().toLowerCase(),
            state: stateIndex !== -1 ? row[stateIndex] : undefined,
            hours: undefined,
            link: linkIndex !== -1 ? row[linkIndex] : undefined,
            salesSummary: undefined,
          }));
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

  let recipientData: Array<{
    email: string;
    sequenceId: string;
    sequenceName: string | null;
    replied: Date | null;
    bounced: string | null;
  }> = [];

  if (uniqueEmails.length > 0) {
    recipientData = await db
      .select({
        email: sql<string>`LOWER(${sequenceRecipients.email})`,
        sequenceId: sequenceRecipients.sequenceId,
        sequenceName: sql<string>`${sequences.name}`,
        replied: sequenceRecipients.repliedAt,
        bounced: sequenceRecipients.bounceType,
      })
      .from(sequenceRecipients)
      .innerJoin(sequences, eq(sequenceRecipients.sequenceId, sequences.id))
      .where(
        sql`LOWER(${sequenceRecipients.email}) = ANY(${sql.raw(`ARRAY[${uniqueEmails.map(e => `'${e.replace(/'/g, "''")}'`).join(',')}]`)})`
      );
  }

  const emailStatusMap = new Map<string, {
    inSequence: boolean;
    replied: boolean;
    bounced: boolean;
    sequenceNames: string[];
  }>();

  recipientData.forEach(row => {
    const existing = emailStatusMap.get(row.email) || {
      inSequence: false,
      replied: false,
      bounced: false,
      sequenceNames: [],
    };

    existing.inSequence = true;
    if (row.replied) existing.replied = true;
    if (row.bounced) existing.bounced = true;
    if (row.sequenceName && !existing.sequenceNames.includes(row.sequenceName)) {
      existing.sequenceNames.push(row.sequenceName);
    }

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

    return {
      name: contact.name,
      email: contact.email,
      state: contact.state,
      timezone,
      hours: contact.hours,
      link: contact.link,
      salesSummary: contact.salesSummary,
      neverContacted: !status.inSequence,
      inSequence: status.inSequence,
      replied: status.replied,
      bounced: status.bounced,
      sequenceNames: status.sequenceNames,
    };
  });

  return enrichedContacts;
}

export function invalidateCache() {
  cachedContacts = null;
  cacheTimestamp = null;
}

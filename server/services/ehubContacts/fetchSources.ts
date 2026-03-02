import { eq, sql } from 'drizzle-orm';
import { db } from '../../db';
import * as googleSheets from '../../googleSheets';
import { storage } from '../../storage';
import { apolloCompanies, apolloContacts } from '../../../shared/schema';
import { getAllowedEhubCategoryNames } from '../ehubProjectScope';
import { isTrackerContacted } from './classification';

export async function fetchSourceContacts(tenantId: string, projectId?: string): Promise<{
  contacts: Array<{
    name: string;
    email: string;
    state?: string;
    hours?: string;
    link?: string;
    salesSummary?: string;
  }>;
  trackerEmailedMap: Map<string, boolean>;
}> {
  const allContacts: Array<{
    name: string;
    email: string;
    state?: string;
    hours?: string;
    link?: string;
    salesSummary?: string;
  }> = [];

  let allowedCategoryNames: Set<string> | null = null;
  if (projectId) {
    allowedCategoryNames = await getAllowedEhubCategoryNames(tenantId, projectId);
    if (allowedCategoryNames.size === 0) {
      return { contacts: [], trackerEmailedMap: new Map() };
    }
  }

  const linkToCategoryMap = new Map<string, string>();

  const storeSheet = await storage.getGoogleSheetByPurpose('Store Database', tenantId);
  if (storeSheet) {
    const storeData = await googleSheets.readSheetData(storeSheet.spreadsheetId, `${storeSheet.sheetName}!A:ZZ`);
    if (storeData && storeData.length > 0) {
      const headers = storeData[0].map((h: string) => h.toLowerCase().trim());
      const rows = storeData.slice(1);

      const nameIndex = headers.indexOf('name');
      const emailIndex = headers.indexOf('email');
      const stateIndex = headers.indexOf('state');
      const hoursIndex = headers.indexOf('hours');
      const linkIndex = headers.indexOf('link');
      const salesSummaryIndex = headers.indexOf('sales-ready summary');
      const categoryIndex = headers.indexOf('category');

      if (linkIndex !== -1 && categoryIndex !== -1) {
        rows.forEach((row: any[]) => {
          const link = (row[linkIndex] || '').trim().toLowerCase();
          const category = (row[categoryIndex] || '').toLowerCase().trim();
          if (link && category) linkToCategoryMap.set(link, category);
        });
      }

      if (emailIndex !== -1) {
        const storeContacts = rows
          .filter((row: any[]) => {
            if (!row[emailIndex] || !row[emailIndex].includes('@')) return false;
            if (allowedCategoryNames !== null && categoryIndex !== -1) {
              const rowCategory = (row[categoryIndex] || '').toLowerCase().trim();
              if (!rowCategory || !allowedCategoryNames.has(rowCategory)) return false;
            }
            return true;
          })
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

  try {
    const apolloContactsData = await db
      .select({
        firstName: apolloContacts.firstName,
        lastName: apolloContacts.lastName,
        email: apolloContacts.email,
        title: apolloContacts.title,
        seniority: apolloContacts.seniority,
        phone: apolloContacts.phone,
        googleSheetLink: apolloContacts.googleSheetLink,
        companyId: apolloContacts.companyId,
        city: apolloContacts.city,
        state: apolloContacts.state,
      })
      .from(apolloContacts)
      .where(eq(apolloContacts.tenantId, tenantId));

    const companyIds = [...new Set(apolloContactsData.filter(c => c.companyId).map(c => c.companyId!))];
    const companiesData = companyIds.length > 0
      ? await db.select().from(apolloCompanies).where(
          sql`${apolloCompanies.id} IN (${sql.join(companyIds.map(id => sql`${id}`), sql`, `)})`
        )
      : [];
    const companyMap = new Map(companiesData.map(c => [c.id, c]));

    const existingEmails = new Set(allContacts.map(c => c.email.toLowerCase()));

    for (const apolloContact of apolloContactsData) {
      if (!apolloContact.email || !apolloContact.email.includes('@')) continue;

      const email = apolloContact.email.trim().toLowerCase();
      if (existingEmails.has(email)) continue;

      const company = apolloContact.companyId ? companyMap.get(apolloContact.companyId) : null;
      const name = [apolloContact.firstName, apolloContact.lastName].filter(Boolean).join(' ') || 'Unknown';

      if (allowedCategoryNames !== null && apolloContact.googleSheetLink) {
        const linkedCategory = linkToCategoryMap.get(apolloContact.googleSheetLink.toLowerCase());
        if (!linkedCategory || !allowedCategoryNames.has(linkedCategory)) continue;
      }

      const details: string[] = [];
      if (company?.name) details.push(`at ${company.name}`);
      if (apolloContact.title) details.push(apolloContact.title);
      if (apolloContact.seniority) details.push(`(${apolloContact.seniority})`);
      if (apolloContact.phone) details.push(`Phone: ${apolloContact.phone}`);

      allContacts.push({
        name: `${name}${apolloContact.title ? ` - ${apolloContact.title}` : ''}`,
        email,
        state: apolloContact.state || company?.state || undefined,
        link: apolloContact.googleSheetLink || undefined,
        salesSummary: details.length > 0 ? `Apollo: ${details.join(' | ')}` : 'Apollo-enriched contact',
      });
      existingEmails.add(email);
    }
  } catch (err) {
    console.error('[E-Hub] Error fetching Apollo contacts:', err);
  }

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
          .filter((row: any[]) => {
            if (!row[pocEmailIndex] || !row[pocEmailIndex].includes('@')) return false;
            if (allowedCategoryNames !== null && linkIndex !== -1) {
              const rowLink = (row[linkIndex] || '').trim().toLowerCase();
              const linkedCategory = linkToCategoryMap.get(rowLink);
              if (!linkedCategory || !allowedCategoryNames.has(linkedCategory)) return false;
            }
            return true;
          })
          .map((row: any[]) => {
            const email = row[pocEmailIndex].trim().toLowerCase();
            const status = statusIndex !== -1 ? (row[statusIndex] || '').trim() : '';
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

  return { contacts: Array.from(emailMap.values()), trackerEmailedMap };
}

import { storage } from '../storage';
import * as googleSheets from '../googleSheets';

interface ExpirationResult {
  processed: number;
  expired: number;
  errors: string[];
}

interface ExpirationConfig {
  claimedOnlyDays: number;
  otherStatusDays: number;
}

const DEFAULT_CONFIG: ExpirationConfig = {
  claimedOnlyDays: 14,
  otherStatusDays: 60,
};

const EXPIRABLE_STATUSES = ['claimed', 'emailed', 'contacted', 'interested', 'sample sent'];

function columnIndexToLetter(index: number): string {
  let result = '';
  let n = index;
  while (n >= 0) {
    result = String.fromCharCode((n % 26) + 65) + result;
    n = Math.floor(n / 26) - 1;
  }
  return result;
}

function parseDate(dateStr: string): Date | null {
  if (!dateStr || dateStr.trim() === '') return null;
  
  try {
    const cleaned = dateStr.trim();
    
    if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(cleaned)) {
      const parts = cleaned.split('/');
      const month = parseInt(parts[0], 10) - 1;
      const day = parseInt(parts[1], 10);
      let year = parseInt(parts[2], 10);
      if (year < 100) year += 2000;
      return new Date(year, month, day);
    }
    
    const parsed = new Date(cleaned);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
    
    return null;
  } catch {
    return null;
  }
}

function getDaysSince(date: Date): number {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

export async function processClaimExpirations(
  tenantId: string,
  config: ExpirationConfig = DEFAULT_CONFIG
): Promise<ExpirationResult> {
  const result: ExpirationResult = {
    processed: 0,
    expired: 0,
    errors: [],
  };

  try {
    const trackerSheet = await storage.getGoogleSheetByPurpose('commissions', tenantId);
    if (!trackerSheet) {
      console.log(`[ClaimExpiration] No Commission Tracker sheet configured for tenant ${tenantId}`);
      return result;
    }

    const isConfigured = await googleSheets.isSystemGoogleSheetsConfigured();
    if (!isConfigured) {
      console.log(`[ClaimExpiration] Google Sheets not configured for tenant ${tenantId}`);
      return result;
    }

    const range = `${trackerSheet.sheetName}!A:ZZ`;
    const rows = await googleSheets.readSheetData(trackerSheet.spreadsheetId, range);

    if (!rows || rows.length <= 1) {
      console.log(`[ClaimExpiration] Commission Tracker is empty for tenant ${tenantId}`);
      return result;
    }

    const headers = rows[0].map((h: string) => h?.toString().toLowerCase().trim() || '');
    const linkIndex = headers.findIndex((h: string) => h === 'link');
    const agentNameIndex = headers.findIndex((h: string) => h === 'agent name');
    const statusIndex = headers.findIndex((h: string) => h === 'status');
    const dateIndex = headers.findIndex((h: string) => h === 'date');
    const parentLinkIndex = headers.findIndex((h: string) => h === 'parent link');

    if (statusIndex === -1 || agentNameIndex === -1) {
      console.log(`[ClaimExpiration] Required columns not found for tenant ${tenantId}`);
      return result;
    }

    console.log(`[ClaimExpiration] Processing ${rows.length - 1} rows for tenant ${tenantId}`);

    const effectiveLinkToLatestDate = new Map<string, Date>();
    const effectiveLinkToStatus = new Map<string, string>();
    const effectiveLinkToRows = new Map<string, number[]>();
    
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const link = row[linkIndex]?.toString().trim() || '';
      const parentLink = parentLinkIndex !== -1 ? row[parentLinkIndex]?.toString().trim() || '' : '';
      const agentName = row[agentNameIndex]?.toString().trim() || '';
      const status = row[statusIndex]?.toString().trim() || '';
      const dateStr = dateIndex !== -1 ? row[dateIndex]?.toString() || '' : '';
      
      const effectiveLink = parentLink || link;
      if (!effectiveLink) continue;
      
      if (!effectiveLinkToRows.has(effectiveLink)) {
        effectiveLinkToRows.set(effectiveLink, []);
      }
      effectiveLinkToRows.get(effectiveLink)!.push(i + 1);
      
      const date = parseDate(dateStr);
      if (date) {
        const existing = effectiveLinkToLatestDate.get(effectiveLink);
        if (!existing || date > existing) {
          effectiveLinkToLatestDate.set(effectiveLink, date);
        }
      }
      
      if (agentName && status && !effectiveLinkToStatus.has(effectiveLink)) {
        effectiveLinkToStatus.set(effectiveLink, status);
      }
    }

    const expiredLinks: { link: string; status: string; daysSince: number }[] = [];

    for (const [effectiveLink, status] of effectiveLinkToStatus.entries()) {
      const statusLower = status.toLowerCase();
      if (!EXPIRABLE_STATUSES.includes(statusLower)) continue;
      
      const latestDate = effectiveLinkToLatestDate.get(effectiveLink);
      if (!latestDate) continue;
      
      result.processed++;
      
      const daysSince = getDaysSince(latestDate);
      const expirationDays = statusLower === 'claimed' 
        ? config.claimedOnlyDays 
        : config.otherStatusDays;

      if (daysSince >= expirationDays) {
        expiredLinks.push({
          link: effectiveLink,
          status,
          daysSince,
        });
      }
    }

    if (expiredLinks.length === 0) {
      console.log(`[ClaimExpiration] No expired claims found for tenant ${tenantId}`);
      return result;
    }

    console.log(`[ClaimExpiration] Found ${expiredLinks.length} expired claims for tenant ${tenantId}`);

    const statusCol = columnIndexToLetter(statusIndex);
    const agentCol = columnIndexToLetter(agentNameIndex);

    for (const expired of expiredLinks) {
      const rowNumbers = effectiveLinkToRows.get(expired.link) || [];
      
      for (const rowNum of rowNumbers) {
        try {
          await googleSheets.writeSheetData(
            trackerSheet.spreadsheetId,
            `${trackerSheet.sheetName}!${statusCol}${rowNum}`,
            [['']]
          );
          
          await googleSheets.writeSheetData(
            trackerSheet.spreadsheetId,
            `${trackerSheet.sheetName}!${agentCol}${rowNum}`,
            [['']]
          );
          
          result.expired++;
          
          console.log(`[ClaimExpiration] Unclaimed row ${rowNum} for ${expired.link} (${expired.status}, ${expired.daysSince} days inactive)`);
        } catch (writeError: any) {
          result.errors.push(`Failed to unclaim row ${rowNum}: ${writeError.message}`);
        }
      }
    }

    console.log(`[ClaimExpiration] Expired ${result.expired} rows for tenant ${tenantId}`);

  } catch (error: any) {
    result.errors.push(`Expiration processing error: ${error.message}`);
    console.error(`[ClaimExpiration] Error for tenant ${tenantId}:`, error);
  }

  return result;
}

let expirationInterval: NodeJS.Timeout | null = null;

export function startClaimExpirationWorker(intervalMs: number = 60 * 60 * 1000): void {
  if (expirationInterval) {
    console.log('[ClaimExpiration] Worker already running');
    return;
  }

  console.log(`[ClaimExpiration] Starting background worker (interval: ${intervalMs / 1000}s)`);

  expirationInterval = setInterval(async () => {
    try {
      const tenants = await storage.getAllTenants();

      for (const tenant of tenants) {
        if (tenant.status !== 'active') continue;

        try {
          const result = await processClaimExpirations(tenant.id);
          if (result.expired > 0) {
            console.log(`[ClaimExpiration] Tenant ${tenant.id}: expired ${result.expired} claims`);
          }
        } catch (tenantError: any) {
          console.error(`[ClaimExpiration] Error for tenant ${tenant.id}:`, tenantError.message);
        }
      }
    } catch (error: any) {
      console.error('[ClaimExpiration] Worker error:', error.message);
    }
  }, intervalMs);
}

export function stopClaimExpirationWorker(): void {
  if (expirationInterval) {
    clearInterval(expirationInterval);
    expirationInterval = null;
    console.log('[ClaimExpiration] Worker stopped');
  }
}

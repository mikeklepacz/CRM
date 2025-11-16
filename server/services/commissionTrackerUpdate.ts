import { storage } from '../storage';
import * as googleSheets from '../googleSheets';
import { normalizeLink } from '../../shared/linkUtils';
import { format } from 'date-fns';

/**
 * Update Commission Tracker Status when an action occurs (e.g., email sent)
 * Creates a new row if one doesn't exist for the store/agent combination
 */
export async function updateCommissionTrackerStatus(
  link: string,
  agentName: string,
  newStatus: string
): Promise<{ success: boolean; message?: string; created?: boolean }> {
  try {
    // Find Commission Tracker sheet
    const sheets = await storage.getAllActiveGoogleSheets();
    const trackerSheet = sheets.find(s => s.sheetPurpose === 'commissions');
    
    if (!trackerSheet) {
      console.log('[Tracker Status Update] No Commission Tracker configured - skipping');
      return { success: false, message: 'Commission Tracker sheet not configured' };
    }

    const { spreadsheetId, sheetName } = trackerSheet;
    const normalizedInputLink = normalizeLink(link.trim());
    
    console.log(`[Tracker Status Update] Processing link: ${normalizedInputLink}, agent: ${agentName}, status: ${newStatus}`);

    // Read Commission Tracker data
    const trackerRange = `${sheetName}!A:ZZ`;
    const trackerRows = await googleSheets.readSheetData(spreadsheetId, trackerRange);
    
    if (trackerRows.length === 0) {
      console.log('[Tracker Status Update] Empty tracker sheet - cannot proceed');
      return { success: false, message: 'Commission Tracker sheet has no headers' };
    }

    const trackerHeaders = trackerRows[0];
    const linkIndex = trackerHeaders.findIndex(h => h?.toString().toLowerCase() === 'link');
    const agentNameIndex = trackerHeaders.findIndex(h => h?.toString().toLowerCase() === 'agent name');
    const statusIndex = trackerHeaders.findIndex(h => h?.toString().toLowerCase() === 'status');
    const dateIndex = trackerHeaders.findIndex(h => h?.toString().toLowerCase() === 'date');

    if (linkIndex === -1 || statusIndex === -1) {
      console.log('[Tracker Status Update] Missing Link or Status column');
      return { success: false, message: 'Missing required columns (Link or Status)' };
    }

    // Find the row by normalized link AND agent name
    let rowIndex = -1;
    for (let i = 1; i < trackerRows.length; i++) {
      const rowLink = trackerRows[i][linkIndex];
      const rowAgent = agentNameIndex !== -1 ? trackerRows[i][agentNameIndex] : '';
      
      if (rowLink && normalizeLink(rowLink) === normalizedInputLink) {
        // If agent name column exists, match on both link AND agent
        if (agentNameIndex !== -1) {
          if (rowAgent?.toString().trim() === agentName.trim()) {
            rowIndex = i + 1; // 1-indexed for Google Sheets
            break;
          }
        } else {
          // No agent name column, just match on link
          rowIndex = i + 1;
          break;
        }
      }
    }

    const formattedDate = format(new Date(), 'M/d/yyyy');

    if (rowIndex === -1) {
      // Row doesn't exist - create it with the new status
      console.log('[Tracker Status Update] Row not found, creating new row');
      
      const headers = trackerHeaders.filter(h => h && h.trim() !== '');
      const newRow = new Array(headers.length).fill('');
      
      newRow[linkIndex] = link;
      if (agentNameIndex !== -1) newRow[agentNameIndex] = agentName;
      if (statusIndex !== -1) newRow[statusIndex] = newStatus;
      if (dateIndex !== -1) newRow[dateIndex] = formattedDate;
      
      await googleSheets.appendSheetData(spreadsheetId, `${sheetName}!A:ZZ`, [newRow]);
      console.log(`[Tracker Status Update] ✅ Created new row with Status="${newStatus}"`);
      
      return { success: true, message: 'Commission Tracker row created', created: true };
    } else {
      // Row exists - update the status
      console.log(`[Tracker Status Update] Updating existing row ${rowIndex}`);
      
      const statusCol = String.fromCharCode(65 + statusIndex);
      await googleSheets.writeSheetData(
        spreadsheetId,
        `${sheetName}!${statusCol}${rowIndex}`,
        [[newStatus]]
      );

      console.log(`[Tracker Status Update] ✅ Updated Status to "${newStatus}" for row ${rowIndex}`);
      
      return { success: true, message: 'Commission Tracker status updated', created: false };
    }

  } catch (error: any) {
    console.error(`[Tracker Status Update] ❌ Error: ${error.message}`);
    return { success: false, message: error.message };
  }
}

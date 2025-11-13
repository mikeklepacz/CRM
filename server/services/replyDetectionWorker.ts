import { storage } from '../storage';
import { checkForReplies } from './gmailReplyDetection';
import * as googleSheets from '../googleSheets';
import { normalizeLink } from '../../shared/linkUtils';

/**
 * Background worker that checks all active email threads for replies
 * Runs every 5 minutes to detect when recipients have replied
 */

let isRunning = false;
let checkInterval: NodeJS.Timeout | null = null;

/**
 * Update Commission Tracker Status to "Replied" when reply is detected
 */
async function updateCommissionTrackerOnReply(recipientLink: string, recipientEmail: string): Promise<void> {
  try {
    // Find Commission Tracker sheet
    const sheets = await storage.getAllActiveGoogleSheets();
    const trackerSheet = sheets.find(s => s.sheetPurpose === 'commissions');
    
    if (!trackerSheet) {
      console.log('[ReplyWorker] No Commission Tracker configured - skipping tracker update');
      return;
    }

    // Read Commission Tracker data
    const trackerRange = `${trackerSheet.sheetName}!A:ZZ`;
    const trackerRows = await googleSheets.readSheetData(trackerSheet.spreadsheetId, trackerRange);
    
    if (trackerRows.length === 0) {
      console.log('[ReplyWorker] Empty tracker sheet - skipping tracker update');
      return;
    }

    const trackerHeaders = trackerRows[0];
    const linkIndex = trackerHeaders.findIndex(h => h.toLowerCase() === 'link');
    const statusIndex = trackerHeaders.findIndex(h => h.toLowerCase() === 'status');

    if (linkIndex === -1 || statusIndex === -1) {
      console.log('[ReplyWorker] Missing Link or Status column - skipping tracker update');
      return;
    }

    // Find the row by normalized link
    const normalizedInputLink = normalizeLink(recipientLink);
    let rowIndex = -1;

    for (let i = 1; i < trackerRows.length; i++) {
      const rowLink = trackerRows[i][linkIndex];
      if (rowLink && normalizeLink(rowLink) === normalizedInputLink) {
        rowIndex = i + 1; // 1-indexed for Google Sheets
        break;
      }
    }

    if (rowIndex === -1) {
      console.log(`[ReplyWorker] Store not found in Commission Tracker for ${recipientEmail}`);
      return;
    }

    // Update Status to "Replied"
    const statusCol = String.fromCharCode(65 + statusIndex);
    await googleSheets.writeSheetData(
      trackerSheet.spreadsheetId,
      `${trackerSheet.sheetName}!${statusCol}${rowIndex}`,
      [['Replied']]
    );

    console.log(`[ReplyWorker] ✅ Updated Commission Tracker Status to "Replied" for ${recipientEmail}`);

  } catch (error: any) {
    console.error(`[ReplyWorker] ❌ Error updating Commission Tracker: ${error.message}`);
    // Don't fail reply detection if tracker update fails
  }
}

/**
 * Check all active threads for replies and update database
 */
async function checkActiveThreadsForReplies() {
  if (isRunning) {
    console.log('[ReplyWorker] Previous check still running, skipping...');
    return;
  }

  isRunning = true;

  try {
    // Get all active recipients with thread IDs (not replied yet)
    const activeRecipients = await storage.getActiveRecipientsWithThreads();

    if (activeRecipients.length === 0) {
      console.log('[ReplyWorker] No active threads to check');
      return;
    }

    console.log(`[ReplyWorker] Checking ${activeRecipients.length} active threads for replies...`);

    let repliesDetected = 0;
    let errors = 0;

    // Check each recipient's thread for replies
    for (const recipient of activeRecipients) {
      try {
        // Skip if no thread ID (shouldn't happen due to query filter)
        if (!recipient.threadId) continue;

        // Get the user ID who owns this sequence (admin/agent who created it)
        const sequence = await storage.getSequence(recipient.sequenceId);
        if (!sequence?.createdBy) {
          console.warn(`[ReplyWorker] Sequence ${recipient.sequenceId} has no owner`);
          continue;
        }

        // Check for replies using the sequence owner's Gmail credentials
        const replyResult = await checkForReplies(sequence.createdBy, recipient.threadId);

        // If reply detected, update recipient status
        if (replyResult.hasReply && !recipient.repliedAt) {
          await storage.updateRecipientStatus(recipient.id, {
            status: 'replied',
            repliedAt: new Date(),
            replyCount: replyResult.replyCount,
            nextSendAt: null, // Stop future sends
          });

          // Update Commission Tracker Status to "Replied"
          await updateCommissionTrackerOnReply(recipient.link, recipient.email);

          // Update sequence stats
          const currentStats = await storage.getSequence(recipient.sequenceId);
          await storage.updateSequenceStats(recipient.sequenceId, {
            repliedCount: (currentStats?.repliedCount || 0) + 1,
          });

          repliesDetected++;
          console.log(`[ReplyWorker] ✅ Reply detected for ${recipient.email} (${replyResult.replyCount} replies)`);
        }

      } catch (error: any) {
        errors++;
        console.error(`[ReplyWorker] Error checking thread for ${recipient.email}:`, error.message);
        // Continue processing other recipients even if one fails
      }
    }

    console.log(`[ReplyWorker] Check complete: ${repliesDetected} new replies detected, ${errors} errors`);

  } catch (error: any) {
    console.error('[ReplyWorker] Fatal error in reply detection worker:', error);
  } finally {
    isRunning = false;
  }
}

/**
 * Start the reply detection background worker
 * Checks every 5 minutes (300000ms)
 */
export function startReplyDetectionWorker() {
  console.log('[ReplyWorker] Starting reply detection background worker (checks every 5 minutes)');

  // Run immediately on startup
  checkActiveThreadsForReplies();

  // Then run every 5 minutes
  checkInterval = setInterval(checkActiveThreadsForReplies, 5 * 60 * 1000);
}

/**
 * Stop the reply detection worker (for graceful shutdown)
 */
export function stopReplyDetectionWorker() {
  if (checkInterval) {
    clearInterval(checkInterval);
    checkInterval = null;
    console.log('[ReplyWorker] Reply detection worker stopped');
  }
}

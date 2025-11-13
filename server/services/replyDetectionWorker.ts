import { storage } from '../storage';
import { checkForReplies } from './gmailReplyDetection';

/**
 * Background worker that checks all active email threads for replies
 * Runs every 5 minutes to detect when recipients have replied
 */

let isRunning = false;
let checkInterval: NodeJS.Timeout | null = null;

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

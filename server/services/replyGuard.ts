import { checkForReplies } from './gmailReplyDetection';

interface ShouldSendEmailParams {
  userId: string;
  threadId: string | null;
  scheduledAt: Date;
}

/**
 * Reply Guard: Centralized logic to check if an email should be sent
 * 
 * This function implements the two-gate reply detection system:
 * 1. Check at scheduledAt - 60 seconds (pre-check)
 * 2. Check at scheduledAt (final check)
 * 
 * This replaces the old continuous polling worker architecture.
 * 
 * @param userId - User ID for Gmail API authentication
 * @param threadId - Gmail thread ID to check for replies (null for first emails)
 * @param scheduledAt - When this email is scheduled to send
 * @returns true if email should be sent, false if reply detected
 */
export async function shouldSendEmail({
  userId,
  threadId,
  scheduledAt,
}: ShouldSendEmailParams): Promise<boolean> {
  // If no thread exists yet (first email in sequence), always allow send
  if (!threadId) {
    return true;
  }

  const now = new Date();
  const scheduledTime = new Date(scheduledAt);
  const preCheckTime = new Date(scheduledTime.getTime() - 60 * 1000); // 60 seconds before

  // GATE 1: Before pre-check window - don't check yet, allow send to proceed
  if (now < preCheckTime) {
    return true;
  }

  // GATE 2: Within pre-check window OR at/after scheduled time - check for replies
  // This covers both:
  // - scheduledAt - 60 seconds to scheduledAt (pre-check window)
  // - scheduledAt and beyond (final check)
  try {
    console.log(`[ReplyGuard] Checking for replies on thread ${threadId} (scheduled: ${scheduledTime.toISOString()})`);
    
    const replyCheck = await checkForReplies(userId, threadId);
    
    if (replyCheck.hasReply) {
      console.log(`[ReplyGuard] ❌ Reply detected - blocking send`);
      return false;
    }
    
    console.log(`[ReplyGuard] ✅ No reply detected - allowing send`);
    return true;
  } catch (error: any) {
    console.error(`[ReplyGuard] ⚠️  Reply check failed: ${error.message}`);
    console.error(`[ReplyGuard] ⚠️  Defaulting to ALLOW send (fail-open for deliverability)`);
    // Fail-open: if Gmail API fails, don't block the send
    return true;
  }
}

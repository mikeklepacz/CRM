import { db } from '../db';
import { sequenceRecipients, sequenceRecipientMessages, sequences, users, userIntegrations, systemIntegrations } from '@shared/schema';
import { eq, and, lt, sql } from 'drizzle-orm';

interface ReplyCheckResult {
  recipientId: string;
  email: string;
  messageId: string;
  sentAt: Date;
  hasReply: boolean;
  threadId?: string;
}

interface ScanResult {
  scanned: number;
  promoted: number;
  errors: number;
  details: {
    recipientId: string;
    email: string;
    status: 'promoted' | 'has_reply' | 'too_recent' | 'error';
    message?: string;
  }[];
}

/**
 * Gmail Reply Scanner Service
 * 
 * Scans Manual Follow-Ups sequence recipients at Step 0 for email replies.
 * Auto-promotes recipients with no replies after waitDays to Step 1 for Matrix2 scheduling.
 */
export class GmailReplyScanner {
  private waitDays: number = 3; // Default wait time before checking for replies

  /**
   * Check Gmail API for replies to a specific message
   */
  private async checkForReplies(
    messageId: string,
    accessToken: string
  ): Promise<{ hasReply: boolean; threadId?: string }> {
    try {
      // Get the message to find its thread ID
      const messageResponse = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}`,
        {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        }
      );

      if (!messageResponse.ok) {
        console.error(`[ReplyScanner] Failed to fetch message ${messageId}: ${messageResponse.status}`);
        return { hasReply: false };
      }

      const message = await messageResponse.json();
      const threadId = message.threadId;

      // Get all messages in the thread
      const threadResponse = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/threads/${threadId}`,
        {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        }
      );

      if (!threadResponse.ok) {
        console.error(`[ReplyScanner] Failed to fetch thread ${threadId}: ${threadResponse.status}`);
        return { hasReply: false, threadId };
      }

      const thread = await threadResponse.json();
      
      // Check if there are more messages in the thread than just the original
      // A reply would mean thread has 2+ messages
      const hasReply = thread.messages && thread.messages.length > 1;

      return { hasReply, threadId };
    } catch (error: any) {
      console.error('[ReplyScanner] Error checking for replies:', error);
      return { hasReply: false };
    }
  }

  /**
   * Refresh Gmail access token if expired
   */
  private async refreshAccessToken(
    refreshToken: string,
    clientId: string,
    clientSecret: string
  ): Promise<string | null> {
    try {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: refreshToken,
          grant_type: 'refresh_token'
        })
      });

      if (!response.ok) {
        console.error('[ReplyScanner] Token refresh failed:', await response.text());
        return null;
      }

      const tokens = await response.json();
      return tokens.access_token;
    } catch (error: any) {
      console.error('[ReplyScanner] Error refreshing token:', error);
      return null;
    }
  }

  /**
   * Scan for recipients ready to be promoted from Step 0 to Step 1
   * 
   * @param waitDays - Number of days to wait before checking for replies (default: 3)
   * @param dryRun - If true, only scan without promoting
   */
  async scan(waitDays: number = 3, dryRun: boolean = false): Promise<ScanResult> {
    this.waitDays = waitDays;
    
    console.log(`[ReplyScanner] Starting scan (waitDays: ${waitDays}, dryRun: ${dryRun})`);

    const result: ScanResult = {
      scanned: 0,
      promoted: 0,
      errors: 0,
      details: []
    };

    try {
      // Find the Manual Follow-Ups system sequence
      const [systemSequence] = await db
        .select()
        .from(sequences)
        .where(eq(sequences.isSystem, true))
        .limit(1);

      if (!systemSequence) {
        console.log('[ReplyScanner] No Manual Follow-Ups sequence found');
        return result;
      }

      // Find all recipients at Step 0 with status 'awaiting_reply'
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - waitDays);

      const recipientsAtStepZero = await db
        .select({
          recipientId: sequenceRecipients.id,
          email: sequenceRecipients.email,
          currentStep: sequenceRecipients.currentStep,
          status: sequenceRecipients.status,
        })
        .from(sequenceRecipients)
        .where(
          and(
            eq(sequenceRecipients.sequenceId, systemSequence.id),
            eq(sequenceRecipients.currentStep, 0),
            eq(sequenceRecipients.status, 'awaiting_reply')
          )
        );

      console.log(`[ReplyScanner] Found ${recipientsAtStepZero.length} recipients at Step 0`);

      // For each recipient, check their sent message and look for replies
      for (const recipient of recipientsAtStepZero) {
        result.scanned++;

        try {
          // Get the sent message for this recipient
          const [sentMessage] = await db
            .select()
            .from(sequenceRecipientMessages)
            .where(
              and(
                eq(sequenceRecipientMessages.recipientId, recipient.recipientId),
                eq(sequenceRecipientMessages.step, 0),
                eq(sequenceRecipientMessages.status, 'sent')
              )
            )
            .limit(1);

          if (!sentMessage) {
            console.log(`[ReplyScanner] No sent message found for ${recipient.email}`);
            result.details.push({
              recipientId: recipient.recipientId,
              email: recipient.email,
              status: 'error',
              message: 'No sent message found'
            });
            continue;
          }

          // Check if message is old enough
          if (sentMessage.sentAt && sentMessage.sentAt > cutoffDate) {
            const daysOld = Math.floor((Date.now() - sentMessage.sentAt.getTime()) / (1000 * 60 * 60 * 24));
            console.log(`[ReplyScanner] Message for ${recipient.email} is only ${daysOld} days old (need ${waitDays})`);
            result.details.push({
              recipientId: recipient.recipientId,
              email: recipient.email,
              status: 'too_recent',
              message: `Sent ${daysOld} days ago, waiting for ${waitDays} days`
            });
            continue;
          }

          // Get Gmail access token from the admin user (who created drafts)
          // We need to check which user created this draft to use their Gmail token
          const [adminUser] = await db
            .select()
            .from(users)
            .where(eq(users.role, 'admin'))
            .limit(1);

          if (!adminUser) {
            console.error('[ReplyScanner] No admin user found');
            result.errors++;
            result.details.push({
              recipientId: recipient.recipientId,
              email: recipient.email,
              status: 'error',
              message: 'No admin user found'
            });
            continue;
          }

          // Get user's Gmail integration
          const [userIntegration] = await db
            .select()
            .from(userIntegrations)
            .where(eq(userIntegrations.userId, adminUser.id))
            .limit(1);

          if (!userIntegration?.googleCalendarAccessToken || !sentMessage.messageId) {
            console.log(`[ReplyScanner] No Gmail token or message ID for ${recipient.email}`);
            result.details.push({
              recipientId: recipient.recipientId,
              email: recipient.email,
              status: 'error',
              message: 'Gmail not connected or no message ID'
            });
            continue;
          }

          // Check token expiry and refresh if needed
          let accessToken = userIntegration.googleCalendarAccessToken;
          if (userIntegration.googleCalendarTokenExpiry && 
              userIntegration.googleCalendarTokenExpiry < Date.now() &&
              userIntegration.googleCalendarRefreshToken) {
            
            // Get system OAuth credentials
            const [systemIntegration] = await db
              .select()
              .from(systemIntegrations)
              .where(eq(systemIntegrations.serviceName, 'google_sheets'))
              .limit(1);

            if (systemIntegration?.googleClientId && systemIntegration?.googleClientSecret) {
              const newToken = await this.refreshAccessToken(
                userIntegration.googleCalendarRefreshToken,
                systemIntegration.googleClientId,
                systemIntegration.googleClientSecret
              );

              if (newToken) {
                accessToken = newToken;
                // Update stored token
                await db
                  .update(userIntegrations)
                  .set({
                    googleCalendarAccessToken: newToken,
                    googleCalendarTokenExpiry: Date.now() + (3600 * 1000)
                  })
                  .where(eq(userIntegrations.userId, adminUser.id));
              }
            }
          }

          // Check for replies using Gmail API
          const { hasReply } = await this.checkForReplies(sentMessage.messageId, accessToken);

          if (hasReply) {
            console.log(`[ReplyScanner] ✅ ${recipient.email} has replied - marking as replied`);
            
            if (!dryRun) {
              // Update recipient status to 'replied'
              await db
                .update(sequenceRecipients)
                .set({
                  status: 'replied',
                  nextSendAt: null,
                  updatedAt: new Date()
                })
                .where(eq(sequenceRecipients.id, recipient.recipientId));
            }

            result.details.push({
              recipientId: recipient.recipientId,
              email: recipient.email,
              status: 'has_reply',
              message: dryRun ? 'Has reply (dry run - not updated)' : 'Marked as replied'
            });
          } else {
            console.log(`[ReplyScanner] 🔄 ${recipient.email} has no reply - promoting to Step 1`);
            
            if (!dryRun) {
              // Calculate nextSendAt based on stepDelays[1] (delay before Step 1)
              const stepDelay = systemSequence.stepDelays?.[1] || 3;
              const nextSendAt = new Date();
              nextSendAt.setDate(nextSendAt.getDate() + Number(stepDelay));

              // Promote to Step 1 with status 'in_sequence'
              await db
                .update(sequenceRecipients)
                .set({
                  currentStep: 1,
                  status: 'in_sequence',
                  nextSendAt,
                  updatedAt: new Date()
                })
                .where(eq(sequenceRecipients.id, recipient.recipientId));

              result.promoted++;
            }

            result.details.push({
              recipientId: recipient.recipientId,
              email: recipient.email,
              status: 'promoted',
              message: dryRun ? 'Ready to promote (dry run)' : 'Promoted to Step 1'
            });
          }
        } catch (error: any) {
          console.error(`[ReplyScanner] Error processing ${recipient.email}:`, error);
          result.errors++;
          result.details.push({
            recipientId: recipient.recipientId,
            email: recipient.email,
            status: 'error',
            message: error.message || 'Unknown error'
          });
        }
      }

      console.log(`[ReplyScanner] Scan complete: ${result.scanned} scanned, ${result.promoted} promoted, ${result.errors} errors`);
      return result;
    } catch (error: any) {
      console.error('[ReplyScanner] Fatal error during scan:', error);
      throw error;
    }
  }
}

export const gmailReplyScanner = new GmailReplyScanner();

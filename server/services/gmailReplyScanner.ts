import { db } from '../db';
import { sequenceRecipients, sequenceRecipientMessages, sequences, users, userIntegrations, systemIntegrations, emailBlacklist } from '@shared/schema';
import { eq, and, lt, sql } from 'drizzle-orm';
import { storage } from '../storage';
import * as googleSheets from '../googleSheets';

interface GmailMessage {
  id: string;
  threadId: string;
  internalDate: string;
  to: string;
  subject?: string;
  body?: string;
}

interface ScanResult {
  scanned: number;
  promoted: number;
  newEnrollments: number;
  errors: number;
  details: {
    recipientId?: string;
    email: string;
    status: 'promoted' | 'has_reply' | 'too_recent' | 'error' | 'newly_enrolled' | 'blacklisted';
    message?: string;
    isNew?: boolean;
  }[];
}

/**
 * Gmail Reply Scanner Service
 * 
 * Scans Gmail Sent folder for all emails sent to Commission Tracker POC Emails.
 * Auto-enrolls new contacts at Step 1 (manual email) and promotes non-responders to Step 2.
 */
export class GmailReplyScanner {
  private waitDays: number = 3;

  /**
   * Fetch all POC Emails from Commission Tracker sheet
   * ONLY includes prospects (Amount = $0), excludes existing customers (Amount > $0)
   */
  private async fetchPOCEmails(): Promise<Set<string>> {
    const pocEmails = new Set<string>();
    
    try {
      const trackerSheet = await storage.getGoogleSheetByPurpose('commissions');
      
      if (!trackerSheet) {
        return pocEmails;
      }

      const trackerData = await googleSheets.readSheetData(
        trackerSheet.spreadsheetId,
        `${trackerSheet.sheetName}!A:ZZ`
      );

      if (!trackerData || trackerData.length === 0) {
        return pocEmails;
      }

      const headers = trackerData[0];
      const rows = trackerData.slice(1);

      const pocEmailIndex = headers.findIndex((h: string) => h.trim() === 'POC EMAIL');
      const amountIndex = headers.findIndex((h: string) => h.trim() === 'Amount');

      if (pocEmailIndex === -1) {
        console.error('[ReplyScanner] POC EMAIL column not found in Commission Tracker');
        return pocEmails;
      }

      if (amountIndex === -1) {
        console.error('[ReplyScanner] Amount column not found in Commission Tracker');
        return pocEmails;
      }

      let totalEmails = 0;
      let excludedCustomers = 0;

      // Extract POC emails ONLY for prospects (Amount = $0)
      for (const row of rows) {
        const email = row[pocEmailIndex];
        const amountStr = row[amountIndex];
        
        if (email && typeof email === 'string' && email.includes('@')) {
          totalEmails++;
          
          // Parse amount (handles "$500", "500", "500.00", etc.)
          const amount = parseFloat((amountStr || '0').toString().replace(/[$,]/g, ''));
          
          // Only include prospects (Amount = $0), exclude customers
          if (amount === 0 || isNaN(amount)) {
            pocEmails.add(email.trim().toLowerCase());
          } else {
            excludedCustomers++;
          }
        }
      }

      return pocEmails;
    } catch (error: any) {
      console.error('[ReplyScanner] Error fetching POC Emails:', error);
      return pocEmails;
    }
  }

  /**
   * Extract email body from Gmail message payload
   */
  private extractEmailBody(payload: any): string {
    if (!payload) return '';

    // Check for plain text in body.data
    if (payload.body?.data) {
      return Buffer.from(payload.body.data, 'base64').toString('utf-8');
    }

    // Check for multipart message
    if (payload.parts) {
      for (const part of payload.parts) {
        // Prefer text/plain
        if (part.mimeType === 'text/plain' && part.body?.data) {
          return Buffer.from(part.body.data, 'base64').toString('utf-8');
        }
      }

      // Fallback to text/html
      for (const part of payload.parts) {
        if (part.mimeType === 'text/html' && part.body?.data) {
          return Buffer.from(part.body.data, 'base64').toString('utf-8');
        }
      }

      // Recursively check nested parts
      for (const part of payload.parts) {
        if (part.parts) {
          const body = this.extractEmailBody(part);
          if (body) return body;
        }
      }
    }

    return '';
  }

  /**
   * Fetch sent messages from Gmail - FULL HISTORICAL SCAN (no time filter)
   */
  private async fetchSentMessages(
    accessToken: string,
    waitDays: number
  ): Promise<GmailMessage[]> {
    try {
      // Fetch ALL sent messages from Gmail API (no time filter)
      const listResponse = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=in:sent&maxResults=500`,
        {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        }
      );

      if (!listResponse.ok) {
        console.error(`[ReplyScanner] Failed to list sent messages: ${listResponse.status}`);
        return [];
      }

      const listData = await listResponse.json();
      const messageIds = (listData.messages || []).map((m: any) => m.id);


      // Fetch full message details for each message (in batches)
      const messages: GmailMessage[] = [];
      const batchSize = 20;

      for (let i = 0; i < messageIds.length; i += batchSize) {
        const batch = messageIds.slice(i, i + batchSize);
        const batchPromises = batch.map(async (msgId: string) => {
          try {
            const msgResponse = await fetch(
              `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msgId}`,
              {
                headers: { 'Authorization': `Bearer ${accessToken}` }
              }
            );

            if (!msgResponse.ok) {
              return null;
            }

            const msgData = await msgResponse.json();
            const headers = msgData.payload?.headers || [];
            
            const toHeader = headers.find((h: any) => h.name.toLowerCase() === 'to');
            const subjectHeader = headers.find((h: any) => h.name.toLowerCase() === 'subject');
            
            if (!toHeader?.value) {
              return null;
            }

            // Extract email from "Name <email@domain.com>" format
            const emailMatch = toHeader.value.match(/<([^>]+)>/) || [null, toHeader.value];
            const toEmail = emailMatch[1]?.trim().toLowerCase();

            if (!toEmail) {
              return null;
            }

            // Extract email body
            const body = this.extractEmailBody(msgData.payload);

            return {
              id: msgData.id,
              threadId: msgData.threadId,
              internalDate: msgData.internalDate,
              to: toEmail,
              subject: subjectHeader?.value,
              body
            };
          } catch (error) {
            console.error(`[ReplyScanner] Error fetching message ${msgId}:`, error);
            return null;
          }
        });

        const batchResults = await Promise.all(batchPromises);
        messages.push(...batchResults.filter((m): m is GmailMessage => m !== null));
      }

      return messages;
    } catch (error: any) {
      console.error('[ReplyScanner] Error fetching sent messages:', error);
      return [];
    }
  }

  /**
   * Check if a thread has replies from the recipient (not just multiple messages from sender)
   */
  private async checkForReplies(
    messageId: string,
    threadId: string,
    accessToken: string
  ): Promise<boolean> {
    try {
      const threadResponse = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/threads/${threadId}?format=full`,
        {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        }
      );

      if (!threadResponse.ok) {
        console.error(`[ReplyScanner] Failed to fetch thread ${threadId}: ${threadResponse.status}`);
        return false;
      }

      const thread = await threadResponse.json();
      const messages = thread.messages || [];

      if (messages.length <= 1) {
        return false; // Only original message, no replies
      }

      // Get sender email from admin Gmail profile
      const profileResponse = await fetch(
        'https://gmail.googleapis.com/gmail/v1/users/me/profile',
        {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        }
      );

      if (!profileResponse.ok) {
        console.error('[ReplyScanner] Failed to fetch Gmail profile');
        return false;
      }

      const profile = await profileResponse.json();
      const senderEmail = profile.emailAddress.toLowerCase();

      // Check if any message in thread is FROM someone other than sender
      for (const msg of messages) {
        const headers = msg.payload?.headers || [];
        const fromHeader = headers.find((h: any) => h.name.toLowerCase() === 'from');
        
        if (fromHeader?.value) {
          // Extract email from "Name <email@domain.com>" format
          const emailMatch = fromHeader.value.match(/<([^>]+)>/) || [null, fromHeader.value];
          const fromEmail = emailMatch[1]?.trim().toLowerCase() || fromHeader.value.toLowerCase();
          
          // If this message is from someone else, it's a reply
          if (fromEmail !== senderEmail) {
            return true;
          }
        }
      }

      return false;
    } catch (error: any) {
      console.error('[ReplyScanner] Error checking for replies:', error);
      return false;
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
   * Check if email is blacklisted
   */
  private async isBlacklisted(email: string): Promise<boolean> {
    try {
      const [blacklisted] = await db
        .select()
        .from(emailBlacklist)
        .where(eq(emailBlacklist.email, email.toLowerCase()))
        .limit(1);

      return !!blacklisted;
    } catch (error: any) {
      console.error('[ReplyScanner] Error checking blacklist:', error);
      return false;
    }
  }

  /**
   * Ensure Manual Follow-Ups system sequence exists
   */
  private async ensureSystemSequence(adminUserId: string): Promise<typeof sequences.$inferSelect | null> {
    try {
      const [existingSequence] = await db
        .select()
        .from(sequences)
        .where(eq(sequences.isSystem, true))
        .limit(1);

      if (existingSequence) {
        return existingSequence;
      }

      // Create the system sequence
      const [newSequence] = await db
        .insert(sequences)
        .values({
          createdBy: adminUserId,
          name: 'Manual Follow-Ups',
          description: 'Protected system sequence for contacts created via Gmail drafts',
          stepDelays: [3, 7, 14],
          status: 'paused',
          isSystem: true,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();

      return newSequence;
    } catch (error: any) {
      console.error('[ReplyScanner] Error ensuring system sequence:', error);
      return null;
    }
  }

  /**
   * Main scan function - scans Gmail Sent folder and matches against Commission Tracker
   */
  async scan(waitDays: number = 3, dryRun: boolean = false, selectedEmails?: string[]): Promise<ScanResult> {
    this.waitDays = waitDays;
    

    const result: ScanResult = {
      scanned: 0,
      promoted: 0,
      newEnrollments: 0,
      errors: 0,
      details: []
    };

    try {
      // Get admin user and Gmail access token
      const [adminUser] = await db
        .select()
        .from(users)
        .where(eq(users.role, 'admin'))
        .limit(1);

      if (!adminUser) {
        console.error('[ReplyScanner] No admin user found');
        return result;
      }

      const [userIntegration] = await db
        .select()
        .from(userIntegrations)
        .where(eq(userIntegrations.userId, adminUser.id))
        .limit(1);

      if (!userIntegration?.googleCalendarAccessToken) {
        return result;
      }

      // Refresh token if needed
      let accessToken = userIntegration.googleCalendarAccessToken;
      if (userIntegration.googleCalendarTokenExpiry && 
          userIntegration.googleCalendarTokenExpiry < Date.now() &&
          userIntegration.googleCalendarRefreshToken) {
        
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

      // Fetch POC Emails from Commission Tracker
      const pocEmails = await this.fetchPOCEmails();
      
      if (pocEmails.size === 0) {
        return result;
      }

      // Fetch sent messages from Gmail
      const sentMessages = await this.fetchSentMessages(accessToken, waitDays);
      
      if (sentMessages.length === 0) {
        return result;
      }

      // Filter messages to only those sent to POC Emails
      const matchedMessages = sentMessages.filter(msg => pocEmails.has(msg.to));

      // Deduplicate: Group messages by email address
      const emailGroups = new Map<string, GmailMessage[]>();
      for (const msg of matchedMessages) {
        if (!emailGroups.has(msg.to)) {
          emailGroups.set(msg.to, []);
        }
        emailGroups.get(msg.to)!.push(msg);
      }

      // For each unique email, pick the most recent message and check if ANY have replies
      const deduplicatedMessages: GmailMessage[] = [];
      const emailHasReply = new Map<string, boolean>();
      
      for (const [email, messages] of emailGroups.entries()) {
        // Sort by internalDate descending (most recent first)
        messages.sort((a, b) => parseInt(b.internalDate) - parseInt(a.internalDate));
        deduplicatedMessages.push(messages[0]); // Use most recent for processing
        
        // Check if ANY message to this email has a reply
        let hasAnyReply = false;
        for (const msg of messages) {
          const hasReply = await this.checkForReplies(msg.id, msg.threadId, accessToken);
          if (hasReply) {
            hasAnyReply = true;
            break; // Stop checking once we find one reply
          }
        }
        emailHasReply.set(email, hasAnyReply);
      }


      // Ensure system sequence exists
      const systemSequence = await this.ensureSystemSequence(adminUser.id);
      if (!systemSequence) {
        console.error('[ReplyScanner] Failed to create/find system sequence');
        return result;
      }

      // Check cutoff date for promotion
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - waitDays);

      // Process each deduplicated message (one per unique email)
      for (const message of deduplicatedMessages) {
        result.scanned++;

        try {
          // Check blacklist first
          const isBlacklisted = await this.isBlacklisted(message.to);
          if (isBlacklisted) {
            result.details.push({
              email: message.to,
              status: 'blacklisted',
              message: 'Email is blacklisted - skipped'
            });
            continue;
          }

          // Check if recipient already exists in the sequence
          const [existingRecipient] = await db
            .select()
            .from(sequenceRecipients)
            .where(
              and(
                eq(sequenceRecipients.sequenceId, systemSequence.id),
                eq(sequenceRecipients.email, message.to)
              )
            )
            .limit(1);

          const sentDate = new Date(parseInt(message.internalDate));
          const isOldEnough = sentDate <= cutoffDate;

          // Use pre-computed reply status (checked across ALL messages to this email)
          const hasReply = emailHasReply.get(message.to) || false;

          if (existingRecipient) {
            // Existing recipient - check if ready to promote from Step 1 to Step 2
            if (existingRecipient.currentStep === 1 && existingRecipient.status === 'awaiting_reply') {
              if (hasReply) {
                if (!dryRun) {
                  await db
                    .update(sequenceRecipients)
                    .set({
                      status: 'replied',
                      nextSendAt: null,
                      updatedAt: new Date()
                    })
                    .where(eq(sequenceRecipients.id, existingRecipient.id));
                }

                result.details.push({
                  recipientId: existingRecipient.id,
                  email: message.to,
                  status: 'has_reply',
                  message: dryRun ? 'Has reply (dry run)' : 'Marked as replied'
                });
              } else if (isOldEnough) {
                if (!dryRun) {
                  const stepDelay = systemSequence.stepDelays?.[2] || 3;
                  const nextSendAt = new Date();
                  nextSendAt.setDate(nextSendAt.getDate() + Number(stepDelay));

                  await db
                    .update(sequenceRecipients)
                    .set({
                      currentStep: 2,
                      status: 'in_sequence',
                      nextSendAt,
                      updatedAt: new Date()
                    })
                    .where(eq(sequenceRecipients.id, existingRecipient.id));

                  result.promoted++;
                }

                result.details.push({
                  recipientId: existingRecipient.id,
                  email: message.to,
                  status: 'promoted',
                  message: dryRun ? 'Ready to promote (dry run)' : 'Promoted to Step 2'
                });
              } else {
                const daysOld = Math.floor((Date.now() - sentDate.getTime()) / (1000 * 60 * 60 * 24));
                result.details.push({
                  recipientId: existingRecipient.id,
                  email: message.to,
                  status: 'too_recent',
                  message: `Sent ${daysOld} days ago, waiting for ${waitDays} days`
                });
              }
            }
          } else {
            // New recipient - enroll at Step 1 (manual email) if no reply
            if (hasReply) {
              result.details.push({
                email: message.to,
                status: 'has_reply',
                message: 'Already has reply - not enrolled',
                isNew: true
              });
            } else {
              // If selectedEmails provided and not in dry run, only enroll selected emails
              const shouldEnroll = !selectedEmails || selectedEmails.includes(message.to);
              
              if (!dryRun && !shouldEnroll) {
                // Skip this email - not selected by user
                continue;
              }
              
              if (!dryRun) {
                const [newRecipient] = await db
                  .insert(sequenceRecipients)
                  .values({
                    sequenceId: systemSequence.id,
                    name: message.to,
                    email: message.to,
                    currentStep: 1,
                    status: 'awaiting_reply',
                    nextSendAt: null,
                    createdAt: new Date(),
                    updatedAt: new Date()
                  })
                  .returning();

                // Record the sent message with full content for AI context (Step 1 = manual email)
                await db
                  .insert(sequenceRecipientMessages)
                  .values({
                    recipientId: newRecipient.id,
                    stepNumber: 1,
                    messageId: message.id,
                    threadId: message.threadId,
                    subject: message.subject || '(No subject)',
                    body: message.body || '',
                    sentAt: sentDate,
                    createdAt: new Date()
                  });

                result.newEnrollments++;

                // Check if old enough to promote immediately to Step 2
                if (isOldEnough) {
                  const stepDelay = systemSequence.stepDelays?.[2] || 3;
                  const nextSendAt = new Date();
                  nextSendAt.setDate(nextSendAt.getDate() + Number(stepDelay));

                  await db
                    .update(sequenceRecipients)
                    .set({
                      currentStep: 2,
                      status: 'in_sequence',
                      nextSendAt,
                      updatedAt: new Date()
                    })
                    .where(eq(sequenceRecipients.id, newRecipient.id));

                  result.promoted++;

                  result.details.push({
                    recipientId: newRecipient.id,
                    email: message.to,
                    status: 'promoted',
                    message: 'Newly enrolled and promoted to Step 2',
                    isNew: true
                  });
                } else {
                  const daysOld = Math.floor((Date.now() - sentDate.getTime()) / (1000 * 60 * 60 * 24));
                  result.details.push({
                    recipientId: newRecipient.id,
                    email: message.to,
                    status: 'newly_enrolled',
                    message: `Enrolled at Step 1 (sent ${daysOld} days ago, waiting for ${waitDays} days)`,
                    isNew: true
                  });
                }
              } else {
                // Dry run: Check dates to show accurate preview
                const daysOld = Math.floor((Date.now() - sentDate.getTime()) / (1000 * 60 * 60 * 24));
                
                if (isOldEnough) {
                  // Would be enrolled AND promoted to Step 2 in one shot
                  result.details.push({
                    email: message.to,
                    status: 'promoted',
                    message: `Would be enrolled and promoted to Step 2 (sent ${daysOld} days ago)`,
                    isNew: true
                  });
                } else {
                  // Would be enrolled at Step 1 and wait
                  result.details.push({
                    email: message.to,
                    status: 'newly_enrolled',
                    message: `Would be enrolled at Step 1 (sent ${daysOld} days ago, needs ${waitDays - daysOld} more days)`,
                    isNew: true
                  });
                }
              }
            }
          }
        } catch (error: any) {
          console.error(`[ReplyScanner] Error processing ${message.to}:`, error);
          result.errors++;
          result.details.push({
            email: message.to,
            status: 'error',
            message: error.message || 'Unknown error'
          });
        }
      }

      return result;
    } catch (error: any) {
      console.error('[ReplyScanner] Fatal error during scan:', error);
      throw error;
    }
  }
}

export const gmailReplyScanner = new GmailReplyScanner();

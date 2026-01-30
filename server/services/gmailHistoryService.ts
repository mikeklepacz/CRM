import { getAdminGmailClient, GMAIL_ADMIN_USER_ID } from './gmailClient';
import { gmailWatchManager } from './gmailWatchManager';
import { db } from '../db';
import { eq, sql, and } from 'drizzle-orm';
import { processedGmailMessages, sequenceRecipients, sequences, dailySendSlots } from '../../shared/schema';

export interface HistoryProcessingResult {
  messagesProcessed: number;
  repliesDetected: number;
  recipientsUpdated: string[];
  errors: string[];
}

export async function processGmailHistory(historyId: string): Promise<HistoryProcessingResult> {
  const result: HistoryProcessingResult = {
    messagesProcessed: 0,
    repliesDetected: 0,
    recipientsUpdated: [],
    errors: [],
  };

  try {
    const lastHistoryId = await gmailWatchManager.getLastHistoryId();
    if (!lastHistoryId) {
      await gmailWatchManager.updateHistoryId(historyId);
      return result;
    }

    const { gmail, email: ourEmail } = await getAdminGmailClient();

    let pageToken: string | undefined;
    const allNewMessages: Array<{ messageId: string; threadId: string }> = [];

    do {
      const historyResponse = await gmail.users.history.list({
        userId: 'me',
        startHistoryId: lastHistoryId,
        historyTypes: ['messageAdded'],
        labelId: 'INBOX',
        pageToken,
      });

      const history = historyResponse.data.history || [];
      for (const item of history) {
        if (item.messagesAdded) {
          for (const added of item.messagesAdded) {
            if (added.message?.id && added.message?.threadId) {
              allNewMessages.push({
                messageId: added.message.id,
                threadId: added.message.threadId,
              });
            }
          }
        }
      }

      pageToken = historyResponse.data.nextPageToken || undefined;
    } while (pageToken);

    for (const { messageId, threadId } of allNewMessages) {
      try {
        const alreadyProcessed = await db
          .select()
          .from(processedGmailMessages)
          .where(eq(processedGmailMessages.gmailMessageId, messageId))
          .limit(1);

        if (alreadyProcessed.length > 0) {
          continue;
        }

        const msgResponse = await gmail.users.messages.get({
          userId: 'me',
          id: messageId,
          format: 'metadata',
          metadataHeaders: ['From', 'To', 'Subject'],
        });

        const headers = msgResponse.data.payload?.headers || [];
        const fromHeader = headers.find(h => h.name?.toLowerCase() === 'from');
        const fromValue = fromHeader?.value || '';

        const emailMatch = fromValue.match(/<([^>]+)>/) || [null, fromValue];
        const senderEmail = (emailMatch[1] || fromValue).toLowerCase().trim();

        if (senderEmail === ourEmail.toLowerCase()) {
          await db.insert(processedGmailMessages).values({
            gmailMessageId: messageId,
            userId: GMAIL_ADMIN_USER_ID,
            action: 'ignored_own_email',
          });
          continue;
        }

        result.messagesProcessed++;

        const recipientMatch = await findRecipientByThreadId(threadId);
        
        if (recipientMatch) {
          await markRecipientReplied(recipientMatch.id, recipientMatch.sequenceId);
          
          result.repliesDetected++;
          result.recipientsUpdated.push(recipientMatch.id);

          await db.insert(processedGmailMessages).values({
            gmailMessageId: messageId,
            userId: GMAIL_ADMIN_USER_ID,
            action: 'reply_detected',
          });
        } else {
          await db.insert(processedGmailMessages).values({
            gmailMessageId: messageId,
            userId: GMAIL_ADMIN_USER_ID,
            action: 'no_recipient_match',
          });
        }

      } catch (msgError: any) {
        result.errors.push(`Message ${messageId}: ${msgError.message}`);
      }
    }

    await gmailWatchManager.updateHistoryId(historyId);

    return result;

  } catch (error: any) {
    result.errors.push(error.message);
    return result;
  }
}

async function findRecipientByThreadId(threadId: string): Promise<{ id: string; sequenceId: string } | null> {
  const recipients = await db
    .select({
      id: sequenceRecipients.id,
      sequenceId: sequenceRecipients.sequenceId,
    })
    .from(sequenceRecipients)
    .where(
      and(
        eq(sequenceRecipients.threadId, threadId),
        sql`${sequenceRecipients.status} NOT IN ('replied', 'bounced', 'unsubscribed')`
      )
    )
    .limit(1);

  return recipients[0] || null;
}

async function markRecipientReplied(recipientId: string, sequenceId: string): Promise<void> {
  await db.update(sequenceRecipients)
    .set({
      status: 'replied',
      repliedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(sequenceRecipients.id, recipientId));

  await db.execute(sql`
    UPDATE sequences 
    SET 
      replied_count = replied_count + 1,
      updated_at = NOW()
    WHERE id = ${sequenceId}
  `);

  // DELETE any unsent slots for this recipient - they replied, no need to send
  await db.execute(sql`
    DELETE FROM daily_send_slots
    WHERE sent = FALSE
      AND recipient_id = ${recipientId}
  `);
}

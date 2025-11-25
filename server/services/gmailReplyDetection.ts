import { getGmailClient } from './gmailClient';

export interface ReplyDetectionResult {
  hasReply: boolean;
  replyCount: number;
  replies: Array<{
    from: string;
    snippet: string;
    receivedAt: string;
  }>;
}

/**
 * Check if a Gmail thread has received replies
 * Uses Gmail API threads.get to fetch all messages in a thread
 * Only counts messages FROM recipients (not our own follow-ups)
 */
export async function checkForReplies(userId: string, threadId: string): Promise<ReplyDetectionResult> {
  try {
    const { gmail, email: ourEmail } = await getGmailClient(userId);
    
    console.log(`[ReplyDetection] Checking thread ${threadId} for replies (our email: ${ourEmail})`);

    // Fetch the thread
    const thread = await gmail.users.threads.get({
      userId: 'me',
      id: threadId,
      format: 'full',
    });

    const messages = thread.data.messages || [];
    console.log(`[ReplyDetection] Thread has ${messages.length} total messages`);
    
    // Filter to only messages NOT from us (these are genuine replies)
    const replies: Array<{ from: string; snippet: string; receivedAt: string }> = [];
    
    for (const msg of messages) {
      const headers = msg.payload?.headers || [];
      const fromHeader = headers.find(h => h.name?.toLowerCase() === 'from');
      const dateHeader = headers.find(h => h.name?.toLowerCase() === 'date');
      const fromValue = fromHeader?.value || '';
      
      // Extract email from "Name <email@example.com>" format
      const emailMatch = fromValue.match(/<([^>]+)>/) || [null, fromValue];
      const senderEmail = (emailMatch[1] || fromValue).toLowerCase().trim();
      
      // Only count as reply if NOT from our email
      if (senderEmail && !senderEmail.includes(ourEmail) && ourEmail && !ourEmail.includes(senderEmail)) {
        console.log(`[ReplyDetection] ✅ Found reply from: ${fromValue}`);
        replies.push({
          from: fromValue,
          snippet: msg.snippet || '',
          receivedAt: dateHeader?.value || '',
        });
      } else {
        console.log(`[ReplyDetection] ⏭️  Skipping our own message from: ${fromValue}`);
      }
    }

    console.log(`[ReplyDetection] Result: ${replies.length} genuine replies found`);
    
    return {
      hasReply: replies.length > 0,
      replyCount: replies.length,
      replies,
    };
  } catch (error: any) {
    console.error('[ReplyDetection] Error checking for replies:', error);
    throw new Error(`Failed to check for replies: ${error.message}`);
  }
}

/**
 * Get the latest Message-ID from a thread for threading follow-ups
 */
export async function getLatestMessageId(userId: string, threadId: string): Promise<string | null> {
  try {
    const { gmail } = await getGmailClient(userId);

    const thread = await gmail.users.threads.get({
      userId: 'me',
      id: threadId,
      format: 'full',
    });

    const messages = thread.data.messages || [];
    if (messages.length === 0) {
      return null;
    }

    // Get the most recent message
    const latestMessage = messages[messages.length - 1];
    const headers = latestMessage.payload?.headers || [];
    const messageIdHeader = headers.find(h => h.name?.toLowerCase() === 'message-id');
    
    return messageIdHeader?.value || null;
  } catch (error: any) {
    console.error('[ReplyDetection] Error getting latest message ID:', error);
    return null;
  }
}

/**
 * Get all Message-IDs from a thread for the References header
 */
export async function getAllMessageIds(userId: string, threadId: string): Promise<string[]> {
  try {
    const { gmail } = await getGmailClient(userId);

    const thread = await gmail.users.threads.get({
      userId: 'me',
      id: threadId,
      format: 'full',
    });

    const messages = thread.data.messages || [];
    const messageIds: string[] = [];

    for (const msg of messages) {
      const headers = msg.payload?.headers || [];
      const messageIdHeader = headers.find(h => h.name?.toLowerCase() === 'message-id');
      if (messageIdHeader?.value) {
        messageIds.push(messageIdHeader.value);
      }
    }

    // Gmail reads only last 20 references, so limit to that
    return messageIds.slice(-20);
  } catch (error: any) {
    console.error('[ReplyDetection] Error getting all message IDs:', error);
    return [];
  }
}

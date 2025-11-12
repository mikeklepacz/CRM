import { google } from 'googleapis';
import { storage } from '../storage';

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
 */
export async function checkForReplies(threadId: string): Promise<ReplyDetectionResult> {
  try {
    // Get user's Gmail OAuth credentials
    const userIntegrations = await storage.getAllUserIntegrations();
    if (userIntegrations.length === 0) {
      throw new Error('No Gmail integration configured');
    }

    const integration = userIntegrations[0];
    if (!integration.gmailAccessToken || !integration.gmailRefreshToken) {
      throw new Error('Gmail not connected for this user');
    }

    // Initialize Gmail API
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    oauth2Client.setCredentials({
      access_token: integration.gmailAccessToken,
      refresh_token: integration.gmailRefreshToken,
    });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Fetch the thread
    const thread = await gmail.users.threads.get({
      userId: 'me',
      id: threadId,
      format: 'full',
    });

    const messages = thread.data.messages || [];
    
    // First message is the original email we sent
    // Any additional messages are replies
    const replies = messages.slice(1).map(msg => {
      const headers = msg.payload?.headers || [];
      const fromHeader = headers.find(h => h.name?.toLowerCase() === 'from');
      const dateHeader = headers.find(h => h.name?.toLowerCase() === 'date');
      
      return {
        from: fromHeader?.value || 'Unknown',
        snippet: msg.snippet || '',
        receivedAt: dateHeader?.value || '',
      };
    });

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
export async function getLatestMessageId(threadId: string): Promise<string | null> {
  try {
    const userIntegrations = await storage.getAllUserIntegrations();
    if (userIntegrations.length === 0) {
      throw new Error('No Gmail integration configured');
    }

    const integration = userIntegrations[0];
    if (!integration.gmailAccessToken || !integration.gmailRefreshToken) {
      throw new Error('Gmail not connected for this user');
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    oauth2Client.setCredentials({
      access_token: integration.gmailAccessToken,
      refresh_token: integration.gmailRefreshToken,
    });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

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
export async function getAllMessageIds(threadId: string): Promise<string[]> {
  try {
    const userIntegrations = await storage.getAllUserIntegrations();
    if (userIntegrations.length === 0) {
      return [];
    }

    const integration = userIntegrations[0];
    if (!integration.gmailAccessToken || !integration.gmailRefreshToken) {
      return [];
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    oauth2Client.setCredentials({
      access_token: integration.gmailAccessToken,
      refresh_token: integration.gmailRefreshToken,
    });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

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

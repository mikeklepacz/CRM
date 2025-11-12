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
 * Get Gmail client with refreshed token
 */
async function getGmailClient(userId: string) {
  const integration = await storage.getUserIntegration(userId);
  if (!integration?.googleCalendarAccessToken) {
    throw new Error('Gmail not connected. Please connect Gmail first.');
  }

  const systemIntegration = await storage.getSystemIntegration('google_sheets');
  if (!systemIntegration?.googleClientId || !systemIntegration?.googleClientSecret) {
    throw new Error('System OAuth not configured');
  }

  let accessToken = integration.googleCalendarAccessToken;
  if (integration.googleCalendarTokenExpiry && integration.googleCalendarTokenExpiry < Date.now()) {
    if (!integration.googleCalendarRefreshToken) {
      throw new Error('Gmail token expired. Please reconnect Gmail.');
    }

    const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: systemIntegration.googleClientId,
        client_secret: systemIntegration.googleClientSecret,
        refresh_token: integration.googleCalendarRefreshToken,
        grant_type: 'refresh_token'
      })
    });

    if (!refreshResponse.ok) {
      throw new Error('Failed to refresh Gmail token');
    }

    const tokens = await refreshResponse.json();
    accessToken = tokens.access_token;

    await storage.updateUserIntegration(userId, {
      googleCalendarAccessToken: accessToken,
      googleCalendarTokenExpiry: Date.now() + (tokens.expires_in * 1000),
    });
  }

  const oauth2Client = new google.auth.OAuth2(
    systemIntegration.googleClientId,
    systemIntegration.googleClientSecret
  );

  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: integration.googleCalendarRefreshToken,
  });

  return google.gmail({ version: 'v1', auth: oauth2Client });
}

/**
 * Check if a Gmail thread has received replies
 * Uses Gmail API threads.get to fetch all messages in a thread
 */
export async function checkForReplies(userId: string, threadId: string): Promise<ReplyDetectionResult> {
  try {
    const gmail = await getGmailClient(userId);

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
export async function getLatestMessageId(userId: string, threadId: string): Promise<string | null> {
  try {
    const gmail = await getGmailClient(userId);

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
    const gmail = await getGmailClient(userId);

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

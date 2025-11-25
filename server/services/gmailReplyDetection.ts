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
 * Only counts messages FROM recipients (not our own follow-ups)
 */
export async function checkForReplies(userId: string, threadId: string): Promise<ReplyDetectionResult> {
  try {
    const gmail = await getGmailClient(userId);

    // Get our own email address to filter out our sent emails
    const profile = await gmail.users.getProfile({ userId: 'me' });
    const ourEmail = profile.data.emailAddress?.toLowerCase() || '';
    
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

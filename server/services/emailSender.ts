
import { google } from 'googleapis';
import { storage } from '../storage';
import type { SequenceRecipient } from '../../shared/schema';

interface EmailOptions {
  userId: string; // User ID for getting Gmail credentials
  to: string;
  subject: string;
  body: string;
  from?: string;
  threadId?: string; // Gmail thread ID for threading
  inReplyTo?: string; // Message-ID of email being replied to
  references?: string; // Space-separated list of Message-IDs in conversation
}

interface EmailResponse {
  success: boolean;
  messageId?: string; // Gmail message ID
  threadId?: string; // Gmail thread ID
  rfc822MessageId?: string; // Message-ID from headers for threading
  error?: string;
}

export async function sendEmail(options: EmailOptions): Promise<EmailResponse> {
  try {
    // Get user's Gmail OAuth credentials
    const integration = await storage.getUserIntegration(options.userId);
    if (!integration?.googleCalendarAccessToken) {
      throw new Error('Gmail not connected. Please connect Gmail first.');
    }

    // Get system-wide OAuth credentials for token refresh
    const systemIntegration = await storage.getSystemIntegration('google_sheets');
    if (!systemIntegration?.googleClientId || !systemIntegration?.googleClientSecret) {
      throw new Error('System OAuth not configured');
    }

    // Check if token needs refresh
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

      await storage.updateUserIntegration(options.userId, {
        googleCalendarAccessToken: accessToken,
        googleCalendarTokenExpiry: Date.now() + (tokens.expires_in * 1000),
      });
    }

    // Initialize Gmail API
    const oauth2Client = new google.auth.OAuth2(
      systemIntegration.googleClientId,
      systemIntegration.googleClientSecret
    );

    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: integration.googleCalendarRefreshToken,
    });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Build email headers
    const headers: string[] = [
      `To: ${options.to}`,
      `Subject: ${options.subject}`,
      'Content-Type: text/html; charset=utf-8',
    ];

    // Add threading headers if this is a reply/follow-up
    if (options.inReplyTo) {
      headers.push(`In-Reply-To: ${options.inReplyTo}`);
    }
    if (options.references) {
      headers.push(`References: ${options.references}`);
    }

    // Create email in RFC 2822 format
    const email = [...headers, '', options.body].join('\r\n');

    // Base64 encode email
    const encodedEmail = Buffer.from(email)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    // Send email with optional threadId
    const requestBody: any = {
      raw: encodedEmail,
    };
    if (options.threadId) {
      requestBody.threadId = options.threadId;
    }

    const response = await gmail.users.messages.send({
      userId: 'me',
      requestBody,
    });

    const gmailMessageId = response.data.id;
    const gmailThreadId = response.data.threadId;

    // Fetch the sent message to get the RFC 822 Message-ID header
    let rfc822MessageId: string | undefined;
    if (gmailMessageId) {
      try {
        const message = await gmail.users.messages.get({
          userId: 'me',
          id: gmailMessageId,
          format: 'full',
        });

        // Extract Message-ID from headers
        const headers = message.data.payload?.headers || [];
        const messageIdHeader = headers.find(h => h.name?.toLowerCase() === 'message-id');
        if (messageIdHeader?.value) {
          rfc822MessageId = messageIdHeader.value;
        }
      } catch (error) {
        console.warn('[EmailSender] Failed to fetch Message-ID header:', error);
      }
    }

    return {
      success: true,
      messageId: gmailMessageId,
      threadId: gmailThreadId,
      rfc822MessageId,
    };
  } catch (error: any) {
    console.error('[EmailSender] Error sending email:', error);
    return {
      success: false,
      error: error.message || 'Unknown error',
    };
  }
}

export async function personalizeEmailWithAI(
  recipient: SequenceRecipient,
  template: { subject: string; body: string },
  settings: { promptInjection?: string; keywordBin?: string }
): Promise<{ subject: string; body: string }> {
  // TODO: Implement AI personalization using OpenAI
  // For now, just do basic variable replacement
  
  const variables: Record<string, string> = {
    '{{name}}': recipient.name || 'there',
    '{{email}}': recipient.email,
    '{{businessHours}}': recipient.businessHours || '',
    '{{salesSummary}}': recipient.salesSummary || '',
  };

  let personalizedSubject = template.subject;
  let personalizedBody = template.body;

  for (const [key, value] of Object.entries(variables)) {
    personalizedSubject = personalizedSubject.replace(new RegExp(key, 'g'), value);
    personalizedBody = personalizedBody.replace(new RegExp(key, 'g'), value);
  }

  return {
    subject: personalizedSubject,
    body: personalizedBody,
  };
}

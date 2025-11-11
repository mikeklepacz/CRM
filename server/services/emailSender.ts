
import { google } from 'googleapis';
import { storage } from '../storage';
import type { SequenceRecipient } from '../../shared/schema';

interface EmailOptions {
  to: string;
  subject: string;
  body: string;
  from?: string;
}

export async function sendEmail(options: EmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    // Get user's Gmail OAuth credentials
    const userIntegrations = await storage.getAllUserIntegrations();
    if (userIntegrations.length === 0) {
      throw new Error('No Gmail integration configured');
    }

    const integration = userIntegrations[0]; // Use first available integration
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

    // Create email in RFC 2822 format
    const email = [
      `To: ${options.to}`,
      `Subject: ${options.subject}`,
      'Content-Type: text/html; charset=utf-8',
      '',
      options.body,
    ].join('\n');

    // Base64 encode email
    const encodedEmail = Buffer.from(email)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    // Send email
    const response = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedEmail,
      },
    });

    return {
      success: true,
      messageId: response.data.id || undefined,
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

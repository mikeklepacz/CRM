
import { google } from 'googleapis';
import { storage } from '../storage';
import type { SequenceRecipient, StrategyTranscript } from '../../shared/schema';
import OpenAI from 'openai';

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
  template: { subject?: string; body?: string },
  strategyTranscript: StrategyTranscript | null,
  settings: { promptInjection?: string; keywordBin?: string; signature?: string }
): Promise<{ subject: string; body: string }> {
  try {
    // Get OpenAI settings
    const openaiSettings = await storage.getOpenaiSettings();
    if (!openaiSettings?.apiKey) {
      console.warn('[EmailAI] No OpenAI API key configured, falling back to template');
      return fallbackToTemplate(recipient, template, settings);
    }

    const openai = new OpenAI({ apiKey: openaiSettings.apiKey });

    // Build recipient context (for AI to understand business, but not directly quote)
    const recipientContext = `
RECIPIENT CONTEXT (for understanding, do not directly quote in email):
- Company/Contact: ${recipient.name || 'Unknown'}
- Email: ${recipient.email}
- Business Hours: ${recipient.businessHours || 'Not specified'}
- Sales Summary: ${recipient.salesSummary || 'Not available'}
`.trim();

    // Build strategy context from transcript
    let strategyContext = '';
    if (strategyTranscript?.messages && strategyTranscript.messages.length > 0) {
      strategyContext = '\n\nCAMPAIGN STRATEGY CONTEXT:\n';
      strategyTranscript.messages.forEach(msg => {
        strategyContext += `${msg.role === 'user' ? 'YOU' : 'ASSISTANT'}: ${msg.content}\n`;
      });
    }

    // System prompt with all instructions
    const systemPrompt = `You are an expert B2B cold email writer for hemp wick wholesale outreach.

CORE RULES:
1. GREETING: Always use "Hi," (generic, never personalize with company name)
2. OPENING: Reference "I found your email on Leafly..."
3. HONEST APPROACH: Acknowledge you might not be talking to the right person
   - Include: "If you're the right person to discuss wholesale accessories, that's great—if not, I'd appreciate being introduced to whoever handles product sourcing."
4. HTML FORMATTING: Use <p></p> tags for paragraphs and <br> for line breaks
5. TONE: Professional peer-to-peer, helpful (not salesy)
6. LENGTH: 3-4 short paragraphs maximum (under 200 words total)
7. NO PERSONALIZATION: Don't mention their business name, hours, or specific details from context
8. SIGNATURE: End with ${settings.signature ? 'the provided signature' : 'a simple sign-off'}

SPAM AVOIDANCE:
- Never use: "free", "guarantee", "limited time", "act now", "click here", "100%", "risk-free"
- No excessive punctuation (!!!, ???, ALL CAPS)
- Keep conversational, not marketing copy
- 1-2 links maximum
- Focus on helping THEM, not selling

${settings.promptInjection || ''}

${strategyContext}

${recipientContext}

Generate a professional cold email with subject and body. Output HTML formatted body.`.trim();

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: 'Generate a cold outreach email for this recipient based on the campaign strategy and context provided.' }
      ],
      temperature: 0.8,
      max_tokens: 500,
    });

    const generatedContent = response.choices[0]?.message?.content || '';
    
    // Parse subject and body from response
    // Expected format: Subject: ... \n\n Body: ...
    const subjectMatch = generatedContent.match(/Subject:\s*(.+?)(\n|$)/i);
    const bodyMatch = generatedContent.match(/Body:\s*([\s\S]+)/i) || 
                      generatedContent.match(/^(?:Subject:.*?\n\n)?([\s\S]+)/);

    let subject = subjectMatch?.[1]?.trim() || 'Hemp Wick Partnership Opportunity';
    let body = bodyMatch?.[1]?.trim() || generatedContent;

    // Clean up any markdown or extra formatting
    body = body.replace(/^Body:\s*/i, '').trim();

    // Add signature if provided
    if (settings.signature) {
      body += `\n\n${settings.signature}`;
    }

    console.log('[EmailAI] ✅ Generated personalized email for', recipient.email);

    return { subject, body };
  } catch (error: any) {
    console.error('[EmailAI] Error generating email:', error);
    return fallbackToTemplate(recipient, template, settings);
  }
}

function fallbackToTemplate(
  recipient: SequenceRecipient,
  template: { subject?: string; body?: string },
  settings: { signature?: string }
): { subject: string; body: string } {
  // Fallback to sequence template if OpenAI fails
  // Do basic variable replacement
  const variables: Record<string, string> = {
    '{{name}}': recipient.name || 'there',
    '{{email}}': recipient.email,
    '{{businessHours}}': recipient.businessHours || '',
    '{{salesSummary}}': recipient.salesSummary || '',
  };

  let subject = template.subject || 'Hemp Wick Partnership Opportunity';
  let body = template.body || `<p>Hi,</p>

<p>I found your email on Leafly and wanted to reach out about hemp wick for your dispensary. If you're the right person to discuss wholesale accessories, that's great—if not, I'd appreciate being introduced to whoever handles product sourcing.</p>

<p>We're the world's largest white-label manufacturer of hemp wick, offering natural and eco-friendly lighting alternatives that preserve cannabis flavor. We can customize with your branding.</p>

<p>Would you be open to a quick call to explore this?</p>`;

  // Replace variables in template
  for (const [key, value] of Object.entries(variables)) {
    subject = subject.replace(new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value);
    body = body.replace(new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value);
  }

  // Always append signature if provided (even when using custom template)
  if (settings.signature) {
    body += `\n\n${settings.signature}`;
  } else if (!template.body) {
    // Only add default sign-off if using generic template and no signature provided
    body += '\n\n<p>Best regards</p>';
  }

  return { subject, body };
}

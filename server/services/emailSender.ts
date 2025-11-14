
import { google } from 'googleapis';
import { storage } from '../storage';
import type { SequenceRecipient, StrategyTranscript } from '../../shared/schema';
import OpenAI from 'openai';

/**
 * Convert time difference in milliseconds to casual timeframe reference
 * e.g., "5 minutes ago", "a few hours ago", "last week", "a few months ago"
 * 
 * Note: Uses approximate month calculations (30 days) for casual phrasing
 */
function getCasualTimeframe(milliseconds: number): string {
  const minutes = milliseconds / (1000 * 60);
  const hours = minutes / 60;
  const days = hours / 24;
  const weeks = days / 7;
  const months = days / 30; // Approximate
  
  if (minutes < 30) {
    return "a few minutes ago";
  } else if (minutes < 90) {
    return "about an hour ago";
  } else if (hours < 6) {
    return "a few hours ago";
  } else if (hours < 24) {
    return "earlier today";
  } else if (hours < 36) {
    return "yesterday";
  } else if (days < 3) {
    return "a couple days ago";
  } else if (days < 7) {
    return "a few days ago";
  } else if (weeks < 2) {
    return "last week";
  } else if (weeks < 4) {
    return "a few weeks ago";
  } else if (months < 1.5) {
    return "about a month ago";
  } else if (months < 6) {
    return "a few months ago";
  } else if (months < 12) {
    return "several months ago";
  } else if (months < 18) {
    return "about a year ago";
  } else if (months < 24) {
    return "well over a year ago";
  } else {
    const years = Math.floor(months / 12);
    return `over ${years} years ago`;
  }
}

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

    // Build email headers (no From header - let Gmail use account's "Send mail as" settings)
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
  settings: { promptInjection?: string; keywordBin?: string; signature?: string },
  stepNumber: number = 1,
  finalizedStrategy?: string | null
): Promise<{ subject: string; body: string }> {
  // Get OpenAI settings - REQUIRED (no fallback system)
  const openaiSettings = await storage.getOpenaiSettings();
  if (!openaiSettings?.apiKey) {
    throw new Error('[EmailAI] CRITICAL: No OpenAI API key configured. Email queue cannot operate without AI generation.');
  }

  try {
    const openai = new OpenAI({ apiKey: openaiSettings.apiKey });

    // Fetch previous messages for context (if this is a follow-up)
    let previousMessages: Array<{ stepNumber: number; subject: string; body: string; sentAt: Date }> = [];
    if (stepNumber > 1) {
      const messages = await storage.getRecipientMessages(recipient.id);
      previousMessages = messages.map(m => ({
        stepNumber: m.stepNumber,
        subject: m.subject,
        body: m.body,
        sentAt: m.sentAt || new Date(),
      }));
    }

    // Build recipient context (for AI to understand business, but not directly quote)
    const recipientContext = `
RECIPIENT CONTEXT (for understanding, do not directly quote in email):
- Company/Contact: ${recipient.name || 'Unknown'}
- Email: ${recipient.email}
- Business Hours: ${recipient.businessHours || 'Not specified'}
- Sales Summary: ${recipient.salesSummary || 'Not available'}
`.trim();

    // CRITICAL: Campaign Brief (finalizedStrategy) is MANDATORY - NO FALLBACKS
    if (!finalizedStrategy || finalizedStrategy.trim() === '') {
      const error = new Error('FATAL: Campaign Brief (finalizedStrategy) is required for email generation. Sequence cannot proceed without finalized strategy.');
      console.error('[EmailAI] ❌ FATAL ERROR:', error.message, '- Recipient:', recipient.email, '- Step:', stepNumber);
      throw error;
    }

    // Use the Campaign Brief (90% token savings compared to replaying full transcript)
    console.log('[EmailAI] ✅ Using Campaign Brief (finalizedStrategy) for step', stepNumber, '- Preview:', finalizedStrategy.substring(0, 80) + '...');
    const strategyContext = '\n\nCAMPAIGN STRATEGY:\n' + finalizedStrategy;

    // Build previous email context for follow-ups
    let previousEmailContext = '';
    if (stepNumber > 1 && previousMessages.length > 0) {
      const now = new Date();
      previousEmailContext = '\n\nPREVIOUS EMAILS YOU SENT:\n';
      previousMessages.forEach(msg => {
        const timeDiff = now.getTime() - msg.sentAt.getTime();
        const casualTimeframe = getCasualTimeframe(timeDiff);
        previousEmailContext += `\nEmail ${msg.stepNumber} (sent ${casualTimeframe} on ${msg.sentAt.toLocaleDateString()}):\nSubject: ${msg.subject}\n${msg.body}\n`;
      });
      
      // Add note about timeframe flexibility
      previousEmailContext += `\n(Note: Timeframes above are suggestions - feel free to use your own natural phrasing when referencing previous emails)`;
    }

    // Step-specific system prompt
    let systemPrompt = '';
    
    if (stepNumber === 1) {
      // First email: Full introduction
      systemPrompt = `You are writing a cold outreach email. Follow these instructions in order of priority:

═══════════════════════════════════════════════════════════════
📋 1. CAMPAIGN STRATEGY (PRIMARY AUTHORITY - FOLLOW THIS FIRST)
═══════════════════════════════════════════════════════════════
${strategyContext}

${settings.promptInjection || ''}

⚠️ CRITICAL: The Campaign Strategy above is your PRIMARY creative authority. Follow ALL instructions it provides for:
   - Tone and voice
   - Key messaging and talking points
   - URLs to include
   - Specific constraints or requirements
   - Structure and flow

═══════════════════════════════════════════════════════════════
🎯 2. DELIVERABILITY PRINCIPLES (Guidelines - Support Campaign Strategy)
═══════════════════════════════════════════════════════════════
1. Brevity Wins: 70 words or less when feasible. Stay under 200 words absolute.
2. Purpose Over Product: Lead with meaning or alignment; features support, not lead.
3. Movement Language: Speak to belonging, not buying. Prefer "we're building" over "you should."
4. Pattern Interrupt: Start with a small truth or contrast (how it is vs how it should be).
5. Human Rhythm: Short clauses, warm verbs, conversational tone. No hype.
6. Precision Hooks: Subjects are 3–5 words, ≤35 characters, never all caps or punctuation clusters.
7. Personalization by Relevance: Reference context naturally—never fake flattery.
8. Ethical Urgency: Tie timing to real context, never pressure tactics.
9. Never Generic: No filler. Use clear, specific language that respects the reader.

SPAM KEYWORD FILTER (Never use):
- "free", "guarantee", "limited time", "act now", "click here", "100%", "risk-free"
- Excessive punctuation (!!!, ???, ALL CAPS)

═══════════════════════════════════════════════════════════════
💡 3. DEFAULT SUGGESTIONS (Only if Campaign Strategy doesn't specify)
═══════════════════════════════════════════════════════════════
- Opening: "I found your email on Leafly..." (establishes credibility)
- Acknowledgment: "If you're the right person to discuss [topic], that's great—if not, I'd appreciate being introduced to whoever handles [area]."
- Greeting: "Hi," (generic, professional)

NOTE: Campaign Strategy instructions ALWAYS override these defaults.

═══════════════════════════════════════════════════════════════
⚙️ 4. TECHNICAL REQUIREMENTS
═══════════════════════════════════════════════════════════════
- HTML FORMATTING: Use <p></p> tags for paragraphs and <br> for line breaks
- HTML HYPERLINKS: Format ALL URLs as clickable HTML links using proper anchor tags
  CRITICAL: Use the EXACT URL specified in the Campaign Strategy above
  Example format: <a href="[EXACT URL FROM CAMPAIGN]">descriptive anchor text</a>
  NEVER output plain text URLs - always wrap in <a> tags with the campaign-specified href
  NEVER use placeholder URLs like "example.com" - use the real URL from Campaign Strategy
- NO PERSONALIZATION: Don't mention business name, hours, or specific details from recipient context
- SIGNATURE: End with ${settings.signature ? 'the provided signature' : 'a simple sign-off'}

${recipientContext}

Generate a professional cold email with subject and body. Output HTML formatted body.`.trim();
    } else {
      // Follow-up email: Short bump or value-add
      systemPrompt = `You are writing follow-up email #${stepNumber - 1} (Step ${stepNumber} of sequence). Follow these instructions in order of priority:

═══════════════════════════════════════════════════════════════
📋 1. CAMPAIGN STRATEGY (PRIMARY AUTHORITY - FOLLOW THIS FIRST)
═══════════════════════════════════════════════════════════════
${strategyContext}

${settings.promptInjection || ''}

⚠️ CRITICAL: The Campaign Strategy above is your PRIMARY creative authority. Follow ALL instructions it provides for:
   - Tone and voice for follow-ups
   - Key messaging progression
   - URLs to include in follow-ups
   - Follow-up structure and flow
   - Specific constraints

═══════════════════════════════════════════════════════════════
📧 PREVIOUS EMAIL CONTEXT
═══════════════════════════════════════════════════════════════
${previousEmailContext}

═══════════════════════════════════════════════════════════════
🎯 2. DELIVERABILITY PRINCIPLES (Guidelines - Support Campaign Strategy)
═══════════════════════════════════════════════════════════════
1. Brevity Wins: Follow-ups should be BRIEF - under 100 words when feasible.
2. Purpose Over Product: Lead with meaning, not features.
3. Movement Language: Speak to belonging and shared values.
4. Human Rhythm: Short clauses, warm verbs, conversational tone.
5. Follow-Through Logic: Progress naturally from previous email—add value or reflect on timing.
6. Never Generic: No filler. Each follow-up should feel intentional.

SPAM KEYWORD FILTER (Never use):
- "free", "guarantee", "limited time", "act now", "click here", "100%", "risk-free"
- Excessive punctuation (!!!, ???, ALL CAPS)

═══════════════════════════════════════════════════════════════
💡 3. DEFAULT SUGGESTIONS (Only if Campaign Strategy doesn't specify)
═══════════════════════════════════════════════════════════════
- Reference previous email: "Following up on my email from [timeframe]..."
- Add value: Share helpful insight, resource, or context
- Breakup option (step 3+): "I'll assume the timing isn't right..."
- Keep it SHORT: 2-3 sentences, under 100 words

NOTE: Campaign Strategy instructions ALWAYS override these defaults.

═══════════════════════════════════════════════════════════════
⚙️ 4. TECHNICAL REQUIREMENTS
═══════════════════════════════════════════════════════════════
- SUBJECT: Use "Re: [original subject]" - MUST match first email's subject for threading
- HTML FORMATTING: Use <p></p> tags for paragraphs
- HTML HYPERLINKS: Format ALL URLs as clickable HTML links using proper anchor tags
  CRITICAL: Use the EXACT URL specified in the Campaign Strategy above
  Example format: <a href="[EXACT URL FROM CAMPAIGN]">descriptive anchor text</a>
  NEVER output plain text URLs - always wrap in <a> tags with the campaign-specified href
  NEVER use placeholder URLs like "example.com" - use the real URL from Campaign Strategy
- NO REPEAT: Don't rehash the full intro from Email 1
- NO PERSONALIZATION: Don't mention business name, hours, or specific details from recipient context

${recipientContext}

Generate a SHORT follow-up email. Remember: Subject must be "Re: [original subject]" for threading.`.trim();
    }

    const userPrompt = stepNumber === 1 
      ? 'Generate a cold outreach email for this recipient. Output format:\n\nSubject: [subject line here]\n\n[email body HTML only - do NOT repeat the subject line in the body]'
      : `Generate a SHORT follow-up email (step ${stepNumber}). Output format:\n\nSubject: Re: [use EXACT subject from Email 1]\n\n[brief follow-up body - do NOT repeat the intro]`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.8,
      max_tokens: stepNumber === 1 ? 500 : 300, // Shorter for follow-ups
    });

    const generatedContent = response.choices[0]?.message?.content || '';
    
    // Parse subject and body from response
    // Expected format: Subject: ... \n\n [body]
    const subjectMatch = generatedContent.match(/Subject:\s*(.+?)(\n|$)/i);
    const bodyMatch = generatedContent.match(/Body:\s*([\s\S]+)/i) || 
                      generatedContent.match(/^(?:Subject:.*?\n\n)?([\s\S]+)/);

    let subject = subjectMatch?.[1]?.trim() || 'Hemp Wick Partnership Opportunity';
    let body = bodyMatch?.[1]?.trim() || generatedContent;

    // Clean HTML tags from subject line (AI sometimes adds </p> or other tags)
    subject = subject.replace(/<[^>]*>/g, '').trim();

    // Clean up markdown code fences from body (AI sometimes wraps in ```html)
    body = body.replace(/^```html\s*/i, '').trim();
    body = body.replace(/\s*```$/i, '').trim();
    
    // Clean up any extra formatting and accidental subject duplicates
    body = body.replace(/^Body:\s*/i, '').trim();
    body = body.replace(/^<p>\s*Subject:.*?<\/p>\s*/i, '').trim();

    // Add signature if provided
    if (settings.signature) {
      body += `\n\n${settings.signature}`;
    }

    console.log('[EmailAI] ✅ Generated personalized email for', recipient.email);

    return { subject, body };
  } catch (error: any) {
    // Rethrow with context - no fallback system allowed
    if (error.response?.status === 401) {
      throw new Error('[EmailAI] CRITICAL: Invalid OpenAI API key. Check API key configuration.');
    }
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      throw new Error('[EmailAI] ERROR: OpenAI service unreachable. Network issue or service down. Recipient will retry automatically.');
    }
    throw new Error(`[EmailAI] ERROR: OpenAI generation failed: ${error.message}. Recipient will retry automatically.`);
  }
}

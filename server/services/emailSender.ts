import { google, gmail_v1 } from "googleapis";
import { replaceImagePlaceholders } from '../utils/imageUtils';
import { storage } from "../storage";
import type {
  SequenceRecipient,
  StrategyTranscript,
} from "../../shared/schema";
import OpenAI from "openai";
import { updateCommissionTrackerStatus } from "./commissionTrackerUpdate";
import { assignSingleRecipient } from "./Matrix2/slotAssigner";

/**
 * Convert time difference in milliseconds to casual timeframe reference
 */
function getCasualTimeframe(milliseconds: number): string {
  const minutes = milliseconds / (1000 * 60);
  const hours = minutes / 60;
  const days = hours / 24;
  const weeks = days / 7;
  const months = days / 30;

  if (minutes < 30) return "a few minutes ago";
  if (minutes < 90) return "about an hour ago";
  if (hours < 6) return "a few hours ago";
  if (hours < 24) return "earlier today";
  if (hours < 36) return "yesterday";
  if (days < 3) return "a couple days ago";
  if (days < 7) return "a few days ago";
  if (weeks < 2) return "last week";
  if (weeks < 4) return "a few weeks ago";
  if (months < 1.5) return "about a month ago";
  if (months < 6) return "a few months ago";
  if (months < 12) return "several months ago";
  if (months < 18) return "about a year ago";
  if (months < 24) return "well over a year ago";
  const years = Math.floor(months / 12);
  return `over ${years} years ago`;
}

interface EmailOptions {
  userId: string;
  to: string;
  subject: string;
  body: string;
  from?: string;
  threadId?: string;
  inReplyTo?: string;
  references?: string;
}

/**
 * Encode a string for email headers using MIME encoded-word format (RFC 2047)
 * Required for non-ASCII characters like smart quotes to display correctly
 */
function mimeEncodeSubject(subject: string): string {
  // Check if subject contains any non-ASCII characters
  const hasNonAscii = /[^\x00-\x7F]/.test(subject);
  
  if (!hasNonAscii) {
    return subject; // ASCII-only, no encoding needed
  }
  
  // Use MIME encoded-word format: =?charset?encoding?encoded_text?=
  // B = Base64 encoding
  const encoded = Buffer.from(subject, 'utf8').toString('base64');
  return `=?UTF-8?B?${encoded}?=`;
}

interface EmailResponse {
  success: boolean;
  messageId?: string;
  threadId?: string;
  rfc822MessageId?: string;
  error?: string;
}

/**
 * Sends email via Gmail OAuth API
 * (UNCHANGED — WORKS FINE)
 */
export async function sendEmail(options: EmailOptions): Promise<EmailResponse> {
  try {
    const integration = await storage.getUserIntegration(options.userId);
    if (!integration?.googleCalendarAccessToken) {
      throw new Error("Gmail not connected. Please connect Gmail first.");
    }

    const systemIntegration =
      await storage.getSystemIntegration("google_sheets");
    if (
      !systemIntegration?.googleClientId ||
      !systemIntegration?.googleClientSecret
    ) {
      throw new Error("System OAuth not configured");
    }

    let accessToken = integration.googleCalendarAccessToken;

    if (
      integration.googleCalendarTokenExpiry &&
      integration.googleCalendarTokenExpiry < Date.now()
    ) {
      if (!integration.googleCalendarRefreshToken) {
        throw new Error("Gmail token expired. Please reconnect Gmail.");
      }

      const refreshResponse = await fetch(
        "https://oauth2.googleapis.com/token",
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: systemIntegration.googleClientId,
            client_secret: systemIntegration.googleClientSecret,
            refresh_token: integration.googleCalendarRefreshToken,
            grant_type: "refresh_token",
          }),
        },
      );

      if (!refreshResponse.ok) {
        throw new Error("Failed to refresh Gmail token");
      }

      const tokens = await refreshResponse.json();
      accessToken = tokens.access_token;

      await storage.updateUserIntegration(options.userId, {
        googleCalendarAccessToken: accessToken,
        googleCalendarTokenExpiry: Date.now() + tokens.expires_in * 1000,
      });
    }

    const oauth2Client = new google.auth.OAuth2(
      systemIntegration.googleClientId,
      systemIntegration.googleClientSecret,
    );

    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: integration.googleCalendarRefreshToken,
    });

    const gmail = google.gmail({ version: "v1", auth: oauth2Client });

    const headers: string[] = [
      `To: ${options.to}`,
      `Subject: ${mimeEncodeSubject(options.subject)}`,
      "Content-Type: text/html; charset=utf-8",
    ];

    if (options.inReplyTo) headers.push(`In-Reply-To: ${options.inReplyTo}`);
    if (options.references) headers.push(`References: ${options.references}`);

    const processedBody = replaceImagePlaceholders(options.body);
    const email = [...headers, "", processedBody].join("\r\n");

    const encodedEmail = Buffer.from(email)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    const requestBody: any = { raw: encodedEmail };
    if (options.threadId) requestBody.threadId = options.threadId;

    const response = await gmail.users.messages.send({
      userId: "me",
      requestBody,
    });

    const gmailMessageId = response.data.id;
    const gmailThreadId = response.data.threadId;

    let rfc822MessageId: string | undefined;
    if (gmailMessageId) {
      try {
        const message = await gmail.users.messages.get({
          userId: "me",
          id: gmailMessageId,
          format: "full",
        });

        const headers = message.data.payload?.headers || [];
        const msgIdHeader = headers.find(
          (h) => h.name?.toLowerCase() === "message-id",
        );
        if (msgIdHeader?.value) rfc822MessageId = msgIdHeader.value;
      } catch {}
    }

    return {
      success: true,
      messageId: gmailMessageId,
      threadId: gmailThreadId,
      rfc822MessageId,
    };
  } catch (error: any) {
    return { success: false, error: error.message || "Unknown error" };
  }
}

/**
 * Get Gmail client from email account credentials
 * Used for sequences with assigned sender email accounts
 */
async function getGmailClientForEmailAccount(emailAccountId: string, tenantId: string): Promise<{ gmail: gmail_v1.Gmail; email: string }> {
  const account = await storage.getEmailAccount(emailAccountId, tenantId);
  if (!account) throw new Error('Email account not found');
  if (account.status !== 'active') throw new Error('Email account is not active');
  if (!account.accessToken) throw new Error('Email account not connected');

  const systemIntegration = await storage.getSystemIntegration('google_sheets');
  if (!systemIntegration?.googleClientId || !systemIntegration?.googleClientSecret) {
    throw new Error('System OAuth not configured');
  }

  let accessToken = account.accessToken;

  if (account.tokenExpiry && account.tokenExpiry < Date.now()) {
    if (!account.refreshToken) throw new Error('Email account token expired');

    const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: systemIntegration.googleClientId,
        client_secret: systemIntegration.googleClientSecret,
        refresh_token: account.refreshToken,
        grant_type: 'refresh_token'
      })
    });

    if (!refreshResponse.ok) throw new Error('Failed to refresh email account token');
    const tokens = await refreshResponse.json();
    accessToken = tokens.access_token;

    await storage.updateEmailAccount(emailAccountId, tenantId, {
      accessToken,
      tokenExpiry: Date.now() + (tokens.expires_in * 1000),
    });
  }

  const oauth2Client = new google.auth.OAuth2(
    systemIntegration.googleClientId,
    systemIntegration.googleClientSecret
  );
  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: account.refreshToken,
  });

  return { gmail: google.gmail({ version: 'v1', auth: oauth2Client }), email: account.email };
}

/**
 * Send email using a Gmail client directly
 * Used when sending from email accounts instead of user integrations
 */
async function sendEmailWithGmailClient(
  gmail: gmail_v1.Gmail,
  options: { to: string; subject: string; body: string; threadId?: string; inReplyTo?: string; references?: string }
): Promise<EmailResponse> {
  try {
    const headers: string[] = [
      `To: ${options.to}`,
      `Subject: ${mimeEncodeSubject(options.subject)}`,
      "Content-Type: text/html; charset=utf-8",
    ];

    if (options.inReplyTo) headers.push(`In-Reply-To: ${options.inReplyTo}`);
    if (options.references) headers.push(`References: ${options.references}`);

    const processedBody = replaceImagePlaceholders(options.body);
    const email = [...headers, "", processedBody].join("\r\n");

    const encodedEmail = Buffer.from(email)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    const requestBody: any = { raw: encodedEmail };
    if (options.threadId) requestBody.threadId = options.threadId;

    const response = await gmail.users.messages.send({
      userId: "me",
      requestBody,
    });

    const gmailMessageId = response.data.id;
    const gmailThreadId = response.data.threadId;

    let rfc822MessageId: string | undefined;
    if (gmailMessageId) {
      try {
        const message = await gmail.users.messages.get({
          userId: "me",
          id: gmailMessageId,
          format: "full",
        });

        const msgHeaders = message.data.payload?.headers || [];
        const msgIdHeader = msgHeaders.find(
          (h) => h.name?.toLowerCase() === "message-id",
        );
        if (msgIdHeader?.value) rfc822MessageId = msgIdHeader.value;
      } catch {}
    }

    return {
      success: true,
      messageId: gmailMessageId,
      threadId: gmailThreadId,
      rfc822MessageId,
    };
  } catch (error: any) {
    return { success: false, error: error.message || "Unknown error" };
  }
}

/**
 * CLEAN, HIGH-PERFORMANCE AI EMAIL GENERATION
 */
export async function personalizeEmailWithAI(
  recipient: SequenceRecipient,
  template: { subject?: string; body?: string },
  strategyTranscript: StrategyTranscript | null,
  settings: {
    promptInjection?: string;
    keywordBin?: string;
    signature?: string;
  },
  stepNumber: number = 1,
  finalizedStrategy?: string | null,
  tenantId?: string,
): Promise<{ subject: string; body: string }> {
  // -------------------------
  // VALIDATION
  // -------------------------
  const effectiveTenantId = tenantId || recipient.tenantId;
  if (!effectiveTenantId) throw new Error("No tenant ID available for OpenAI settings lookup.");
  const openaiSettings = await storage.getOpenaiSettings(effectiveTenantId);
  if (!openaiSettings?.apiKey) throw new Error("No OpenAI API key.");

  const alignerAssistant = await storage.getAssistantBySlug("aligner", effectiveTenantId);
  if (!alignerAssistant?.assistantId)
    throw new Error("Aligner assistant missing.");

  if (!finalizedStrategy || finalizedStrategy.trim() === "") {
    throw new Error("Campaign Brief missing.");
  }

  const openai = new OpenAI({ apiKey: openaiSettings.apiKey });

  // -------------------------
  // FOLLOW-UP CONTEXT (if step > 1)
  // -------------------------
  let previousEmailContext = "";
  if (stepNumber > 1) {
    const msgs = await storage.getRecipientMessages(recipient.id);
    const now = new Date();

    if (msgs.length > 0) {
      previousEmailContext = "PREVIOUS EMAILS:\n";
      for (const m of msgs) {
        const diff = now.getTime() - (m.sentAt?.getTime() || now.getTime());
        previousEmailContext += `Email ${m.stepNumber} (${getCasualTimeframe(diff)}):\nSubject: ${m.subject}\n${m.body}\n\n`;
      }
    }
  }

  // -------------------------
  // RECIPIENT CONTEXT
  // -------------------------
  const recipientContext = `
RECIPIENT CONTEXT (do not quote directly):
- Contact: ${recipient.name || "Unknown"}
- Email: ${recipient.email}
- Business Hours: ${recipient.businessHours || "Unknown"}
- Sales Summary: ${recipient.salesSummary || "Unavailable"}
`;

  // -------------------------
  // KEYWORD BIN — now functional
  // -------------------------
  const keywordContext = settings.keywordBin
    ? `RELEVANT KEYWORDS (do not quote directly):\n${settings.keywordBin}\n`
    : "";

  // -------------------------
  // SYSTEM PROMPT
  // -------------------------
  const systemPrompt = `
You are the Outreach Architect generating cold outreach emails and follow-up emails.

CAMPAIGN BRIEF (PRIMARY AUTHORITY):
${finalizedStrategy}

${settings.promptInjection || ""}

${keywordContext}

${previousEmailContext}

${recipientContext}

RULES:
- Follow Campaign Brief first.
- Follow settings.promptInjection rules second.
- Use keywords for conceptual grounding only.
- Email 1 = cold email. Steps >1 = short follow-ups.
- Use <p></p> for paragraphs. No plaintext line breaks.
- Output JSON only.

JSON FORMAT:
{
  "subject": "...",
  "body": "HTML content"
}
`;

  const userPrompt =
    stepNumber === 1
      ? "Generate the first cold outreach email."
      : `Generate follow-up email #${stepNumber - 1}. Subject must be "Re: [original subject]".`;

  // -------------------------
  // OPENAI CALL
  // -------------------------
  const thread = await openai.beta.threads.create({
    messages: [{ role: "user", content: `${systemPrompt}\n\n${userPrompt}` }],
  });

  const run = await openai.beta.threads.runs.create(thread.id, {
    assistant_id: alignerAssistant.assistantId,
    response_format: { type: "json_object" },
  });

  let status = await openai.beta.threads.runs.retrieve(run.id, { thread_id: thread.id });
  while (status.status === "queued" || status.status === "in_progress") {
    await new Promise((r) => setTimeout(r, 2500));
    status = await openai.beta.threads.runs.retrieve(run.id, { thread_id: thread.id });
  }

  if (status.status !== "completed") {
    throw new Error(`Aligner failed: ${status.status}`);
  }

  const msgs = await openai.beta.threads.messages.list(thread.id);
  const assistantMessage = msgs.data.find((m) => m.role === "assistant");
  if (!assistantMessage) throw new Error("No AI response.");

  const raw = assistantMessage.content
    .filter((c: any) => c.type === "text")
    .map((c: any) => c.text.value)
    .join("");

  let emailData: any;
  try {
    emailData = JSON.parse(raw);
  } catch {
    throw new Error("Invalid JSON from AI.");
  }

  if (!emailData.subject || !emailData.body) {
    throw new Error("Missing subject or body.");
  }

  const subject = emailData.subject.trim();
  let body = emailData.body.trim();

  if (settings.signature) {
    body += `\n\n${settings.signature}`;
  }

  body = replaceImagePlaceholders(body);

  return { subject, body };
}

/**
 * Send failure notification when email send fails
 * Creates in-app notification AND sends email to michael@naturalmaterials.eu
 */
interface FailureNotificationParams {
  recipientEmail: string;
  recipientId: string;
  sequenceName: string;
  sequenceId: string;
  tenantId: string;
  errorReason: string;
  emailAccountId?: string;
}

async function sendFailureNotification(params: FailureNotificationParams): Promise<void> {
  const { recipientEmail, recipientId, sequenceName, sequenceId, tenantId, errorReason, emailAccountId } = params;
  
  try {
    // Get admin user ID for notification
    const adminTenantId = await storage.getAdminTenantId();
    const adminUser = await storage.getUserByEmail('michael@naturalmaterials.eu');
    
    if (!adminUser) {
      console.error('[EmailSender] Cannot send failure notification: admin user not found');
      return;
    }

    // 1. Create in-app notification
    const notificationTitle = 'Email Send Failed';
    const notificationMessage = `Failed to send email to ${recipientEmail} from sequence "${sequenceName}". Reason: ${errorReason}`;
    
    await storage.createNotification({
      tenantId: adminTenantId || tenantId,
      userId: adminUser.id,
      notificationType: 'email_failure',
      title: notificationTitle,
      message: notificationMessage,
      priority: 'high',
      metadata: {
        recipientEmail,
        recipientId,
        sequenceId,
        sequenceName,
        emailAccountId,
        errorReason,
        failedAt: new Date().toISOString(),
      },
    });

    // 2. Send email notification to michael@naturalmaterials.eu
    // Use a simple email via the admin user's Gmail (if available)
    try {
      const adminIntegration = await storage.getUserIntegration(adminUser.id);
      if (adminIntegration?.googleCalendarAccessToken) {
        const systemIntegration = await storage.getSystemIntegration('google_sheets');
        if (systemIntegration?.googleClientId && systemIntegration?.googleClientSecret) {
          const oauth2Client = new google.auth.OAuth2(
            systemIntegration.googleClientId,
            systemIntegration.googleClientSecret
          );
          oauth2Client.setCredentials({
            access_token: adminIntegration.googleCalendarAccessToken,
            refresh_token: adminIntegration.googleCalendarRefreshToken,
          });
          
          const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
          
          const emailBody = `
<h2>Email Send Failed</h2>
<p><strong>Recipient:</strong> ${recipientEmail}</p>
<p><strong>Sequence:</strong> ${sequenceName}</p>
<p><strong>Error:</strong> ${errorReason}</p>
<p><strong>Email Account ID:</strong> ${emailAccountId || 'Not assigned'}</p>
<p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
<p>The recipient has been bumped to the next available slot.</p>
          `.trim();
          
          const headers = [
            `To: michael@naturalmaterials.eu`,
            `Subject: [E-Hub Alert] Email Send Failed - ${sequenceName}`,
            'Content-Type: text/html; charset=utf-8',
          ];
          
          const email = [...headers, '', emailBody].join('\r\n');
          const encodedEmail = Buffer.from(email)
            .toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');
          
          await gmail.users.messages.send({
            userId: 'me',
            requestBody: { raw: encodedEmail },
          });
          
          console.log(`[EmailSender] Failure notification email sent to michael@naturalmaterials.eu`);
        }
      }
    } catch (emailError: any) {
      // Don't fail if notification email can't be sent - in-app notification is still created
      console.error(`[EmailSender] Could not send failure notification email: ${emailError.message}`);
    }
  } catch (error: any) {
    console.error(`[EmailSender] Failed to create failure notification: ${error.message}`);
  }
}

/**
 * Matrix2 Integration: Send email to recipient by ID
 * Handles full workflow: fetch data, generate content, send, update metadata
 */
export async function sendEmailToRecipient(recipientId: string): Promise<boolean> {
  try {
    // 1. Fetch recipient with sequence data
    const recipient = await storage.getRecipientById(recipientId);
    if (!recipient) {
      return false;
    }

    const sequence = await storage.getSequenceById(recipient.sequenceId);
    if (!sequence) {
      return false;
    }

    const settings = await storage.getEhubSettings(sequence.tenantId);
    if (!settings) {
      return false;
    }

    // 2. Generate email content using AI
    const currentStep = (recipient.currentStep || 0) + 1; // Next step to send
    
    const { subject, body } = await personalizeEmailWithAI(
      recipient,
      {}, // template not used - AI generates everything
      sequence.strategyTranscript,
      {
        promptInjection: settings.promptInjection || undefined,
        keywordBin: settings.keywordBin || undefined,
        signature: settings.signature || undefined,
      },
      currentStep,
      sequence.finalizedStrategy,
      sequence.tenantId,
    );

    // 3.5 Look up threading info from previous emails (for follow-ups)
    let threadId: string | undefined;
    let inReplyTo: string | undefined;
    let references: string | undefined;
    
    if (currentStep > 1) {
      // Get the first email's threading info
      const previousMessages = await storage.getRecipientMessages(recipient.id);
      if (previousMessages.length > 0) {
        // Sort by step number to get the first email
        // Handle both camelCase (Drizzle) and snake_case (raw SQL) field names
        previousMessages.sort((a, b) => {
          const aStep = a.stepNumber ?? a.step_number ?? 0;
          const bStep = b.stepNumber ?? b.step_number ?? 0;
          return aStep - bStep;
        });
        const firstMessage = previousMessages[0];
        const lastMessage = previousMessages[previousMessages.length - 1];
        
        // Use the first email's threadId for Gmail threading
        // Handle both camelCase and snake_case field names
        threadId = firstMessage.threadId || firstMessage.thread_id || undefined;
        
        // Use the most recent email's rfc822MessageId for In-Reply-To
        // The messageId/message_id column now stores RFC822 Message-ID
        inReplyTo = lastMessage.messageId || lastMessage.message_id || undefined;
        
        // Build References chain from all previous emails
        const rfc822Ids = previousMessages
          .map(m => m.messageId || m.message_id)
          .filter((id): id is string => !!id);
        if (rfc822Ids.length > 0) {
          references = rfc822Ids.join(' ');
        }
      }
    }

    // 4. Send email via Gmail - MUST have an assigned email account (no fallback)
    let emailResult: EmailResponse;
    let usedEmailAccountId: string | null = null;
    
    if (!sequence.senderEmailAccountId) {
      // NO FALLBACK: Sequence must have an assigned email account
      const errorMsg = `No email account assigned to sequence "${sequence.name}"`;
      console.error(`[EmailSender] ${errorMsg} - recipient: ${recipient.email}`);
      
      // Create notification and send alert email
      await sendFailureNotification({
        recipientEmail: recipient.email,
        recipientId: recipient.id,
        sequenceName: sequence.name || 'Unknown Sequence',
        sequenceId: sequence.id,
        tenantId: sequence.tenantId,
        errorReason: errorMsg,
      });
      
      return false;
    }
    
    // Use the sequence's assigned email account
    try {
      const { gmail } = await getGmailClientForEmailAccount(sequence.senderEmailAccountId, sequence.tenantId);
      emailResult = await sendEmailWithGmailClient(gmail, {
        to: recipient.email,
        subject,
        body,
        threadId,
        inReplyTo,
        references,
      });
      usedEmailAccountId = sequence.senderEmailAccountId;
    } catch (emailAccountError: any) {
      // NO FALLBACK: If account fails, notify and return false
      const errorMsg = emailAccountError.message || 'Unknown email account error';
      console.error(`[EmailSender] Email account failed for sequence "${sequence.name}": ${errorMsg}`);
      
      // Create notification and send alert email
      await sendFailureNotification({
        recipientEmail: recipient.email,
        recipientId: recipient.id,
        sequenceName: sequence.name || 'Unknown Sequence',
        sequenceId: sequence.id,
        tenantId: sequence.tenantId,
        errorReason: `Email account error: ${errorMsg}`,
        emailAccountId: sequence.senderEmailAccountId,
      });
      
      return false;
    }

    if (!emailResult.success) {
      // Email send failed (not account error, but Gmail API error)
      const errorMsg = emailResult.error || 'Gmail send failed';
      console.error(`[EmailSender] Gmail send failed for ${recipient.email}: ${errorMsg}`);
      
      await sendFailureNotification({
        recipientEmail: recipient.email,
        recipientId: recipient.id,
        sequenceName: sequence.name || 'Unknown Sequence',
        sequenceId: sequence.id,
        tenantId: sequence.tenantId,
        errorReason: errorMsg,
        emailAccountId: sequence.senderEmailAccountId,
      });
      
      return false;
    }

    // 5. Update recipient metadata (CRITICAL: Save threadId for reply detection!)
    const now = new Date();
    await storage.updateRecipient(recipient.id, {
      currentStep,
      lastStepSentAt: now,
      status: currentStep >= (sequence.stepDelays?.length || 0) && !sequence.repeatLastStep 
        ? 'completed' 
        : 'in_sequence',
      updatedAt: now,
      threadId: emailResult.threadId,
    });

    // 6. Record message in history
    await storage.insertRecipientMessage({
      id: crypto.randomUUID(),
      recipientId: recipient.id,
      stepNumber: currentStep,
      subject,
      body,
      sentAt: now,
      gmailMessageId: emailResult.messageId,
      gmailThreadId: emailResult.threadId,
      rfc822MessageId: emailResult.rfc822MessageId,
    });

    // 7. POST-SEND BOOKKEEPING (critical fixes for broken system)
    // Increment sequence sentCount (atomic operation to prevent race conditions)
    try {
      await storage.incrementSequenceSentCount(sequence.id);
    } catch (error) {
      // Silent failure - don't break email sending for bookkeeping errors
    }

    // 7.5 Increment email account daily send count if using an email account
    if (usedEmailAccountId) {
      try {
        await storage.incrementEmailAccountDailySendCount(usedEmailAccountId, sequence.tenantId);
      } catch (error) {
        // Silent failure - don't break email sending for tracking errors
      }
    }

    // 8. UPDATE COMMISSION TRACKER GOOGLE SHEETS (critical fix!)
    if (recipient.link) {
      try {
        // Get the user who created this sequence to find their agentName
        const sequenceCreator = await storage.getUserById(sequence.createdBy);
        const agentName = sequenceCreator?.agentName || 'Unknown Agent';
        
        await updateCommissionTrackerStatus(
          recipient.link,
          agentName,
          'Emailed',
          sequence.tenantId
        );
      } catch (error) {
        // Silent failure - don't break email sending for tracker errors
      }
    }

    // 9. SCHEDULE NEXT STEP (critical for multi-step progression)
    // Assign recipient to next available slot if still in_sequence
    if (recipient.status === 'in_sequence' || currentStep < (sequence.stepDelays?.length || 0)) {
      try {
        await assignSingleRecipient(recipient.id);
      } catch (error) {
        // Silent failure - don't break email sending for scheduling errors
      }
    }

    return true;

  } catch (error: any) {
    return false;
  }
}

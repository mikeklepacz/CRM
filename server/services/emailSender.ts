import { google } from "googleapis";
import { storage } from "../storage";
import type {
  SequenceRecipient,
  StrategyTranscript,
} from "../../shared/schema";
import OpenAI from "openai";

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
    console.log(`[EmailSender] sendEmail called for userId: ${options.userId}`);
    const integration = await storage.getUserIntegration(options.userId);
    console.log(`[EmailSender] Integration lookup result:`, {
      found: !!integration,
      hasAccessToken: !!integration?.googleCalendarAccessToken,
      hasRefreshToken: !!integration?.googleCalendarRefreshToken,
      email: integration?.googleCalendarEmail
    });
    if (!integration?.googleCalendarAccessToken) {
      console.error(`[EmailSender] MISSING Gmail token for user ${options.userId}`);
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
      `Subject: ${options.subject}`,
      "Content-Type: text/html; charset=utf-8",
    ];

    if (options.inReplyTo) headers.push(`In-Reply-To: ${options.inReplyTo}`);
    if (options.references) headers.push(`References: ${options.references}`);

    const email = [...headers, "", options.body].join("\r\n");

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
): Promise<{ subject: string; body: string }> {
  // -------------------------
  // VALIDATION
  // -------------------------
  const openaiSettings = await storage.getOpenaiSettings();
  if (!openaiSettings?.apiKey) throw new Error("No OpenAI API key.");

  const alignerAssistant = await storage.getAssistantBySlug("aligner");
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

  let status = await openai.beta.threads.runs.retrieve(thread.id, run.id);
  while (status.status === "queued" || status.status === "in_progress") {
    await new Promise((r) => setTimeout(r, 2500));
    status = await openai.beta.threads.runs.retrieve(thread.id, run.id);
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

  return { subject, body };
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
      console.error(`[EmailSender] Recipient ${recipientId} not found`);
      return false;
    }

    const sequence = await storage.getSequenceById(recipient.sequenceId);
    if (!sequence) {
      console.error(`[EmailSender] Sequence ${recipient.sequenceId} not found`);
      return false;
    }

    const settings = await storage.getEhubSettings();
    if (!settings) {
      console.error('[EmailSender] E-Hub settings not found');
      return false;
    }

    // 2. Get admin user for Gmail OAuth
    // CRITICAL FIX: Hardcode the actual admin user ID to bypass ghost user bug
    const ADMIN_USER_ID = '4df35876-ab89-4860-8656-0440accfea14'; // michael@naturalmaterials.eu
    console.log('[EmailSender] Using HARDCODED admin user ID for Gmail:', ADMIN_USER_ID);

    // 3. Generate email content using AI
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
      sequence.finalizedStrategy
    );

    // 4. Send email via Gmail
    const emailResult = await sendEmail({
      userId: ADMIN_USER_ID,
      to: recipient.email,
      subject,
      body,
    });

    if (!emailResult.success) {
      console.error(`[EmailSender] Failed to send email to ${recipient.email}:`, emailResult.error);
      return false;
    }

    // 5. Update recipient metadata
    const now = new Date();
    await storage.updateRecipient(recipient.id, {
      currentStep,
      lastStepSentAt: now,
      status: currentStep >= (sequence.stepDelays?.length || 0) && !sequence.repeatLastStep 
        ? 'completed' 
        : 'in_sequence',
      updatedAt: now,
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

    console.log(`[EmailSender] ✅ Sent email to ${recipient.email} (step ${currentStep})`);
    return true;

  } catch (error: any) {
    console.error(`[EmailSender] Error sending email to recipient ${recipientId}:`, error);
    return false;
  }
}

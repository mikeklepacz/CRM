import OpenAI from "openai";
import { replaceImagePlaceholders } from "../../utils/imageUtils";
import { storage } from "../../storage";
import { PersonalizeSettings, PersonalizeTemplate, SequenceRecipient, StrategyTranscript } from "./types";

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

export async function personalizeEmailWithAI(
  recipient: SequenceRecipient,
  template: PersonalizeTemplate,
  strategyTranscript: StrategyTranscript | null,
  settings: PersonalizeSettings,
  stepNumber: number = 1,
  finalizedStrategy?: string | null,
  tenantId?: string,
): Promise<{ subject: string; body: string }> {
  const _template = template;
  const _strategyTranscript = strategyTranscript;
  const effectiveTenantId = tenantId || recipient.tenantId;
  if (!effectiveTenantId) throw new Error("No tenant ID available for OpenAI settings lookup.");
  const openaiSettings = await storage.getOpenaiSettings(effectiveTenantId);
  if (!openaiSettings?.apiKey) throw new Error("No OpenAI API key.");

  const alignerAssistant = await storage.getAssistantBySlug("aligner", effectiveTenantId);
  if (!alignerAssistant?.assistantId) throw new Error("Aligner assistant missing.");

  if (!finalizedStrategy || finalizedStrategy.trim() === "") {
    throw new Error("Campaign Brief missing.");
  }

  const openai = new OpenAI({ apiKey: openaiSettings.apiKey });

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

  const recipientContext = `
RECIPIENT CONTEXT (do not quote directly):
- Contact: ${recipient.name || "Unknown"}
- Email: ${recipient.email}
- Business Hours: ${recipient.businessHours || "Unknown"}
- Sales Summary: ${recipient.salesSummary || "Unavailable"}
`;

  const keywordContext = settings.keywordBin
    ? `RELEVANT KEYWORDS (do not quote directly):\n${settings.keywordBin}\n`
    : "";

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

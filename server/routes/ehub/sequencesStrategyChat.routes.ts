import type { Express } from "express";
import OpenAI from "openai";
import { z } from "zod";
import { storage } from "../../storage";

export function registerEhubSequencesStrategyChatRoutes(
  app: Express,
  deps: { isAdmin: any; isAuthenticatedCustom: any }
): void {
  app.get("/api/sequences/:id/strategy-chat", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const sequence = await storage.getSequence(req.params.id, req.user.tenantId);
      if (!sequence) {
        return res.status(404).json({ message: "Sequence not found" });
      }

      const transcript = sequence.strategyTranscript || { messages: [], lastUpdatedAt: new Date().toISOString() };
      res.json(transcript);
    } catch (error: any) {
      console.error("Error getting strategy chat:", error);
      res.status(500).json({ message: error.message || "Failed to get strategy chat" });
    }
  });

  app.post("/api/sequences/:id/strategy-chat", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      const { message } = z.object({
        message: z.string().min(1, "Message is required"),
      }).parse(req.body);

      const sequence = await storage.getSequence(id, req.user.tenantId);
      if (!sequence) {
        return res.status(404).json({ message: "Sequence not found" });
      }

      const alignerAssistant = await storage.getAssistantBySlug("aligner", req.user.tenantId);
      if (!alignerAssistant || !alignerAssistant.assistantId) {
        return res.status(400).json({ message: "Aligner assistant not configured" });
      }

      const openaiSettings = await storage.getOpenaiSettings(req.user.tenantId);
      if (!openaiSettings || !openaiSettings.apiKey) {
        return res.status(400).json({ message: "OpenAI API key not configured" });
      }

      const ehubSettings = await storage.getEhubSettings(req.user.tenantId);
      const promptInjection = ehubSettings?.promptInjection || "";
      const keywordBin = ehubSettings?.keywordBin || "";

      const openai = new OpenAI({ apiKey: openaiSettings.apiKey });

      const existingTranscript = sequence.strategyTranscript || { messages: [], lastUpdatedAt: new Date().toISOString() };
      let threadId = (existingTranscript as any).threadId;

      if (!threadId) {
        const thread = await openai.beta.threads.create();
        threadId = thread.id;
        console.log("[E-Hub Strategy] New thread created:", threadId);
      }

      const contextualInstructions = `## YOUR ROLE:
You are The Bellwether Outreach Architect, an AI strategist that designs short, high-signal outreach emails for cannabis industry professionals and brands.

Your job is to craft campaigns that grab attention, build credibility, and convert genuine curiosity into conversation — without ever sounding like advertising.

## E-HUB CAMPAIGN CONTEXT:
${promptInjection ? `**Campaign Tone & Structure:**\n${promptInjection}\n\n` : ""}${keywordBin ? `**Product/Business Keywords:**\n${keywordBin}\n\n` : ""}
## YOUR WORKFLOW:

When the user asks you to plan a campaign:

1. **UNDERSTAND THE GOAL** - Ask clarifying questions:
   - Campaign objectives (re-engagement, new customer acquisition, partnership, etc.)
   - Target audience characteristics
   - Key value propositions to highlight
   - Tone preference (professional, friendly, consultative, etc.)
   - Any specific constraints or requirements

2. **SUGGEST SEQUENCE STRUCTURE** - Recommend optimal multi-step flow:
   - Number of follow-up steps (typically 2-4)
   - Timing between emails (days)
   - Escalation strategy (soft → direct)

3. **HELP CRAFT MESSAGING** - Guide the user on:
   - Opening hooks that build trust
   - Personalization opportunities
   - Clear but soft calls-to-action
   - Follow-up angles that add value

Based on the conversation, help the user design an effective email sequence that achieves their goals.`;

      const enrichedMessage = `${contextualInstructions}\n\nUser: ${message}`;

      await openai.beta.threads.messages.create(threadId, {
        role: "user",
        content: enrichedMessage
      });

      const run = await openai.beta.threads.runs.create(threadId, {
        assistant_id: alignerAssistant.assistantId,
      });

      let runStatus = await openai.beta.threads.runs.retrieve(run.id, { thread_id: threadId });
      let attempts = 0;
      const maxAttempts = 60;

      while (runStatus.status === "queued" || runStatus.status === "in_progress") {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        runStatus = await openai.beta.threads.runs.retrieve(run.id, { thread_id: threadId });
        attempts++;

        if (attempts >= maxAttempts) {
          throw new Error("Strategy chat timeout - response took too long");
        }
      }

      if (runStatus.status !== "completed") {
        throw new Error(`Strategy chat failed: ${runStatus.status}`);
      }

      const messages = await openai.beta.threads.messages.list(threadId, { limit: 1 });
      const lastMessage = messages.data[0];

      if (!lastMessage || lastMessage.role !== "assistant") {
        throw new Error("No response from Aligner assistant");
      }

      const aiResponse = lastMessage.content
        .filter((block: any) => block.type === "text")
        .map((block: any) => block.text.value)
        .join("\n\n") || "Sorry, I could not generate a response.";

      const updatedSequence = await storage.appendSequenceStrategyMessages(
        id,
        [
          { role: "user", content: message, createdBy: userId },
          { role: "assistant", content: aiResponse },
        ],
        threadId
      );

      res.json({
        transcript: updatedSequence.strategyTranscript,
        aiResponse,
      });
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid message data", errors: error.errors });
      }
      console.error("Error in strategy chat:", error);
      res.status(500).json({ message: error.message || "Failed to process strategy chat" });
    }
  });
}

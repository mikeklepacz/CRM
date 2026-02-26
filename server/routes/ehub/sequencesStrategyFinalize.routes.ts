import type { Express } from "express";
import OpenAI from "openai";
import { z } from "zod";
import { storage } from "../../storage";

export function registerEhubSequencesStrategyFinalizeRoutes(
  app: Express,
  deps: { isAdmin: any; isAuthenticatedCustom: any }
): void {
  app.post("/api/sequences/:id/finalize-strategy", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;

      const sequence = await storage.getSequence(id, req.user.tenantId);
      if (!sequence) {
        return res.status(404).json({ message: "Sequence not found" });
      }

      if (!sequence.strategyTranscript || !sequence.strategyTranscript.messages || sequence.strategyTranscript.messages.length === 0) {
        return res.status(400).json({ message: "No strategy messages to finalize. Start a conversation first." });
      }

      const alignerAssistant = await storage.getAssistantBySlug("aligner", req.user.tenantId);
      if (!alignerAssistant || !alignerAssistant.assistantId) {
        return res.status(400).json({ message: "Aligner assistant not configured" });
      }

      const openaiSettings = await storage.getOpenaiSettings(req.user.tenantId);
      if (!openaiSettings || !openaiSettings.apiKey) {
        return res.status(400).json({ message: "OpenAI API key not configured" });
      }

      const openai = new OpenAI({ apiKey: openaiSettings.apiKey });

      let conversationContext = "Here is the complete strategy conversation:\n\n";
      sequence.strategyTranscript.messages.forEach((msg) => {
        const role = msg.role === "user" ? "USER" : "ASSISTANT";
        conversationContext += `${role}: ${msg.content}\n\n`;
      });

      const synthesisPrompt = `You are a campaign strategy distillation expert. Your job is to read an entire strategy conversation and distill it into a concise, actionable campaign brief.

REQUIREMENTS:
- 200-300 words maximum
- Clear, directive tone (not conversational)
- Include: target audience, campaign goals, tone/voice, key messaging points, constraints
- Organize with clear sections using markdown headers
- This will be injected into email generation prompts, so be specific and actionable
- Do NOT include explanations or meta-commentary - just the pure strategic brief

Output format example:
## Target Audience
[Who we're reaching]

## Campaign Goals
[What we want to achieve]

## Tone & Voice
[How we should sound]

## Key Messaging
[Core points to emphasize]

## Constraints
[What to avoid or requirements]

${conversationContext}`;

      console.log("[E-Hub Finalize] 🤖 Using Aligner assistant to synthesize Campaign Brief");

      const thread = await openai.beta.threads.create({
        messages: [{ role: "user", content: synthesisPrompt }],
      });

      const run = await openai.beta.threads.runs.create(thread.id, {
        assistant_id: alignerAssistant.assistantId,
      });

      let runStatus = await openai.beta.threads.runs.retrieve(run.id, { thread_id: thread.id });
      let pollCount = 0;
      const maxPolls = 48;
      const pollInterval = 2500;

      while (runStatus.status === "queued" || runStatus.status === "in_progress") {
        pollCount++;

        if (pollCount >= maxPolls) {
          throw new Error("Finalize strategy timeout - Aligner did not respond within 2 minutes");
        }

        await new Promise((resolve) => setTimeout(resolve, pollInterval));
        runStatus = await openai.beta.threads.runs.retrieve(run.id, { thread_id: thread.id });
      }

      if (runStatus.status !== "completed") {
        throw new Error(`Aligner assistant run failed with status: ${runStatus.status}`);
      }

      const messages = await openai.beta.threads.messages.list(thread.id);
      const assistantMessage = messages.data.find((msg) => msg.role === "assistant");

      if (!assistantMessage) {
        throw new Error("No response from Aligner assistant");
      }

      const finalizedBrief = assistantMessage.content
        .filter((c: any) => c.type === "text")
        .map((c: any) => c.text.value)
        .join("")
        .trim();

      if (!finalizedBrief) {
        throw new Error("Failed to generate finalized strategy");
      }

      console.log("[E-Hub Finalize] ✅ Campaign Brief synthesized:", `${finalizedBrief.substring(0, 100)}...`);
      res.json({ finalizedStrategy: finalizedBrief });
    } catch (error: any) {
      console.error("Error finalizing strategy:", error);
      res.status(500).json({ message: error.message || "Failed to finalize strategy" });
    }
  });

  app.patch("/api/sequences/:id/finalized-strategy", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;

      const { finalizedStrategy } = z.object({
        finalizedStrategy: z.string().min(1, "Finalized strategy cannot be empty"),
      }).parse(req.body);

      const sequence = await storage.getSequence(id, req.user.tenantId);
      if (!sequence) {
        return res.status(404).json({ message: "Sequence not found" });
      }

      const updated = await storage.updateSequence(id, req.user.tenantId, { finalizedStrategy });
      res.json({ sequence: updated });
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid finalized strategy", errors: error.errors });
      }
      console.error("Error saving finalized strategy:", error);
      res.status(500).json({ message: error.message || "Failed to save finalized strategy" });
    }
  });
}

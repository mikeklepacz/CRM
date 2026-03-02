import OpenAI from "openai";

const ALIGNER_CONTEXTUAL_INSTRUCTIONS = `## YOUR ROLE & WORKFLOW:
You are the Aligner assistant helping improve the ElevenLabs AI agent knowledge base through collaborative discussion.

**When the user pastes a call transcript or describes an issue:**

1. **ANALYZE** the transcript carefully:
   - What objections did the prospect raise?
   - What language/phrasing worked well or poorly?
   - What information confused the prospect?
   - What led to successful or unsuccessful outcomes?

2. **DISCUSS** your findings with the user:
   - Point out specific problems you identified
   - Quote examples from the transcript
   - Reference which KB files are relevant
   - Explain what should change and why
   - Ask if the user agrees with your assessment

3. **PROPOSE IMPROVEMENTS** only after the user explicitly agrees:
   - When user says "yes, create the proposal" or "go ahead and propose those changes"
   - Respond with a JSON object containing targeted edits
   - Use this exact format:

\`\`\`json
{
  "edits": [
    {
      "file": "exact-filename.txt",
      "section": "Section name for context",
      "old": "Exact original text to replace",
      "new": "Improved replacement text",
      "reason": "Why this specific change improves conversations",
      "principle": "Underlying principle (clarity, rhythm, trust, etc.)",
      "evidence": "Direct quote from transcript showing the issue"
    }
  ]
}
\`\`\`

**IMPORTANT RULES:**
- Use the file_search tool to access all KB files - they're already uploaded to OpenAI
- DO NOT hallucinate or invent filenames - search the KB to confirm files exist
- DO NOT output JSON proposals until the user explicitly asks for them
- Focus on DISCUSSION and COLLABORATION first
- Be specific - cite exact quotes and explain your reasoning
- Keep the brand voice intact - only fix what's broken

**CURRENT CONVERSATION:**
`;

export function createAlignerChatHandler(storage: any) {
  return async (req: any, res: any) => {
    try {
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const { message, conversationId } = req.body;
      if (!message) return res.status(400).json({ error: "Message required" });

      const tenantId = (req.user as any).tenantId;
      let activeConversationId = conversationId;
      if (!activeConversationId) {
        const newConversation = await storage.createConversation({
          userId,
          tenantId,
          title: message.substring(0, 50) + (message.length > 50 ? "..." : ""),
          assistantType: "aligner",
          contextData: {},
          projectId: null,
        });
        activeConversationId = newConversation.id;
      }

      const settings = await storage.getOpenaiSettings(req.user.tenantId);
      if (!settings?.apiKey) return res.status(400).json({ error: "OpenAI API key not configured" });

      const alignerAssistant = await storage.getAssistantBySlug("aligner", tenantId);
      if (!alignerAssistant || !alignerAssistant.assistantId) {
        return res.status(400).json({ error: "Aligner assistant not configured" });
      }

      const openai = new OpenAI({ apiKey: settings.apiKey });
      const conversation = await storage.getConversation(activeConversationId, tenantId);
      let threadId = conversation?.threadId;

      if (!threadId) {
        const thread = await openai.beta.threads.create();
        threadId = thread.id;
        await storage.updateConversation(activeConversationId, tenantId, { threadId });
      }

      await storage.saveChatMessage({
        userId,
        tenantId,
        conversationId: activeConversationId,
        role: "user",
        content: message,
        responseId: null,
        metadata: {},
      });

      await openai.beta.threads.messages.create(threadId, {
        role: "user",
        content: `${ALIGNER_CONTEXTUAL_INSTRUCTIONS}\n\nUser: ${message}`,
      });

      const run = await openai.beta.threads.runs.create(threadId, {
        assistant_id: alignerAssistant.assistantId,
      });

      let runStatus = await openai.beta.threads.runs.retrieve(run.id, { thread_id: threadId });
      let attempts = 0;
      const maxAttempts = 600;

      while (runStatus.status === "queued" || runStatus.status === "in_progress") {
        if (attempts >= maxAttempts) throw new Error("Aligner analysis timeout - transcript too complex");
        await new Promise((resolve) => setTimeout(resolve, 500));
        runStatus = await openai.beta.threads.runs.retrieve(run.id, { thread_id: threadId });
        attempts++;
      }

      if (runStatus.status !== "completed") {
        throw new Error(`Aligner run failed: ${runStatus.status}`);
      }

      const messages = await openai.beta.threads.messages.list(threadId);
      const assistantMessage = messages.data.find((m: any) => m.role === "assistant");
      if (!assistantMessage || !assistantMessage.content[0] || assistantMessage.content[0].type !== "text") {
        throw new Error("No response from Aligner assistant");
      }

      const responseText = assistantMessage.content[0].text.value;
      await storage.saveChatMessage({
        userId,
        tenantId,
        conversationId: activeConversationId,
        role: "assistant",
        content: responseText,
        responseId: run.id,
        metadata: { model: "gpt-4o", threadId },
      });

      return res.json({ message: responseText, conversationId: activeConversationId });
    } catch (error: any) {
      console.error("[Aligner Chat] Error:", error);
      return res.status(500).json({ error: error.message || "Failed to get Aligner response" });
    }
  };
}

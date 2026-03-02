import OpenAI from "openai";

type Deps = {
  findKbFileByFuzzyFilename: (filename: string, allFiles?: any[]) => Promise<any>;
  storage: any;
};

function extractEditsJson(responseText: string): any[] {
  const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/) || responseText.match(/```\s*(\{[\s\S]*?\})\s*```/);
  if (!jsonMatch) throw new Error("NO_JSON_FOUND");

  const parsed = JSON.parse(jsonMatch[1]);
  if (!parsed.edits || !Array.isArray(parsed.edits) || parsed.edits.length === 0) {
    throw new Error("INVALID_EDIT_ARRAY");
  }

  const validEdit = parsed.edits.every(
    (edit: any) => edit.file && edit.reason && (edit.old !== undefined || edit.new !== undefined)
  );
  if (!validEdit) throw new Error("INVALID_EDIT_SCHEMA");

  return parsed.edits;
}

async function createProposalsFromEdits(params: {
  edits: any[];
  findKbFileByFuzzyFilename: (filename: string, allFiles?: any[]) => Promise<any>;
  includeOriginalAiContent: boolean;
  storage: any;
  tenantId: string;
}): Promise<any[]> {
  const { edits, findKbFileByFuzzyFilename, includeOriginalAiContent, storage, tenantId } = params;

  const allKbFiles = await storage.getAllKbFiles(tenantId);
  const editsByFile = new Map<string, any[]>();
  for (const edit of edits) {
    if (!editsByFile.has(edit.file)) editsByFile.set(edit.file, []);
    editsByFile.get(edit.file)!.push(edit);
  }

  const createdProposals = [];
  for (const [filename, fileEdits] of editsByFile) {
    const file = await findKbFileByFuzzyFilename(filename, allKbFiles);
    if (!file) continue;

    const versions = await storage.getKbFileVersions(file.id, tenantId);
    const latestVersion = versions[0];
    if (!latestVersion) continue;

    const rationale = fileEdits
      .map(
        (edit, idx) => `${idx + 1}. ${edit.section ? `${edit.section}: ` : ""}${edit.reason} (Evidence: ${edit.evidence})`
      )
      .join("\n\n");

    const payload: any = {
      kbFileId: file.id,
      baseVersionId: latestVersion.id,
      proposedContent: JSON.stringify(fileEdits),
      rationale,
      aiInsightId: null,
      status: "pending",
    };

    if (includeOriginalAiContent) {
      payload.originalAiContent = JSON.stringify(fileEdits);
      payload.humanEdited = false;
    }

    const created = await storage.createKbProposal(payload);
    createdProposals.push(created);
  }

  return createdProposals;
}

export function createAgreeAndCreateProposalsHandler(deps: Deps) {
  return async (req: any, res: any) => {
    try {
      const { conversationId } = req.body;
      const userId = req.user.id;
      const tenantId = (req.user as any).tenantId;
      if (!conversationId) return res.status(400).json({ error: "conversationId required" });

      const conversation = await deps.storage.getConversation(conversationId, tenantId);
      if (!conversation) return res.status(404).json({ error: "Conversation not found" });

      let threadId = conversation.threadId;
      const settings = await deps.storage.getOpenaiSettings(req.user.tenantId);
      if (!settings?.apiKey) return res.status(400).json({ error: "OpenAI API key not configured" });

      const alignerAssistant = await deps.storage.getAssistantBySlug("aligner", tenantId);
      if (!alignerAssistant || !alignerAssistant.assistantId) {
        return res.status(500).json({ error: "Aligner assistant not configured" });
      }

      const openai = new OpenAI({ apiKey: settings.apiKey });
      const allKbFiles = await deps.storage.getAllKbFiles(tenantId);
      const kbFilesList = allKbFiles.map((f: any) => `- ${f.filename}${f.agentId ? ` (Agent: ${f.agentId})` : ""}`).join("\n");

      const contextualInstructions = `You are the Aligner, an AI assistant that helps improve knowledge base files based on call analysis.

**AVAILABLE KB FILES:**
\`\`\`
${kbFilesList}
\`\`\`

The user has agreed to create proposals. Please output your recommended changes in this EXACT JSON format:

\`\`\`json
{
  "edits": [
    {
      "file": "exact-filename.txt",
      "section": "Section name or description",
      "old": "text to replace",
      "new": "replacement text",
      "reason": "why this change improves the script",
      "principle": "which principle this addresses",
      "evidence": "quote from call that supports this"
    }
  ]
}
\`\`\`

**IMPORTANT:**
- ONLY reference files from the KB file list above
- Each edit must have: file, reason, and either old/new text
- Output ONLY the JSON, no additional commentary`;

      if (!threadId) {
        const thread = await openai.beta.threads.create();
        threadId = thread.id;
        await deps.storage.updateConversation(conversationId, tenantId, { threadId });
      }

      const confirmMessage = "Yes, I agree. Please create the proposal.";
      await deps.storage.saveChatMessage({
        userId,
        tenantId,
        conversationId,
        role: "user",
        content: confirmMessage,
        responseId: null,
        metadata: {},
      });

      await openai.beta.threads.messages.create(threadId, {
        role: "user",
        content: `${contextualInstructions}\n\nUser: ${confirmMessage}`,
      });

      const run = await openai.beta.threads.runs.create(threadId, { assistant_id: alignerAssistant.assistantId });

      let runStatus = await openai.beta.threads.runs.retrieve(run.id, { thread_id: threadId });
      let attempts = 0;
      while (runStatus.status === "queued" || runStatus.status === "in_progress") {
        if (attempts >= 60) throw new Error("Aligner response timeout");
        await new Promise((resolve) => setTimeout(resolve, 500));
        runStatus = await openai.beta.threads.runs.retrieve(run.id, { thread_id: threadId });
        attempts++;
      }
      if (runStatus.status !== "completed") throw new Error(`Aligner run failed: ${runStatus.status}`);

      const threadMessages = await openai.beta.threads.messages.list(threadId);
      const assistantMessage = threadMessages.data.find((m: any) => m.role === "assistant");
      if (!assistantMessage || !assistantMessage.content[0] || assistantMessage.content[0].type !== "text") {
        throw new Error("No response from Aligner assistant");
      }

      const responseText = assistantMessage.content[0].text.value;
      await deps.storage.saveChatMessage({
        userId,
        tenantId,
        conversationId,
        role: "assistant",
        content: responseText,
        responseId: run.id,
        metadata: { model: "gpt-4o", threadId },
      });

      let edits: any[];
      try {
        edits = extractEditsJson(responseText);
      } catch (error: any) {
        if (error.message === "NO_JSON_FOUND") {
          return res.status(400).json({ error: "Aligner did not provide JSON proposals. Please try discussing the changes first." });
        }
        if (error.message === "INVALID_EDIT_ARRAY") {
          return res.status(400).json({ error: 'Invalid proposal format - expected "edits" array' });
        }
        if (error.message === "INVALID_EDIT_SCHEMA") {
          return res.status(400).json({ error: "Invalid proposal schema - edits must have file, reason, and old/new fields" });
        }
        throw error;
      }

      const createdProposals = await createProposalsFromEdits({
        edits,
        findKbFileByFuzzyFilename: deps.findKbFileByFuzzyFilename,
        includeOriginalAiContent: false,
        storage: deps.storage,
        tenantId,
      });

      return res.json({
        success: true,
        proposalsCreated: createdProposals.length,
        message: `Created ${createdProposals.length} proposal(s) ready for review`,
      });
    } catch (error: any) {
      console.error("[Aligner Agree] Error:", error);
      return res.status(500).json({ error: error.message || "Failed to create proposals" });
    }
  };
}

export function createCreateProposalsFromChatHandler(deps: Deps) {
  return async (req: any, res: any) => {
    try {
      const { conversationId } = req.body;
      const tenantId = (req.user as any).tenantId;
      if (!conversationId) return res.status(400).json({ error: "conversationId required" });

      const messages = await deps.storage.getConversationMessages(conversationId, tenantId);
      if (!messages || messages.length === 0) {
        return res.status(404).json({ error: "No messages found in this conversation" });
      }

      const latestAssistantMessage = messages
        .filter((m: any) => m.role === "assistant")
        .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

      if (!latestAssistantMessage) {
        return res.status(404).json({ error: "No assistant messages found in this conversation" });
      }

      let edits: any[];
      try {
        edits = extractEditsJson(latestAssistantMessage.content);
      } catch (error: any) {
        if (error.message === "NO_JSON_FOUND") {
          return res.status(400).json({ error: "No JSON proposals found in the latest assistant message. Ask the Aligner to create specific proposals first." });
        }
        if (error.message === "INVALID_EDIT_ARRAY") {
          return res.status(400).json({ error: 'Invalid proposal format - expected "edits" array with at least one edit' });
        }
        if (error.message === "INVALID_EDIT_SCHEMA") {
          return res.status(400).json({ error: "Invalid proposal schema - edits must have file, reason, and old/new fields" });
        }
        throw error;
      }

      const proposalsCreated = await createProposalsFromEdits({
        edits,
        findKbFileByFuzzyFilename: deps.findKbFileByFuzzyFilename,
        includeOriginalAiContent: true,
        storage: deps.storage,
        tenantId,
      });

      return res.json({
        success: true,
        proposalsCreated: proposalsCreated.length,
        proposals: proposalsCreated,
      });
    } catch (error: any) {
      console.error("[Aligner Create Proposals] Error:", error);
      return res.status(500).json({ error: error.message || "Failed to create proposals from chat" });
    }
  };
}

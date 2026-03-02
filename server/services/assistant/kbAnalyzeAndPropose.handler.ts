import { buildKbAnalyzeFinalPrompt, buildKbAnalyzeInitialPrompt } from "./kbAnalyzePrompts";

type Deps = {
  addCallsToThreadInMicroBatches: (
    openai: any,
    threadId: string,
    calls: any[],
    callsPerBatch?: number
  ) => Promise<void>;
  findKbFileByFuzzyFilename: (filename: string, allFiles?: any[]) => Promise<any>;
  storage: any;
};

function parseJsonResponse(text: string): any {
  const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/```\s*([\s\S]*?)\s*```/);
  const jsonText = jsonMatch ? jsonMatch[1] : text;
  return JSON.parse(jsonText);
}

function redactCalls(callsData: any[]): any[] {
  return callsData.map((call) => ({
    ...call,
    transcripts: call.transcripts.map((t: any) => ({
      ...t,
      message: t.message.replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, "XXX-XXX-XXXX"),
    })),
  }));
}

async function createProposalsFromEdits(params: {
  allKbFiles: any[];
  edits: any[];
  findKbFileByFuzzyFilename: (filename: string, allFiles?: any[]) => Promise<any>;
  insight: any;
  storage: any;
  tenantId: string;
}): Promise<any[]> {
  const { allKbFiles, edits, findKbFileByFuzzyFilename, insight, storage, tenantId } = params;

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
        (edit: any, idx: number) =>
          `${idx + 1}. ${edit.section ? `${edit.section}: ` : ""}${edit.reason} (Evidence: ${edit.evidence})`
      )
      .join("\n\n");

    const created = await storage.createKbProposal({
      tenantId,
      kbFileId: file.id,
      baseVersionId: latestVersion.id,
      proposedContent: JSON.stringify(fileEdits),
      rationale,
      aiInsightId: insight?.id || null,
      status: "pending",
    });

    createdProposals.push(created);
  }

  return createdProposals;
}

export function createKbAnalyzeAndProposeHandler(deps: Deps) {
  return async (req: any, res: any) => {
    try {
      const { agentId, insightId, startDate, endDate, conversationIds } = req.body;
      if (!agentId) {
        return res.status(400).json({ error: "agentId is required. Please select an AI agent to analyze." });
      }

      const isAllAgents = agentId === "all";
      const isChainedFromWickCoach = conversationIds && conversationIds.length > 0;
      const tenantId = (req.user as any).tenantId;

      const alignerAssistant = await deps.storage.getAssistantBySlug("aligner", tenantId);
      if (!alignerAssistant || !alignerAssistant.assistantId) {
        return res.status(400).json({ error: "Aligner assistant not configured. Please set up the Aligner assistant first." });
      }

      let insight = null;
      if (insightId) {
        insight = await deps.storage.getAiInsightById(insightId);
      } else if (!isAllAgents) {
        const insights = await deps.storage.getAiInsightsHistory({ agentId, limit: 1 });
        if (insights.length > 0) insight = insights[0];
      }

      const allKbFiles = await deps.storage.getAllKbFiles(tenantId);
      const kbFiles = isAllAgents
        ? allKbFiles.filter((file: any) => file.agentId == null)
        : allKbFiles.filter((file: any) => file.agentId === agentId || file.agentId == null);

      if (kbFiles.length === 0) {
        return res.status(404).json({
          error: isAllAgents
            ? "No general KB files found. Please upload general files that apply to all agents."
            : "No KB files found for this agent. Please assign KB files to this agent or upload general files.",
        });
      }

      const callsData = isChainedFromWickCoach
        ? await deps.storage.getCallsWithTranscripts({
            agentId: isAllAgents ? undefined : agentId,
            conversationIds,
            limit: 1000,
          })
        : await deps.storage.getCallsWithTranscripts({
            agentId: isAllAgents ? undefined : agentId,
            startDate: startDate || insight?.dateRangeStart,
            endDate: endDate || insight?.dateRangeEnd,
            onlyUnanalyzed: true,
            limit: 1000,
          });

      if (callsData.length === 0) {
        return res.status(404).json({
          error: isChainedFromWickCoach
            ? "No calls found with the provided conversation IDs."
            : isAllAgents
            ? "No unanalyzed calls found across all agents in the specified date range."
            : "No unanalyzed calls found for this agent in the specified date range.",
        });
      }

      const redactedCalls = redactCalls(callsData);
      const openaiSettings = await deps.storage.getOpenaiSettings(req.user.tenantId);
      if (!openaiSettings?.apiKey) {
        return res.status(500).json({
          error: "OpenAI API key not configured. Please configure your OpenAI API key in the settings first.",
        });
      }

      const OpenAI = (await import("openai")).default;
      const openai = new OpenAI({ apiKey: openaiSettings.apiKey });
      const thread = await openai.beta.threads.create();

      const initialPrompt = buildKbAnalyzeInitialPrompt({
        insight,
        isAllAgents,
        kbFiles,
        redactedCallsLength: redactedCalls.length,
      });

      await openai.beta.threads.messages.create(thread.id, { role: "user", content: initialPrompt });
      await deps.addCallsToThreadInMicroBatches(openai, thread.id, redactedCalls, 2);

      const finalPrompt = buildKbAnalyzeFinalPrompt({
        insight,
        isAllAgents,
        kbFiles,
        redactedCallsLength: redactedCalls.length,
      });

      await openai.beta.threads.messages.create(thread.id, { role: "user", content: finalPrompt });

      const run = await openai.beta.threads.runs.create(thread.id, {
        assistant_id: alignerAssistant.assistantId,
        response_format: { type: "json_object" },
      });

      let runStatus = await openai.beta.threads.runs.retrieve(run.id, { thread_id: thread.id });
      let attempts = 0;
      while (runStatus.status !== "completed" && runStatus.status !== "failed" && attempts < 120) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        runStatus = await openai.beta.threads.runs.retrieve(run.id, { thread_id: thread.id });
        attempts++;
      }

      if (runStatus.status !== "completed") {
        return res.status(500).json({ error: `Analysis failed: ${runStatus.status}` });
      }

      const messages = await openai.beta.threads.messages.list(thread.id);
      const assistantMessage = messages.data.find((m: any) => m.role === "assistant");
      if (!assistantMessage || !assistantMessage.content[0] || assistantMessage.content[0].type !== "text") {
        return res.status(500).json({ error: "No response from Aligner assistant" });
      }

      const parsedResponse = parseJsonResponse(assistantMessage.content[0].text.value);
      if (!parsedResponse.edits || !Array.isArray(parsedResponse.edits)) {
        return res.status(500).json({ error: 'Invalid response format from Aligner assistant - expected "edits" array' });
      }

      const createdProposals = await createProposalsFromEdits({
        allKbFiles,
        edits: parsedResponse.edits,
        findKbFileByFuzzyFilename: deps.findKbFileByFuzzyFilename,
        insight,
        storage: deps.storage,
        tenantId,
      });

      if (!isChainedFromWickCoach) {
        const conversationIdsToMark = redactedCalls
          .map((call: any) => call.session.conversationId)
          .filter(Boolean) as string[];
        await deps.storage.markCallsAsAnalyzed(conversationIdsToMark);
      }

      return res.json({
        success: true,
        proposalsCreated: createdProposals.length,
        proposalCount: createdProposals.length,
        proposals: createdProposals,
        kbFileCount: kbFiles.length,
        insightId: insight?.id || null,
        agentId,
        callsAnalyzed: redactedCalls.length,
        message: `Analyzed ${redactedCalls.length} calls using micro-batching for deep analysis`,
      });
    } catch (error: any) {
      console.error("[KB Analyze] Error:", error);
      return res.status(500).json({ error: error.message || "Failed to analyze and generate proposals" });
    }
  };
}

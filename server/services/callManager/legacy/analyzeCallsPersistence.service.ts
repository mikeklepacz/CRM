import axios from "axios";

type SaveAndAlignParams = {
  agentId: string | undefined;
  callsData: any[];
  endDate: string | undefined;
  enrichedObjections: any[];
  enrichedPatterns: any[];
  insights: any;
  req: any;
  startDate: string | undefined;
  storage: any;
};

export async function saveInsightsAndTriggerAligner(params: SaveAndAlignParams): Promise<{
  success: boolean;
  error: string | null;
  proposalCount: number;
  kbFileCount: number;
}> {
  const { agentId, callsData, endDate, enrichedObjections, enrichedPatterns, insights, req, startDate, storage } = params;

  const alignerStatus = { success: false, error: null as string | null, proposalCount: 0, kbFileCount: 0 };

  try {
    const insightRecord = {
      tenantId: req.user.tenantId,
      dateRangeStart: startDate ? new Date(startDate) : null,
      dateRangeEnd: endDate ? new Date(endDate) : null,
      agentId: agentId || null,
      callCount: callsData.length,
      sentimentPositive: insights.sentimentAnalysis?.positive || 0,
      sentimentNeutral: insights.sentimentAnalysis?.neutral || 0,
      sentimentNegative: insights.sentimentAnalysis?.negative || 0,
      sentimentTrendsText: insights.sentimentAnalysis?.trends || "",
    };

    const objectionsRecords = enrichedObjections.map((obj: any) => ({
      objection: obj.objection,
      frequency: obj.frequency,
      exampleConversations: obj.exampleConversations || [],
    }));

    const patternsRecords = enrichedPatterns.map((pat: any) => ({
      pattern: pat.pattern,
      frequency: pat.frequency,
      exampleConversations: pat.exampleConversations || [],
    }));

    const recommendationsRecords = (insights.coachingRecommendations || []).map((rec: any) => ({
      title: rec.title,
      description: rec.description,
      priority: rec.priority,
    }));

    const savedInsight = await storage.saveAiInsight(
      insightRecord,
      objectionsRecords,
      patternsRecords,
      recommendationsRecords
    );

    const conversationIds = callsData.map((call) => call.session.conversationId).filter(Boolean) as string[];
    await storage.markCallsAsAnalyzed(conversationIds);
    console.log(`[Wick Coach] Marked ${conversationIds.length} calls as analyzed`);

    console.log("[AI Insights -> Aligner] Wick Coach analysis complete, now chaining to Aligner...");

    try {
      const alignerAssistant = await storage.getAssistantBySlug("aligner", req.user.tenantId);
      if (!alignerAssistant || !alignerAssistant.assistantId) {
        console.log("[AI Insights -> Aligner] Aligner assistant not configured, skipping KB analysis");
        alignerStatus.error = "Aligner assistant not configured";
        return alignerStatus;
      }

      const normalizedAgentId = agentId || "all";
      const agentLabel = normalizedAgentId === "all" ? "all agents" : `agent ${normalizedAgentId}`;
      console.log(
        `[AI Insights -> Aligner] Triggering KB analysis for ${agentLabel} with insight ${savedInsight.id}`
      );

      const alignerResponse = await axios.post(
        `http://localhost:${process.env.PORT || 5000}/api/kb/analyze-and-propose`,
        {
          agentId: normalizedAgentId,
          insightId: savedInsight.id,
          conversationIds,
          startDate,
          endDate,
        },
        {
          headers: {
            cookie: req.headers.cookie || "",
          },
        }
      );

      console.log("[AI Insights -> Aligner] KB analysis completed successfully");
      alignerStatus.success = true;
      alignerStatus.proposalCount = alignerResponse.data?.proposalCount || 0;
      alignerStatus.kbFileCount = alignerResponse.data?.kbFileCount || 0;
      return alignerStatus;
    } catch (alignerError: any) {
      console.error("[AI Insights -> Aligner] Error during chained KB analysis:", alignerError.message);
      alignerStatus.error = alignerError.response?.data?.error || alignerError.message || "Aligner failed";
      return alignerStatus;
    }
  } catch (dbError) {
    console.error("[AI Insights] Failed to save insights to database:", dbError);
    return alignerStatus;
  }
}

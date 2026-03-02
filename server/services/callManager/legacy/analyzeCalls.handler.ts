import { runWickCoachAnalysis } from "./analyzeCallsWorkflow.service";
import { saveInsightsAndTriggerAligner } from "./analyzeCallsPersistence.service";

type Deps = {
  addCallsToThreadInMicroBatches: (
    openai: any,
    threadId: string,
    calls: any[],
    callsPerBatch?: number
  ) => Promise<void>;
  storage: any;
};

export function createAnalyzeCallsHandler(deps: Deps) {
  const { addCallsToThreadInMicroBatches, storage } = deps;

  return async (req: any, res: any) => {
    try {
      const { startDate, endDate, agentId, limit } = req.body;
      const callLimit = limit || 50;

      const openaiSettings = await storage.getOpenaiSettings(req.user.tenantId);
      if (!openaiSettings?.apiKey) {
        return res.status(400).json({
          error: "OpenAI API key not configured",
          message: "Please configure your OpenAI API key in the settings first",
        });
      }

      const wickCoachAssistant = await storage.getAssistantBySlug("wick-coach", req.user.tenantId);
      if (!wickCoachAssistant || !wickCoachAssistant.assistantId) {
        return res.status(400).json({
          error: "Wick Coach assistant not configured. Please set up the Wick Coach assistant first.",
        });
      }

      const callsData = await storage.getCallsWithTranscripts({ startDate, endDate, agentId, limit: callLimit });
      if (callsData.length === 0) {
        return res.json({
          message: "No calls found for the selected filters",
          callCount: 0,
          commonObjections: [],
          successPatterns: [],
          sentimentAnalysis: { positive: 0, neutral: 0, negative: 0, trends: "" },
          coachingRecommendations: [],
        });
      }

      const { insights, enrichedObjections, enrichedPatterns } = await runWickCoachAnalysis({
        addCallsToThreadInMicroBatches,
        callsData,
        openaiApiKey: openaiSettings.apiKey,
        wickCoachAssistantId: wickCoachAssistant.assistantId,
      });

      const alignerStatus = await saveInsightsAndTriggerAligner({
        agentId,
        callsData,
        endDate,
        enrichedObjections,
        enrichedPatterns,
        insights,
        req,
        startDate,
        storage,
      });

      res.json({
        ...insights,
        commonObjections: enrichedObjections,
        successPatterns: enrichedPatterns,
        callCount: callsData.length,
        dateRange: {
          start: startDate || "all time",
          end: endDate || "present",
        },
        alignerStatus,
      });
    } catch (error: any) {
      console.error("[AI Insights] Error analyzing calls:", error);
      if (error.response?.status === 401) {
        return res.status(401).json({ error: "Invalid OpenAI API key" });
      }

      res.status(500).json({
        error: error.message || "Failed to analyze calls",
        details: error.response?.data,
      });
    }
  };
}

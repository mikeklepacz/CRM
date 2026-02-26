import type { Express } from "express";
import { storage } from "../../storage";

function toCamelCase(obj: any) {
  if (!obj) return obj;
  return {
    conversationId: obj.conversationId || obj.conversation_id,
    duration: obj.duration,
    storeName: obj.storeName || obj.store_name,
    city: obj.city,
    state: obj.state,
    phoneNumber: obj.phoneNumber || obj.phone_number,
  };
}

export function registerCallManagerInsightsAdminRoutes(
  app: Express,
  deps: { isAdmin: any; isAuthenticatedCustom: any }
): void {
  app.get("/api/analysis/job-status", deps.isAuthenticatedCustom, async (_req: any, res) => {
    try {
      const runningJob = await storage.getRunningAnalysisJob();
      if (!runningJob) {
        return res.json({ status: "idle", job: null });
      }

      res.json({
        status: "running",
        job: {
          id: runningJob.id,
          type: runningJob.type,
          agentId: runningJob.agentId,
          currentCallIndex: runningJob.currentCallIndex,
          totalCalls: runningJob.totalCalls,
          proposalsCreated: runningJob.proposalsCreated,
          startedAt: runningJob.startedAt,
        },
      });
    } catch (error: any) {
      console.error("[Job Status] Error fetching job status:", error);
      res.status(500).json({ error: error.message || "Failed to fetch job status" });
    }
  });

  app.get("/api/elevenlabs/insights-history", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const { agentId, startDate, endDate, limit } = req.query;

      const filters: any = {};
      if (agentId) filters.agentId = agentId;
      if (startDate) filters.startDate = new Date(startDate);
      if (endDate) filters.endDate = new Date(endDate);
      if (limit) filters.limit = parseInt(limit);

      const history = await storage.getAiInsightsHistory(filters);
      const transformedHistory = history.map((insight: any) => ({
        ...insight,
        commonObjections:
          insight.objections?.map((obj: any) => ({
            ...obj,
            exampleConversations: obj.exampleConversations?.map(toCamelCase) || [],
          })) || [],
        successPatterns:
          insight.patterns?.map((pat: any) => ({
            ...pat,
            exampleConversations: pat.exampleConversations?.map(toCamelCase) || [],
          })) || [],
        analyzedAt: insight.createdAt || insight.analyzedAt,
      }));

      res.json({ history: transformedHistory });
    } catch (error: any) {
      console.error("[AI Insights] Error retrieving insights history:", error);
      res.status(500).json({
        error: error.message || "Failed to retrieve insights history",
      });
    }
  });

  app.post("/api/elevenlabs/nuke-analysis", deps.isAuthenticatedCustom, deps.isAdmin, async (_req: any, res) => {
    try {
      console.log("[NUKE] Clearing all analysis data...");
      const result = await storage.nukeAllAnalysis();
      console.log("[NUKE] Analysis data cleared successfully:", result);

      res.json({
        success: true,
        message: "All analysis data has been cleared",
        ...result,
      });
    } catch (error: any) {
      console.error("[NUKE] Error clearing analysis data:", error);
      res.status(500).json({
        error: error.message || "Failed to clear analysis data",
      });
    }
  });

  app.post("/api/elevenlabs/nuke-call-data", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      console.log("[NUKE CALL DATA] Clearing all call test data...");

      const tenantId = req.user.tenantId;
      const config = await storage.getElevenLabsConfig(tenantId);

      let elevenLabsDeletedCount = 0;
      const elevenLabsErrors: string[] = [];

      if (config?.apiKey) {
        const callHistory = await storage.getAllCallHistory(tenantId);
        const conversationIds = [...new Set(callHistory.map((c: any) => c.conversationId).filter(Boolean))];

        console.log(`[NUKE CALL DATA] Found ${conversationIds.length} conversations to delete from ElevenLabs`);

        for (const conversationId of conversationIds) {
          try {
            const response = await fetch(`https://api.elevenlabs.io/v1/convai/conversations/${conversationId}`, {
              method: "DELETE",
              headers: { "xi-api-key": config.apiKey },
            });

            if (response.ok || response.status === 404) {
              elevenLabsDeletedCount++;
            } else {
              const errorText = await response.text();
              console.error(`[NUKE CALL DATA] Failed to delete conversation ${conversationId}:`, errorText);
              elevenLabsErrors.push(conversationId);
            }
          } catch (error: any) {
            console.error(`[NUKE CALL DATA] Error deleting conversation ${conversationId}:`, error.message);
            elevenLabsErrors.push(conversationId);
          }
        }
      }

      const result = await storage.nukeAllCallData();
      console.log("[NUKE CALL DATA] Call data cleared successfully:", {
        ...result,
        elevenLabsDeletedCount,
        elevenLabsErrors: elevenLabsErrors.length,
      });

      res.json({
        success: true,
        message: `Deleted ${result.sessionsDeleted} sessions, ${result.historyDeleted} history records, ${result.transcriptsDeleted} transcripts, ${result.eventsDeleted} events, ${result.targetsDeleted} campaign targets. Also removed ${elevenLabsDeletedCount} conversations from ElevenLabs.`,
        ...result,
        elevenLabsDeletedCount,
        elevenLabsErrors: elevenLabsErrors.length > 0 ? elevenLabsErrors : undefined,
      });
    } catch (error: any) {
      console.error("[NUKE CALL DATA] Error clearing call data:", error);
      res.status(500).json({
        error: error.message || "Failed to clear call data",
      });
    }
  });
}

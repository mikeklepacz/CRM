import type { Express } from "express";
import { storage } from "../../storage";
import { toCamelCase } from "./callInsightsAdmin.helpers";
import type { CallInsightsAdminDeps } from "./callInsightsAdmin.types";

export function registerInsightsHistoryRoute(app: Express, deps: CallInsightsAdminDeps): void {
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
}

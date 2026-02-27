import type { Express } from "express";
import { storage } from "../../storage";
import type { CallInsightsAdminDeps } from "./callInsightsAdmin.types";

export function registerNukeAnalysisRoute(app: Express, deps: CallInsightsAdminDeps): void {
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
}

import type { Express } from "express";
import { analyzeTranscript } from "../../services/aiTranscriptAnalysis";
import type { CallOperationsDeps } from "./callOperations.types";

export function registerCallAnalyzeRoute(app: Express, deps: CallOperationsDeps): void {
  app.post("/api/calls/:id/analyze", deps.isAuthenticatedCustom, async (req: any, res) => {
    try {
      const tenantId = req.user.tenantId;
      if (!tenantId) {
        return res.status(400).json({ message: "Tenant ID not found" });
      }

      const callSessionId = req.params.id;
      const result = await analyzeTranscript(callSessionId, tenantId);

      if (!result.success) {
        return res.status(400).json({ message: result.error || "Analysis failed" });
      }

      return res.json(result);
    } catch (error: any) {
      console.error("[API] Call analysis error:", error);
      return res.status(500).json({ message: error.message || "Internal server error" });
    }
  });
}

import type { Express } from "express";
import { storage } from "../../storage";
import type { AlignerCoreDeps } from "./alignerCore.types";

export function registerAlignerTaskPromptPatchRoute(app: Express, deps: AlignerCoreDeps): void {
  app.patch("/api/aligner/task-prompt", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const { taskPromptTemplate } = req.body;
      const tenantId = await deps.getEffectiveTenantId(req);
      const assistant = await storage.getAssistantBySlug("aligner", tenantId);

      if (!assistant) {
        return res.status(404).json({ error: "Aligner assistant not found for this organization" });
      }

      const updated = await storage.updateAssistant(assistant.id, { taskPromptTemplate });
      console.log("[Aligner] Task prompt template updated successfully");
      res.json({ assistant: updated });
    } catch (error: any) {
      console.error("[Aligner] Error updating task prompt template:", error);
      res.status(500).json({ error: error.message || "Failed to update task prompt template" });
    }
  });
}

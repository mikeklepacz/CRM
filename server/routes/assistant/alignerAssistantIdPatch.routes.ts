import type { Express } from "express";
import { storage } from "../../storage";
import type { AlignerCoreDeps } from "./alignerCore.types";

export function registerAlignerAssistantIdPatchRoute(app: Express, deps: AlignerCoreDeps): void {
  app.patch("/api/aligner/assistant-id", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const { assistantId } = req.body;
      const tenantId = await deps.getEffectiveTenantId(req);
      const assistant = await storage.getAssistantBySlug("aligner", tenantId);

      if (!assistant) {
        return res.status(404).json({ error: "Aligner assistant not found for this organization" });
      }

      const updated = await storage.updateAssistant(assistant.id, { assistantId });
      console.log("[Aligner] Assistant ID updated successfully:", assistantId);
      res.json({ assistant: updated });
    } catch (error: any) {
      console.error("[Aligner] Error updating assistant ID:", error);
      res.status(500).json({ error: error.message || "Failed to update assistant ID" });
    }
  });
}

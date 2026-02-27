import type { Express } from "express";
import OpenAI from "openai";
import { storage } from "../../storage";
import type { AlignerCoreDeps } from "./alignerCore.types";

export function registerAlignerInstructionsPatchRoute(app: Express, deps: AlignerCoreDeps): void {
  app.patch("/api/aligner/instructions", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const { instructions } = req.body;
      const tenantId = await deps.getEffectiveTenantId(req);
      const assistant = await storage.getAssistantBySlug("aligner", tenantId);

      if (!assistant) {
        return res.status(404).json({ error: "Aligner assistant not found for this organization" });
      }

      if (!assistant.assistantId) {
        return res.status(400).json({ error: "Aligner assistant ID not configured. Please set the assistant ID first." });
      }

      const openaiSettings = await storage.getOpenaiSettings(tenantId);
      if (!openaiSettings?.apiKey) {
        return res.status(400).json({ error: "OpenAI API key not configured" });
      }

      console.log("[Aligner] Syncing instructions to OpenAI assistant:", assistant.assistantId);
      const openai = new OpenAI({ apiKey: openaiSettings.apiKey });
      await openai.beta.assistants.update(assistant.assistantId, { instructions });
      console.log("[Aligner] Instructions synced to OpenAI successfully");

      const updated = await storage.updateAssistant(assistant.id, { instructions });
      res.json({ assistant: updated });
    } catch (error: any) {
      console.error("[Aligner] Error updating instructions:", error);
      res.status(500).json({ error: error.message || "Failed to update instructions" });
    }
  });
}

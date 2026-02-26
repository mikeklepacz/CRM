import type { Express } from "express";
import OpenAI from "openai";
import { storage } from "../../storage";

type Deps = {
  getEffectiveTenantId: (req: any) => Promise<string>;
  isAdmin: any;
  isAuthenticatedCustom: any;
};

export function registerAlignerCoreRoutes(app: Express, deps: Deps): void {
  // Get Aligner assistant details and files
  app.get("/api/aligner", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const tenantId = await deps.getEffectiveTenantId(req);
      console.log(
        "[Aligner] GET /api/aligner - tenantId:",
        tenantId,
        "sessionOverride:",
        req.session?.tenantOverrideId,
        "userTenantId:",
        req.user?.tenantId
      );
      const assistant = await storage.getAssistantBySlug("aligner", tenantId);
      console.log("[Aligner] Found assistant:", assistant ? assistant.id : "null");

      if (!assistant) {
        return res.status(404).json({ error: "Aligner assistant not found for this organization" });
      }

      const files = await storage.getAssistantFiles(assistant.id);
      res.json({
        assistant: {
          ...assistant,
          files,
        },
      });
    } catch (error: any) {
      console.error("[Aligner] Error fetching Aligner:", error);
      res.status(500).json({ error: error.message || "Failed to fetch Aligner" });
    }
  });

  // Update Aligner instructions
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

  // Update Aligner task prompt template
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

  // Update Aligner OpenAI Assistant ID
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

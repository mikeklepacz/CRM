import type { Express } from "express";
import { storage } from "../../storage";
import type { AssistantsDeps } from "./assistants.types";

export function registerAssistantsPatchRoute(app: Express, deps: AssistantsDeps): void {
  app.patch("/api/assistants/:id", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const assistant = await storage.updateAssistant(id, updates);
      res.json({ assistant });
    } catch (error: any) {
      console.error("[Assistants] Error updating assistant:", error);
      res.status(500).json({ error: error.message || "Failed to update assistant" });
    }
  });
}

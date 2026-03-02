import type { Express } from "express";
import { storage } from "../../storage";
import type { AssistantsDeps } from "./assistants.types";

export function registerAssistantsListRoute(app: Express, deps: AssistantsDeps): void {
  app.get("/api/assistants", deps.isAuthenticatedCustom, deps.isAdmin, async (_req: any, res) => {
    try {
      const assistants = await storage.getAllAssistants();
      res.json({ assistants });
    } catch (error: any) {
      console.error("[Assistants] Error fetching assistants:", error);
      res.status(500).json({ error: error.message || "Failed to fetch assistants" });
    }
  });
}

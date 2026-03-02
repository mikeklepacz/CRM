import type { Express } from "express";
import { storage } from "../../storage";
import type { AssistantsDeps } from "./assistants.types";

export function registerAssistantsGetBySlugRoute(app: Express, deps: AssistantsDeps): void {
  app.get("/api/assistants/:slug", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const { slug } = req.params;
      const tenantId = req.user.tenantId;
      const assistant = await storage.getAssistantBySlug(slug, tenantId);

      if (!assistant) {
        return res.status(404).json({ error: "Assistant not found" });
      }

      const files = await storage.getAssistantFiles(assistant.id);
      res.json({
        assistant: {
          ...assistant,
          files,
        },
      });
    } catch (error: any) {
      console.error("[Assistants] Error fetching assistant:", error);
      res.status(500).json({ error: error.message || "Failed to fetch assistant" });
    }
  });
}

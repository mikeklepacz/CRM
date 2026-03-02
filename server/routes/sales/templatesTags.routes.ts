import type { Express } from "express";
import { storage } from "../../storage";
import { getTenantId } from "./templates.helpers";
import type { SalesTemplatesDeps } from "./templates.types";

export function registerTemplatesTagsRoute(app: Express, deps: SalesTemplatesDeps): void {
  app.get("/api/templates/tags", deps.isAuthenticatedCustom, async (req: any, res) => {
    try {
      const allTags = await storage.getAllTemplateTags(getTenantId(req));
      res.json(allTags);
    } catch (error: any) {
      console.error("Error fetching template tags:", error);
      res.status(500).json({ message: error.message || "Failed to fetch template tags" });
    }
  });
}

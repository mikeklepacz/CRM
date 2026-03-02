import type { Express } from "express";
import { storage } from "../../storage";
import { getTenantId, getUserId } from "./templates.helpers";
import type { SalesTemplatesDeps } from "./templates.types";

export function registerTemplatesListRoute(app: Express, deps: SalesTemplatesDeps): void {
  app.get("/api/templates", deps.isAuthenticatedCustom, async (req: any, res) => {
    try {
      const templates = await storage.getUserTemplates(getUserId(req), getTenantId(req));
      res.json(templates);
    } catch (error: any) {
      console.error("Error fetching templates:", error);
      res.status(500).json({ message: error.message || "Failed to fetch templates" });
    }
  });
}

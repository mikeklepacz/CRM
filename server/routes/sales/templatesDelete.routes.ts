import type { Express } from "express";
import { storage } from "../../storage";
import { getTenantId, getUserId } from "./templates.helpers";
import type { SalesTemplatesDeps } from "./templates.types";

export function registerTemplatesDeleteRoute(app: Express, deps: SalesTemplatesDeps): void {
  app.delete("/api/templates/:id", deps.isAuthenticatedCustom, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = getUserId(req);
      const tenantId = getTenantId(req);

      const template = await storage.getTemplate(id, tenantId);
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }
      if (template.userId !== userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      await storage.deleteTemplate(id, tenantId);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting template:", error);
      res.status(500).json({ message: error.message || "Failed to delete template" });
    }
  });
}

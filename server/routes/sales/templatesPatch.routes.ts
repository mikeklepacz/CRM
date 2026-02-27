import type { Express } from "express";
import { clearOtherDefaultScriptTemplates } from "../../services/sales/templateDefaultsService";
import { storage } from "../../storage";
import { getTenantId, getUserId } from "./templates.helpers";
import { updateTemplateSchema } from "./templates.schemas";
import type { SalesTemplatesDeps } from "./templates.types";

export function registerTemplatesPatchRoute(app: Express, deps: SalesTemplatesDeps): void {
  app.patch("/api/templates/:id", deps.isAuthenticatedCustom, async (req: any, res) => {
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

      const validation = updateTemplateSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: validation.error.errors[0].message });
      }

      const updatedType = validation.data.type || template.type;
      if (validation.data.isDefault && updatedType === "Script") {
        await clearOtherDefaultScriptTemplates(userId, tenantId, id);
      }

      const updated = await storage.updateTemplate(id, tenantId, validation.data);
      res.json(updated);
    } catch (error: any) {
      console.error("Error updating template:", error);
      res.status(500).json({ message: error.message || "Failed to update template" });
    }
  });
}

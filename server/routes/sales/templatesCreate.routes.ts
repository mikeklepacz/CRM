import type { Express } from "express";
import { insertTemplateSchema } from "@shared/schema";
import { clearOtherDefaultScriptTemplates } from "../../services/sales/templateDefaultsService";
import { storage } from "../../storage";
import { getTenantId, getUserId } from "./templates.helpers";
import type { SalesTemplatesDeps } from "./templates.types";

export function registerTemplatesCreateRoute(app: Express, deps: SalesTemplatesDeps): void {
  app.post("/api/templates", deps.isAuthenticatedCustom, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const tenantId = getTenantId(req);
      const validation = insertTemplateSchema.safeParse({ ...req.body, userId, tenantId });
      if (!validation.success) {
        return res.status(400).json({ message: validation.error.errors[0].message });
      }

      if (validation.data.isDefault && validation.data.type === "Script") {
        await clearOtherDefaultScriptTemplates(userId, tenantId);
      }

      const template = await storage.createTemplate(validation.data);
      res.json(template);
    } catch (error: any) {
      console.error("Error creating template:", error);
      res.status(500).json({ message: error.message || "Failed to create template" });
    }
  });
}

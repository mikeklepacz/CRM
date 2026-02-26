import type { Express } from "express";
import { z } from "zod";
import { insertTemplateSchema } from "@shared/schema";
import { storage } from "../../storage";
import { clearOtherDefaultScriptTemplates } from "../../services/sales/templateDefaultsService";

type Deps = {
  isAuthenticatedCustom: any;
};

const updateTemplateSchema = z.object({
  title: z.string().min(1).optional(),
  content: z.string().optional(),
  type: z.enum(["Email", "Script"]).optional(),
  tags: z.array(z.string()).optional(),
  isDefault: z.boolean().optional(),
});

function getUserId(req: any): string {
  return req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
}

function getTenantId(req: any): string {
  return req.user.tenantId;
}

export function registerSalesTemplatesRoutes(app: Express, deps: Deps): void {
  app.get("/api/templates", deps.isAuthenticatedCustom, async (req: any, res) => {
    try {
      const templates = await storage.getUserTemplates(getUserId(req), getTenantId(req));
      res.json(templates);
    } catch (error: any) {
      console.error("Error fetching templates:", error);
      res.status(500).json({ message: error.message || "Failed to fetch templates" });
    }
  });

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

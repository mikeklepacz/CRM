import type { Express } from "express";
import type { OrgAdminPipelinesRouteDeps } from "./orgAdminPipelines.types";
import { storage } from "../../storage";

export function registerOrgAdminPipelinesCreateRoute(app: Express, deps: OrgAdminPipelinesRouteDeps): void {
  app.post("/api/org-admin/pipelines", deps.requireOrgAdmin, async (req: any, res) => {
      try {
          const tenantId = req.user.tenantId;
          const { name, slug, pipelineType, description, aiPromptTemplate, aiAssistantId, voiceAgentId, googleSheetProfile } = req.body;
          if (!name || !slug) {
              return res.status(400).json({ message: "Name and slug are required" });
          }
          const existingPipeline = await storage.getPipelineBySlug(slug, tenantId);
          if (existingPipeline) {
              return res.status(400).json({ message: "A pipeline with this slug already exists" });
          }
          const pipeline = await storage.createPipeline({
              tenantId,
              name,
              slug,
              pipelineType: pipelineType || "custom",
              description,
              aiPromptTemplate,
              aiAssistantId,
              voiceAgentId,
              googleSheetProfile,
              isActive: true,
          });
          res.json({ pipeline });
      }
      catch (error: any) {
          console.error("Error creating pipeline:", error);
          res.status(500).json({ message: error.message || "Failed to create pipeline" });
      }
  });
}

import type { Express } from "express";
import type { OrgAdminPipelinesRouteDeps } from "./orgAdminPipelines.types";
import { storage } from "../../storage";

export function registerOrgAdminPipelinesPatchRoute(app: Express, deps: OrgAdminPipelinesRouteDeps): void {
  app.patch("/api/org-admin/pipelines/:pipelineId", deps.requireOrgAdmin, async (req: any, res) => {
      try {
          const { pipelineId } = req.params;
          const tenantId = req.user.tenantId;
          const updates = req.body;
          const existing = await storage.getPipelineById(pipelineId, tenantId);
          if (!existing) {
              return res.status(404).json({ message: "Pipeline not found" });
          }
          if (updates.slug && updates.slug !== existing.slug) {
              const slugConflict = await storage.getPipelineBySlug(updates.slug, tenantId);
              if (slugConflict) {
                  return res.status(400).json({ message: "A pipeline with this slug already exists" });
              }
          }
          const pipeline = await storage.updatePipeline(pipelineId, tenantId, updates);
          res.json({ pipeline });
      }
      catch (error: any) {
          console.error("Error updating pipeline:", error);
          res.status(500).json({ message: error.message || "Failed to update pipeline" });
      }
  });
}

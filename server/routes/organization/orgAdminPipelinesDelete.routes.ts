import type { Express } from "express";
import type { OrgAdminPipelinesRouteDeps } from "./orgAdminPipelines.types";
import { storage } from "../../storage";

export function registerOrgAdminPipelinesDeleteRoute(app: Express, deps: OrgAdminPipelinesRouteDeps): void {
  app.delete("/api/org-admin/pipelines/:pipelineId", deps.requireOrgAdmin, async (req: any, res) => {
      try {
          const { pipelineId } = req.params;
          const tenantId = req.user.tenantId;
          const existing = await storage.getPipelineById(pipelineId, tenantId);
          if (!existing) {
              return res.status(404).json({ message: "Pipeline not found" });
          }
          await storage.deletePipeline(pipelineId, tenantId);
          res.json({ success: true });
      }
      catch (error: any) {
          console.error("Error deleting pipeline:", error);
          res.status(500).json({ message: error.message || "Failed to delete pipeline" });
      }
  });
}

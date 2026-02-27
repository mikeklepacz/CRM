import type { Express } from "express";
import type { OrgAdminPipelinesRouteDeps } from "./orgAdminPipelines.types";
import { storage } from "../../storage";

export function registerOrgAdminPipelinesGetByIdRoute(app: Express, deps: OrgAdminPipelinesRouteDeps): void {
  app.get("/api/org-admin/pipelines/:pipelineId", deps.requireOrgAdmin, async (req: any, res) => {
      try {
          const { pipelineId } = req.params;
          const tenantId = req.user.tenantId;
          const pipeline = await storage.getPipelineById(pipelineId, tenantId);
          if (!pipeline) {
              return res.status(404).json({ message: "Pipeline not found" });
          }
          const stages = await storage.listPipelineStages(pipelineId, tenantId);
          res.json({ pipeline, stages });
      }
      catch (error: any) {
          console.error("Error getting pipeline:", error);
          res.status(500).json({ message: error.message || "Failed to get pipeline" });
      }
  });
}

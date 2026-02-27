import type { Express } from "express";
import type { OrgAdminPipelinesRouteDeps } from "./orgAdminPipelines.types";
import { storage } from "../../storage";

export function registerOrgAdminPipelineStagesReorderRoute(app: Express, deps: OrgAdminPipelinesRouteDeps): void {
  app.post("/api/org-admin/pipelines/:pipelineId/stages/reorder", deps.requireOrgAdmin, async (req: any, res) => {
      try {
          const { pipelineId } = req.params;
          const tenantId = req.user.tenantId;
          const { stageIds } = req.body;
          if (!Array.isArray(stageIds) || stageIds.length === 0) {
              return res.status(400).json({ message: "stageIds array is required" });
          }
          const pipeline = await storage.getPipelineById(pipelineId, tenantId);
          if (!pipeline) {
              return res.status(404).json({ message: "Pipeline not found" });
          }
          await storage.reorderPipelineStages(pipelineId, tenantId, stageIds);
          const stages = await storage.listPipelineStages(pipelineId, tenantId);
          res.json({ stages });
      }
      catch (error: any) {
          console.error("Error reordering stages:", error);
          res.status(500).json({ message: error.message || "Failed to reorder stages" });
      }
  });
}

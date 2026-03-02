import type { Express } from "express";
import type { OrgAdminPipelinesRouteDeps } from "./orgAdminPipelines.types";
import { storage } from "../../storage";

export function registerOrgAdminPipelineStagesDeleteRoute(app: Express, deps: OrgAdminPipelinesRouteDeps): void {
  app.delete("/api/org-admin/pipelines/:pipelineId/stages/:stageId", deps.requireOrgAdmin, async (req: any, res) => {
      try {
          const { pipelineId, stageId } = req.params;
          const tenantId = req.user.tenantId;
          const pipeline = await storage.getPipelineById(pipelineId, tenantId);
          if (!pipeline) {
              return res.status(404).json({ message: "Pipeline not found" });
          }
          const stage = await storage.getPipelineStageById(stageId, tenantId);
          if (!stage || stage.pipelineId !== pipelineId) {
              return res.status(404).json({ message: "Stage not found" });
          }
          await storage.deletePipelineStage(stageId, tenantId);
          res.json({ success: true });
      }
      catch (error: any) {
          console.error("Error deleting stage:", error);
          res.status(500).json({ message: error.message || "Failed to delete stage" });
      }
  });
}

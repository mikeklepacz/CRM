import type { Express } from "express";
import type { OrgAdminPipelinesRouteDeps } from "./orgAdminPipelines.types";
import { storage } from "../../storage";

export function registerOrgAdminPipelineStagesPatchRoute(app: Express, deps: OrgAdminPipelinesRouteDeps): void {
  app.patch("/api/org-admin/pipelines/:pipelineId/stages/:stageId", deps.requireOrgAdmin, async (req: any, res) => {
      try {
          const { pipelineId, stageId } = req.params;
          const tenantId = req.user.tenantId;
          const updates = req.body;
          const pipeline = await storage.getPipelineById(pipelineId, tenantId);
          if (!pipeline) {
              return res.status(404).json({ message: "Pipeline not found" });
          }
          const stage = await storage.getPipelineStageById(stageId, tenantId);
          if (!stage || stage.pipelineId !== pipelineId) {
              return res.status(404).json({ message: "Stage not found" });
          }
          const updatedStage = await storage.updatePipelineStage(stageId, tenantId, updates);
          res.json({ stage: updatedStage });
      }
      catch (error: any) {
          console.error("Error updating stage:", error);
          res.status(500).json({ message: error.message || "Failed to update stage" });
      }
  });
}

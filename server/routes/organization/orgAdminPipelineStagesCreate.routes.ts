import type { Express } from "express";
import type { OrgAdminPipelinesRouteDeps } from "./orgAdminPipelines.types";
import { storage } from "../../storage";

export function registerOrgAdminPipelineStagesCreateRoute(app: Express, deps: OrgAdminPipelinesRouteDeps): void {
  app.post("/api/org-admin/pipelines/:pipelineId/stages", deps.requireOrgAdmin, async (req: any, res) => {
      try {
          const { pipelineId } = req.params;
          const tenantId = req.user.tenantId;
          const { name, stageType, config, aiPromptOverride } = req.body;
          const pipeline = await storage.getPipelineById(pipelineId, tenantId);
          if (!pipeline) {
              return res.status(404).json({ message: "Pipeline not found" });
          }
          if (!name) {
              return res.status(400).json({ message: "Stage name is required" });
          }
          const existingStages = await storage.listPipelineStages(pipelineId, tenantId);
          const maxOrder = existingStages.length > 0 ? Math.max(...existingStages.map((s) => s.stageOrder)) : 0;
          const stage = await storage.createPipelineStage({
              tenantId,
              pipelineId,
              name,
              stageOrder: maxOrder + 1,
              stageType: stageType || "action",
              config: config || {},
              aiPromptOverride,
              isActive: true,
          } as any);
          res.json({ stage });
      }
      catch (error: any) {
          console.error("Error creating stage:", error);
          res.status(500).json({ message: error.message || "Failed to create stage" });
      }
  });
}

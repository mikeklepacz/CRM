import type { Express } from "express";
import { storage } from "../../storage";

export function registerOrgAdminPipelinesRoutes(
  app: Express,
  deps: { requireOrgAdmin: any }
): void {
  app.get("/api/org-admin/pipelines", deps.requireOrgAdmin, async (req: any, res) => {
    try {
      const tenantId = req.user.tenantId;
      const { projectId } = req.query;
      const pipelinesList = await storage.listPipelines(tenantId, projectId as string | undefined);
      res.json({ pipelines: pipelinesList });
    } catch (error: any) {
      console.error("Error listing pipelines:", error);
      res.status(500).json({ message: error.message || "Failed to list pipelines" });
    }
  });

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
    } catch (error: any) {
      console.error("Error getting pipeline:", error);
      res.status(500).json({ message: error.message || "Failed to get pipeline" });
    }
  });

  app.post("/api/org-admin/pipelines", deps.requireOrgAdmin, async (req: any, res) => {
    try {
      const tenantId = req.user.tenantId;
      const { name, slug, pipelineType, description, aiPromptTemplate, aiAssistantId, voiceAgentId, googleSheetProfile } =
        req.body;

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
    } catch (error: any) {
      console.error("Error creating pipeline:", error);
      res.status(500).json({ message: error.message || "Failed to create pipeline" });
    }
  });

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
    } catch (error: any) {
      console.error("Error updating pipeline:", error);
      res.status(500).json({ message: error.message || "Failed to update pipeline" });
    }
  });

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
    } catch (error: any) {
      console.error("Error deleting pipeline:", error);
      res.status(500).json({ message: error.message || "Failed to delete pipeline" });
    }
  });

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
    } catch (error: any) {
      console.error("Error creating stage:", error);
      res.status(500).json({ message: error.message || "Failed to create stage" });
    }
  });

  app.patch(
    "/api/org-admin/pipelines/:pipelineId/stages/:stageId",
    deps.requireOrgAdmin,
    async (req: any, res) => {
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
      } catch (error: any) {
        console.error("Error updating stage:", error);
        res.status(500).json({ message: error.message || "Failed to update stage" });
      }
    }
  );

  app.delete(
    "/api/org-admin/pipelines/:pipelineId/stages/:stageId",
    deps.requireOrgAdmin,
    async (req: any, res) => {
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
      } catch (error: any) {
        console.error("Error deleting stage:", error);
        res.status(500).json({ message: error.message || "Failed to delete stage" });
      }
    }
  );

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
    } catch (error: any) {
      console.error("Error reordering stages:", error);
      res.status(500).json({ message: error.message || "Failed to reorder stages" });
    }
  });
}

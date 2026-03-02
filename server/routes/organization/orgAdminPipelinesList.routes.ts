import type { Express } from "express";
import type { OrgAdminPipelinesRouteDeps } from "./orgAdminPipelines.types";
import { storage } from "../../storage";

export function registerOrgAdminPipelinesListRoute(app: Express, deps: OrgAdminPipelinesRouteDeps): void {
  app.get("/api/org-admin/pipelines", deps.requireOrgAdmin, async (req: any, res) => {
      try {
          const tenantId = req.user.tenantId;
          const { projectId } = req.query;
          const pipelinesList = await storage.listPipelines(tenantId, projectId as string | undefined);
          res.json({ pipelines: pipelinesList });
      }
      catch (error: any) {
          console.error("Error listing pipelines:", error);
          res.status(500).json({ message: error.message || "Failed to list pipelines" });
      }
  });
}

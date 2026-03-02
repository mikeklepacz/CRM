import type { Express } from "express";
import type { ApolloPrescreenDeps } from "./apolloPrescreen.types";
import { rebuildApolloCandidatesFromStoreSheet, listApolloCandidates } from "../../services/apolloCandidateService";
import { resolveTenantProjectId } from "../../services/projectScopeValidation";

export function registerApolloCandidatesRoutes(app: Express, deps: ApolloPrescreenDeps): void {
  app.get("/api/apollo/candidates", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const tenantId = await deps.getEffectiveTenantId(req);
      if (!tenantId) {
        return res.status(400).json({ message: "No tenant associated with user" });
      }

      const requestedProjectId = req.query.projectId as string | undefined;
      const projectId = await resolveTenantProjectId(tenantId, requestedProjectId);
      if (!projectId) {
        return res.status(400).json({ message: "projectId is required" });
      }

      const candidates = await listApolloCandidates(tenantId, projectId);
      res.json({ candidates });
    } catch (error: any) {
      console.error("Error listing Apollo candidates:", error);
      res.status(500).json({ message: error.message || "Failed to list Apollo candidates" });
    }
  });

  app.post("/api/apollo/candidates/rebuild", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const tenantId = await deps.getEffectiveTenantId(req);
      if (!tenantId) {
        return res.status(400).json({ message: "No tenant associated with user" });
      }

      const requestedProjectId = (req.body?.projectId || req.query.projectId) as string | undefined;
      const projectId = await resolveTenantProjectId(tenantId, requestedProjectId);
      if (!projectId) {
        return res.status(400).json({ message: "projectId is required" });
      }

      const stats = await rebuildApolloCandidatesFromStoreSheet(tenantId, projectId);
      res.json({ ok: true, stats });
    } catch (error: any) {
      console.error("Error rebuilding Apollo candidates:", error);
      res.status(500).json({ message: error.message || "Failed to rebuild Apollo candidates" });
    }
  });
}

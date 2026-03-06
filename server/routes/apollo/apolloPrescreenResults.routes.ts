import type { Express } from "express";
import { listApolloPrescreenResults, setApolloCandidateDecision } from "../../services/apolloCandidateService";
import { resolveTenantProjectId } from "../../services/projectScopeValidation";
import type { ApolloPrescreenDeps } from "./apolloPrescreen.types";

export function registerApolloPrescreenResultsRoutes(app: Express, deps: ApolloPrescreenDeps): void {
  app.get("/api/apollo/prescreen-results", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
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

      const results = await listApolloPrescreenResults(tenantId, projectId);
      res.json({ results });
    } catch (error: any) {
      console.error("Error listing Apollo pre-screen results:", error);
      res.status(500).json({ message: error.message || "Failed to list pre-screen results" });
    }
  });

  app.patch("/api/apollo/prescreen-results/:candidateId/decision", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
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

      const decision = req.body?.decision as "pending" | "approved" | "rejected";
      if (!["pending", "approved", "rejected"].includes(decision)) {
        return res.status(400).json({ message: "decision must be one of: pending, approved, rejected" });
      }

      const updated = await setApolloCandidateDecision(tenantId, projectId, req.params.candidateId, decision);
      if (!updated) {
        return res.status(404).json({ message: "Candidate not found" });
      }

      res.json({ updated });
    } catch (error: any) {
      console.error("Error updating Apollo pre-screen decision:", error);
      res.status(500).json({ message: error.message || "Failed to update decision" });
    }
  });
}

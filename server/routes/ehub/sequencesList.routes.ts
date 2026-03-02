import type { Express } from "express";
import { storage } from "../../storage";
import { assertTenantProjectScope } from "../../services/projectScopeValidation";
import type { SequencesCoreDeps } from "./sequencesCore.types";

export function registerSequencesListRoute(app: Express, deps: SequencesCoreDeps): void {
  app.get("/api/sequences", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const { status, projectId } = req.query;
      await assertTenantProjectScope(req.user.tenantId, projectId as string | undefined);
      const sequences = await storage.listSequences(req.user.tenantId, { status, projectId: projectId as string | undefined });
      res.json(sequences);
    } catch (error: any) {
      console.error("Error listing sequences:", error);
      res.status(500).json({ message: error.message || "Failed to list sequences" });
    }
  });
}

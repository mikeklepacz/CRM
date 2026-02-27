import type { Express } from "express";
import { storage } from "../../storage";
import { checkQualificationModuleAccess } from "./qualificationAccess";
import type { QualificationLeadsDeps } from "./leads.types";

export function registerQualificationLeadsDeleteRoute(app: Express, deps: QualificationLeadsDeps): void {
  app.delete("/api/qualification/leads/:id", deps.isAuthenticated, async (req: any, res) => {
    try {
      if (!(await checkQualificationModuleAccess(req, res))) return;

      const tenantId = req.user.tenantId;
      const existing = await storage.getQualificationLead(req.params.id, tenantId);
      if (!existing) {
        return res.status(404).json({ message: "Lead not found" });
      }

      await storage.deleteQualificationLead(req.params.id, tenantId);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting qualification lead:", error);
      res.status(500).json({ message: error.message || "Failed to delete lead" });
    }
  });
}

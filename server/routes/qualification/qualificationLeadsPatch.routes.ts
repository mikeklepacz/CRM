import type { Express } from "express";
import { storage } from "../../storage";
import { checkQualificationModuleAccess } from "./qualificationAccess";
import type { QualificationLeadsDeps } from "./leads.types";

export function registerQualificationLeadsPatchRoute(app: Express, deps: QualificationLeadsDeps): void {
  app.patch("/api/qualification/leads/:id", deps.isAuthenticated, async (req: any, res) => {
    try {
      if (!(await checkQualificationModuleAccess(req, res))) return;

      const tenantId = req.user.tenantId;
      const updates = req.body;

      const existing = await storage.getQualificationLead(req.params.id, tenantId);
      if (!existing) {
        return res.status(404).json({ message: "Lead not found" });
      }

      const lead = await storage.updateQualificationLead(req.params.id, tenantId, updates);
      res.json({ lead });
    } catch (error: any) {
      console.error("Error updating qualification lead:", error);
      res.status(500).json({ message: error.message || "Failed to update lead" });
    }
  });
}

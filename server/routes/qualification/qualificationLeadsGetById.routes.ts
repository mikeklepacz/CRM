import type { Express } from "express";
import { storage } from "../../storage";
import { checkQualificationModuleAccess } from "./qualificationAccess";
import type { QualificationLeadsDeps } from "./leads.types";

export function registerQualificationLeadsGetByIdRoute(app: Express, deps: QualificationLeadsDeps): void {
  app.get("/api/qualification/leads/:id", deps.isAuthenticated, async (req: any, res) => {
    try {
      if (!(await checkQualificationModuleAccess(req, res))) return;

      const tenantId = req.user.tenantId;
      const lead = await storage.getQualificationLead(req.params.id, tenantId);
      if (!lead) {
        return res.status(404).json({ message: "Lead not found" });
      }
      res.json({ lead });
    } catch (error: any) {
      console.error("Error getting qualification lead:", error);
      res.status(500).json({ message: error.message || "Failed to get lead" });
    }
  });
}

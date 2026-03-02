import type { Express } from "express";
import { storage } from "../../storage";
import { checkQualificationModuleAccess } from "./qualificationAccess";
import type { QualificationLeadsDeps } from "./leads.types";

export function registerQualificationLeadsCreateRoute(app: Express, deps: QualificationLeadsDeps): void {
  app.post("/api/qualification/leads", deps.isAuthenticated, async (req: any, res) => {
    try {
      if (!(await checkQualificationModuleAccess(req, res))) return;

      const tenantId = req.user.tenantId;
      const leadData = req.body;

      const lead = await storage.createQualificationLead({
        ...leadData,
        tenantId,
      });

      res.status(201).json({ lead });
    } catch (error: any) {
      console.error("Error creating qualification lead:", error);
      res.status(500).json({ message: error.message || "Failed to create lead" });
    }
  });
}

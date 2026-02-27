import type { Express } from "express";
import { storage } from "../../storage";
import { checkQualificationModuleAccess } from "./qualificationAccess";
import type { QualificationLeadsDeps } from "./leads.types";

export function registerQualificationLeadsBulkCreateRoute(app: Express, deps: QualificationLeadsDeps): void {
  app.post("/api/qualification/leads/bulk", deps.isAuthenticated, async (req: any, res) => {
    try {
      if (!(await checkQualificationModuleAccess(req, res))) return;

      const tenantId = req.user.tenantId;
      const { leads } = req.body;

      if (!Array.isArray(leads) || leads.length === 0) {
        return res.status(400).json({ message: "Leads array is required" });
      }

      const leadsWithTenant = leads.map((lead: any) => ({
        ...lead,
        tenantId,
      }));

      const created = await storage.createQualificationLeads(leadsWithTenant);
      res.status(201).json({ leads: created, count: created.length });
    } catch (error: any) {
      console.error("Error creating qualification leads in bulk:", error);
      res.status(500).json({ message: error.message || "Failed to create leads" });
    }
  });
}

import type { Express } from "express";
import { storage } from "../../storage";
import { checkQualificationModuleAccess } from "./qualificationAccess";
import type { QualificationLeadsDeps } from "./leads.types";

export function registerQualificationLeadsBulkDeleteRoute(app: Express, deps: QualificationLeadsDeps): void {
  app.post("/api/qualification/leads/bulk-delete", deps.isAuthenticated, async (req: any, res) => {
    try {
      if (!(await checkQualificationModuleAccess(req, res))) return;

      const tenantId = req.user.tenantId;
      const { ids } = req.body;

      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ message: "Lead IDs array is required" });
      }

      const deleted = await storage.deleteQualificationLeads(ids, tenantId);
      res.json({ deleted });
    } catch (error: any) {
      console.error("Error bulk deleting qualification leads:", error);
      res.status(500).json({ message: error.message || "Failed to delete leads" });
    }
  });
}

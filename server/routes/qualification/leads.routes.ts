import type { Express } from "express";
import { storage } from "../../storage";
import { checkQualificationModuleAccess } from "./qualificationAccess";

export function registerQualificationLeadRoutes(
  app: Express,
  deps: { isAuthenticated: any }
): void {
  app.get("/api/qualification/leads", deps.isAuthenticated, async (req: any, res) => {
    try {
      if (!(await checkQualificationModuleAccess(req, res))) return;

      const tenantId = req.user.tenantId;
      const { campaignId, status, callStatus, projectId, limit, offset } = req.query;

      const result = await storage.listQualificationLeads(tenantId, {
        campaignId: campaignId as string | undefined,
        status: status as string | undefined,
        callStatus: callStatus as string | undefined,
        projectId: projectId as string | undefined,
        limit: limit ? parseInt(limit as string, 10) : undefined,
        offset: offset ? parseInt(offset as string, 10) : undefined,
      });

      res.json(result);
    } catch (error: any) {
      console.error("Error listing qualification leads:", error);
      res.status(500).json({ message: error.message || "Failed to list leads" });
    }
  });

  app.get("/api/qualification/leads/stats", deps.isAuthenticated, async (req: any, res) => {
    try {
      if (!(await checkQualificationModuleAccess(req, res))) return;

      const tenantId = req.user.tenantId;
      const { campaignId, projectId } = req.query;
      const stats = await storage.getQualificationLeadStats(tenantId, campaignId as string | undefined, projectId as string | undefined);
      res.json({ stats });
    } catch (error: any) {
      console.error("Error getting qualification lead stats:", error);
      res.status(500).json({ message: error.message || "Failed to get stats" });
    }
  });

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

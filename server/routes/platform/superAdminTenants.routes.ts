import type { Express } from "express";
import { insertTenantSchema } from "@shared/schema";
import { storage } from "../../storage";

export function registerSuperAdminTenantsRoutes(
  app: Express,
  deps: { requireSuperAdmin: any }
): void {
  app.get("/api/super-admin/tenants", deps.requireSuperAdmin, async (_req: any, res) => {
    try {
      const tenants = await storage.listTenants();
      res.json({ tenants });
    } catch (error: any) {
      console.error("Error listing tenants:", error);
      res.status(500).json({ message: error.message || "Failed to list tenants" });
    }
  });

  app.get("/api/super-admin/tenants/:tenantId", deps.requireSuperAdmin, async (req: any, res) => {
    try {
      const { tenantId } = req.params;
      const tenant = await storage.getTenantById(tenantId);
      if (!tenant) {
        return res.status(404).json({ message: "Tenant not found" });
      }
      const stats = await storage.getTenantStats(tenantId);
      res.json({ tenant, stats });
    } catch (error: any) {
      console.error("Error getting tenant details:", error);
      res.status(500).json({ message: error.message || "Failed to get tenant details" });
    }
  });

  app.post("/api/super-admin/tenants", deps.requireSuperAdmin, async (req: any, res) => {
    try {
      const parseResult = insertTenantSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ message: "Invalid tenant data", errors: parseResult.error.errors });
      }
      const tenant = await storage.createTenant(parseResult.data);
      res.json({ tenant });
    } catch (error: any) {
      console.error("Error creating tenant:", error);
      res.status(500).json({ message: error.message || "Failed to create tenant" });
    }
  });

  app.patch("/api/super-admin/tenants/:tenantId", deps.requireSuperAdmin, async (req: any, res) => {
    try {
      const { tenantId } = req.params;
      const parseResult = insertTenantSchema.partial().safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ message: "Invalid tenant data", errors: parseResult.error.errors });
      }
      const tenant = await storage.updateTenant(tenantId, parseResult.data);
      res.json({ tenant });
    } catch (error: any) {
      console.error("Error updating tenant:", error);
      res.status(500).json({ message: error.message || "Failed to update tenant" });
    }
  });

  app.post("/api/super-admin/switch-tenant", deps.requireSuperAdmin, async (req: any, res) => {
    try {
      const { tenantId } = req.body;
      if (!tenantId) {
        return res.status(400).json({ message: "tenantId is required" });
      }

      const tenant = await storage.getTenantById(tenantId);
      if (!tenant) {
        return res.status(404).json({ message: "Tenant not found" });
      }

      req.session.tenantOverrideId = tenantId;
      req.session.tenantOverrideName = tenant.name;

      await new Promise<void>((resolve, reject) => {
        req.session.save((err: any) => {
          if (err) reject(err);
          else resolve();
        });
      });

      res.json({ success: true, tenantId, tenantName: tenant.name });
    } catch (error: any) {
      console.error("Error switching tenant:", error);
      res.status(500).json({ message: error.message || "Failed to switch tenant" });
    }
  });

  app.get("/api/super-admin/switch-tenant/clear", deps.requireSuperAdmin, async (req: any, res) => {
    try {
      req.session.tenantOverrideId = null;
      req.session.tenantOverrideName = null;

      await new Promise<void>((resolve, reject) => {
        req.session.save((err: any) => {
          if (err) reject(err);
          else resolve();
        });
      });

      res.json({ success: true });
    } catch (error: any) {
      console.error("Error clearing tenant override:", error);
      res.status(500).json({ message: error.message || "Failed to clear tenant override" });
    }
  });

  app.get("/api/super-admin/metrics", deps.requireSuperAdmin, async (_req: any, res) => {
    try {
      const metrics = await storage.getPlatformMetrics();
      res.json(metrics);
    } catch (error: any) {
      console.error("Error getting platform metrics:", error);
      res.status(500).json({ message: error.message || "Failed to get platform metrics" });
    }
  });

  app.get("/api/super-admin/tenants/:tenantId/users", deps.requireSuperAdmin, async (req: any, res) => {
    try {
      const { tenantId } = req.params;
      const users = await storage.listTenantUsers(tenantId);
      res.json({ users });
    } catch (error: any) {
      console.error("Error listing tenant users:", error);
      res.status(500).json({ message: error.message || "Failed to list tenant users" });
    }
  });

  app.get("/api/super-admin/tenants/:tenantId/projects", deps.requireSuperAdmin, async (req: any, res) => {
    try {
      const { tenantId } = req.params;
      const projects = await storage.listTenantProjects(tenantId);
      res.json(projects);
    } catch (error: any) {
      console.error("Error fetching tenant projects:", error);
      res.status(500).json({ message: error.message || "Failed to fetch projects" });
    }
  });
}

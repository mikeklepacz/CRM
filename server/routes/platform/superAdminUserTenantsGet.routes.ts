import type { Express } from "express";
import type { SuperAdminUsersRouteDeps } from "./superAdminUsers.types";
import { storage } from "../../storage";

export function registerSuperAdminUserTenantsGetRoute(app: Express, deps: SuperAdminUsersRouteDeps): void {
  app.get("/api/super-admin/users/:userId/tenants", deps.requireSuperAdmin, async (req: any, res) => {
      try {
          const { userId } = req.params;
          const memberships = await storage.getUserTenantMemberships(userId);
          res.json({ memberships });
      }
      catch (error: any) {
          console.error("Error getting user tenant memberships:", error);
          res.status(500).json({ message: error.message || "Failed to get user tenant memberships" });
      }
  });
}

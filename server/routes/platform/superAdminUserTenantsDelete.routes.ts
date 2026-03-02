import type { Express } from "express";
import type { SuperAdminUsersRouteDeps } from "./superAdminUsers.types";
import { storage } from "../../storage";

export function registerSuperAdminUserTenantsDeleteRoute(app: Express, deps: SuperAdminUsersRouteDeps): void {
  app.delete("/api/super-admin/users/:userId/tenants/:tenantId", deps.requireSuperAdmin, async (req: any, res) => {
      try {
          const { userId, tenantId } = req.params;
          await storage.removeUserFromTenant(userId, tenantId);
          res.json({ success: true });
      }
      catch (error: any) {
          console.error("Error removing user from tenant:", error);
          res.status(500).json({ message: error.message || "Failed to remove user from tenant" });
      }
  });
}

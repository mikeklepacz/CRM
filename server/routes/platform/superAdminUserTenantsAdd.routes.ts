import type { Express } from "express";
import type { SuperAdminUsersRouteDeps } from "./superAdminUsers.types";
import { storage } from "../../storage";

export function registerSuperAdminUserTenantsAddRoute(app: Express, deps: SuperAdminUsersRouteDeps): void {
  app.post("/api/super-admin/users/:userId/tenants", deps.requireSuperAdmin, async (req: any, res) => {
      try {
          const { userId } = req.params;
          const { tenantId, roleInTenant, isDefault } = req.body;
          if (!tenantId || !roleInTenant) {
              return res.status(400).json({ message: "Missing required fields: tenantId, roleInTenant" });
          }
          await storage.addUserToTenant(userId, tenantId, roleInTenant, isDefault);
          res.json({ success: true });
      }
      catch (error: any) {
          console.error("Error adding user to tenant:", error);
          res.status(500).json({ message: error.message || "Failed to add user to tenant" });
      }
  });
}

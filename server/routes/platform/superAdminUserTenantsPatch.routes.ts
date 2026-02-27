import type { Express } from "express";
import type { SuperAdminUsersRouteDeps } from "./superAdminUsers.types";
import { storage } from "../../storage";

export function registerSuperAdminUserTenantsPatchRoute(app: Express, deps: SuperAdminUsersRouteDeps): void {
  app.patch("/api/super-admin/users/:userId/tenants/:tenantId", deps.requireSuperAdmin, async (req: any, res) => {
      try {
          const { userId, tenantId } = req.params;
          const { roleInTenant } = req.body;
          if (!roleInTenant || !["agent", "org_admin"].includes(roleInTenant)) {
              return res.status(400).json({ message: 'Invalid roleInTenant. Must be "agent" or "org_admin"' });
          }
          await storage.updateUserRoleInTenant(userId, tenantId, roleInTenant);
          res.json({ success: true });
      }
      catch (error: any) {
          console.error("Error updating user role in tenant:", error);
          res.status(500).json({ message: error.message || "Failed to update user role in tenant" });
      }
  });
}

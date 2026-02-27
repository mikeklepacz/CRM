import type { Express } from "express";
import type { OrgAdminCoreRouteDeps } from "./orgAdminCore.types";
import { storage } from "../../storage";

export function registerOrgAdminUsersRoleUpdateRoute(app: Express, deps: OrgAdminCoreRouteDeps): void {
  app.patch("/api/org-admin/users/:userId/role", deps.requireOrgAdmin, async (req: any, res) => {
      try {
          const { userId } = req.params;
          const { role } = req.body;
          const tenantId = req.user.tenantId;
          if (!role || !["org_admin", "agent"].includes(role)) {
              return res.status(400).json({ message: "Invalid role. Must be org_admin or agent" });
          }
          if (userId === req.user.id && role !== "org_admin") {
              return res.status(400).json({ message: "Cannot demote yourself" });
          }
          await storage.updateUserRoleInTenant(userId, tenantId, role);
          res.json({ success: true });
      }
      catch (error: any) {
          console.error("Error updating user role:", error);
          res.status(500).json({ message: error.message || "Failed to update user role" });
      }
  });
}

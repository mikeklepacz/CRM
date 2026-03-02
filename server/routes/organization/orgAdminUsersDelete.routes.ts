import type { Express } from "express";
import type { OrgAdminCoreRouteDeps } from "./orgAdminCore.types";
import { storage } from "../../storage";

export function registerOrgAdminUsersDeleteRoute(app: Express, deps: OrgAdminCoreRouteDeps): void {
  app.delete("/api/org-admin/users/:userId", deps.requireOrgAdmin, async (req: any, res) => {
      try {
          const { userId } = req.params;
          const tenantId = req.user.tenantId;
          if (userId === req.user.id) {
              return res.status(400).json({ message: "Cannot remove yourself from the organization" });
          }
          await storage.removeUserFromTenant(userId, tenantId);
          res.json({ success: true });
      }
      catch (error: any) {
          console.error("Error removing user from tenant:", error);
          res.status(500).json({ message: error.message || "Failed to remove user" });
      }
  });
}

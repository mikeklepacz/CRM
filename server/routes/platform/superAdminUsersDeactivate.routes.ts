import type { Express } from "express";
import type { SuperAdminUsersRouteDeps } from "./superAdminUsers.types";
import { storage } from "../../storage";

export function registerSuperAdminUsersDeactivateRoute(app: Express, deps: SuperAdminUsersRouteDeps): void {
  app.post("/api/super-admin/users/:userId/deactivate", deps.requireSuperAdmin, async (req: any, res) => {
      try {
          const { userId } = req.params;
          await storage.updateUser(userId, { isActive: false });
          res.json({ success: true, message: "User deactivated successfully" });
      }
      catch (error: any) {
          console.error("Error deactivating user:", error);
          res.status(500).json({ message: error.message || "Failed to deactivate user" });
      }
  });
}

import type { Express } from "express";
import type { SuperAdminUsersRouteDeps } from "./superAdminUsers.types";
import { storage } from "../../storage";

export function registerSuperAdminUsersReactivateRoute(app: Express, deps: SuperAdminUsersRouteDeps): void {
  app.post("/api/super-admin/users/:userId/reactivate", deps.requireSuperAdmin, async (req: any, res) => {
      try {
          const { userId } = req.params;
          await storage.updateUser(userId, { isActive: true });
          res.json({ success: true, message: "User reactivated successfully" });
      }
      catch (error: any) {
          console.error("Error reactivating user:", error);
          res.status(500).json({ message: error.message || "Failed to reactivate user" });
      }
  });
}

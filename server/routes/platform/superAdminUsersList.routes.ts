import type { Express } from "express";
import type { SuperAdminUsersRouteDeps } from "./superAdminUsers.types";
import { storage } from "../../storage";

export function registerSuperAdminUsersListRoute(app: Express, deps: SuperAdminUsersRouteDeps): void {
  app.get("/api/super-admin/users", deps.requireSuperAdmin, async (_req: any, res) => {
      try {
          const users = await storage.listUsersAcrossTenants();
          res.json({ users });
      }
      catch (error: any) {
          console.error("Error listing users across tenants:", error);
          res.status(500).json({ message: error.message || "Failed to list users" });
      }
  });
}

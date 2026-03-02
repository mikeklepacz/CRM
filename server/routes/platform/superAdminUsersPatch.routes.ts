import type { Express } from "express";
import type { SuperAdminUsersRouteDeps } from "./superAdminUsers.types";
import { storage } from "../../storage";

export function registerSuperAdminUsersPatchRoute(app: Express, deps: SuperAdminUsersRouteDeps): void {
  app.patch("/api/super-admin/users/:userId", deps.requireSuperAdmin, async (req: any, res) => {
      try {
          const { userId } = req.params;
          const { firstName, lastName, agentName, email, role } = req.body;
          const updates: any = {};
          if (firstName !== undefined)
              updates.firstName = firstName;
          if (lastName !== undefined)
              updates.lastName = lastName;
          if (agentName !== undefined)
              updates.agentName = agentName;
          if (email !== undefined)
              updates.email = email;
          if (role !== undefined)
              updates.role = role;
          const updatedUser = await storage.updateUser(userId, updates);
          res.json({ user: updatedUser });
      }
      catch (error: any) {
          console.error("Error updating user:", error);
          res.status(500).json({ message: error.message || "Failed to update user" });
      }
  });
}

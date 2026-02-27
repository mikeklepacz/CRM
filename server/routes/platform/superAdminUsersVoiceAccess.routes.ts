import type { Express } from "express";
import type { SuperAdminUsersRouteDeps } from "./superAdminUsers.types";
import { storage } from "../../storage";

export function registerSuperAdminUsersVoiceAccessRoute(app: Express, deps: SuperAdminUsersRouteDeps): void {
  app.patch("/api/super-admin/users/:userId/voice-access", deps.requireSuperAdmin, async (req: any, res) => {
      try {
          const { userId } = req.params;
          const { hasVoiceAccess } = req.body;
          if (typeof hasVoiceAccess !== "boolean") {
              return res.status(400).json({ message: "hasVoiceAccess must be a boolean" });
          }
          await storage.updateUser(userId, { hasVoiceAccess });
          res.json({ success: true });
      }
      catch (error: any) {
          console.error("Error updating voice access:", error);
          res.status(500).json({ message: error.message || "Failed to update voice access" });
      }
  });
}

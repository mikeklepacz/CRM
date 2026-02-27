import type { Express } from "express";
import type { SuperAdminUsersRouteDeps } from "./superAdminUsers.types";
import bcrypt from "bcrypt";
import { storage } from "../../storage";

export function registerSuperAdminUsersResetPasswordRoute(app: Express, deps: SuperAdminUsersRouteDeps): void {
  app.patch("/api/super-admin/users/:userId/reset-password", deps.requireSuperAdmin, async (req: any, res) => {
      try {
          const { userId } = req.params;
          const { newPassword } = req.body;
          if (!newPassword || newPassword.length < 6) {
              return res.status(400).json({ message: "Password must be at least 6 characters" });
          }
          const passwordHash = await bcrypt.hash(newPassword, 10);
          await storage.updateUser(userId, { passwordHash });
          res.json({ success: true, message: "Password reset successfully" });
      }
      catch (error: any) {
          console.error("Error resetting password:", error);
          res.status(500).json({ message: error.message || "Failed to reset password" });
      }
  });
}

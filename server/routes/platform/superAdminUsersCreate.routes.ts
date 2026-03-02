import type { Express } from "express";
import type { SuperAdminUsersRouteDeps } from "./superAdminUsers.types";
import bcrypt from "bcrypt";
import { storage } from "../../storage";

export function registerSuperAdminUsersCreateRoute(app: Express, deps: SuperAdminUsersRouteDeps): void {
  app.post("/api/super-admin/users", deps.requireSuperAdmin, async (req: any, res) => {
      try {
          const { email, firstName, lastName, agentName, password, role, tenantId, roleInTenant, selectedCategory, referredBy } = req.body;
          if (!email || !password || !tenantId) {
              return res.status(400).json({ message: "Email, password, and tenant are required" });
          }
          const existingUser = await storage.getUserByEmail(email);
          if (existingUser) {
              return res.status(400).json({ message: "User with this email already exists" });
          }
          const passwordHash = await bcrypt.hash(password, 10);
          const username = email;
          const newUser = await storage.createUser({
              email,
              firstName: firstName || null,
              lastName: lastName || null,
              agentName: agentName || null,
              username,
              passwordHash,
              role: role || "agent",
              referredBy: referredBy || null,
          });
          await storage.addUserToTenant(newUser.id, tenantId, roleInTenant || "agent", true);
          if (selectedCategory) {
              await storage.setSelectedCategory(newUser.id, tenantId, selectedCategory);
          }
          res.json({ user: newUser });
      }
      catch (error: any) {
          console.error("Error creating user:", error);
          res.status(500).json({ message: error.message || "Failed to create user" });
      }
  });
}

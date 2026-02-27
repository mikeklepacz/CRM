import type { Express } from "express";
import type { OrgAdminCoreRouteDeps } from "./orgAdminCore.types";
import bcrypt from "bcrypt";
import { storage } from "../../storage";

export function registerOrgAdminUsersCreateRoute(app: Express, deps: OrgAdminCoreRouteDeps): void {
  app.post("/api/org-admin/users", deps.requireOrgAdmin, async (req: any, res) => {
      try {
          const { email, firstName, lastName, agentName, password, role } = req.body;
          const tenantId = req.user.tenantId;
          if (!email || !password) {
              return res.status(400).json({ message: "Email and password are required" });
          }
          const existingUser = await storage.getUserByEmail(email);
          if (existingUser) {
              const tenantUsers = await storage.listTenantUsers(tenantId);
              const alreadyMember = tenantUsers.some((u) => u.id === existingUser.id);
              if (alreadyMember) {
                  return res.status(400).json({ message: "User is already a member of this organization" });
              }
              return res.status(400).json({ message: "User with this email already exists" });
          }
          const passwordHash = await bcrypt.hash(password, 10);
          const username = email;
          const newUser = await storage.createUser({
              email,
              firstName: firstName || null,
              lastName: lastName || null,
              agentName: agentName || email.split("@")[0],
              username,
              passwordHash,
              role: role === "org_admin" ? "admin" : "agent",
              referredBy: null,
          });
          const roleInTenant = role === "org_admin" ? "org_admin" : "agent";
          await storage.addUserToTenant(newUser.id, tenantId, roleInTenant, true);
          res.json({
              success: true,
              user: {
                  id: newUser.id,
                  email: newUser.email,
                  firstName: newUser.firstName,
                  lastName: newUser.lastName,
                  agentName: newUser.agentName,
                  roleInTenant,
              },
          });
      }
      catch (error: any) {
          console.error("Error creating user:", error);
          res.status(500).json({ message: error.message || "Failed to create user" });
      }
  });
}

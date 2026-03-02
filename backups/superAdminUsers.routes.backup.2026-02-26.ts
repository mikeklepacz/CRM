import type { Express } from "express";
import bcrypt from "bcrypt";
import { storage } from "../../storage";

export function registerSuperAdminUsersRoutes(
  app: Express,
  deps: { requireSuperAdmin: any }
): void {
  app.get("/api/super-admin/users", deps.requireSuperAdmin, async (_req: any, res) => {
    try {
      const users = await storage.listUsersAcrossTenants();
      res.json({ users });
    } catch (error: any) {
      console.error("Error listing users across tenants:", error);
      res.status(500).json({ message: error.message || "Failed to list users" });
    }
  });

  app.get("/api/super-admin/users/:userId/tenants", deps.requireSuperAdmin, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const memberships = await storage.getUserTenantMemberships(userId);
      res.json({ memberships });
    } catch (error: any) {
      console.error("Error getting user tenant memberships:", error);
      res.status(500).json({ message: error.message || "Failed to get user tenant memberships" });
    }
  });

  app.post("/api/super-admin/users/:userId/tenants", deps.requireSuperAdmin, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const { tenantId, roleInTenant, isDefault } = req.body;
      if (!tenantId || !roleInTenant) {
        return res.status(400).json({ message: "Missing required fields: tenantId, roleInTenant" });
      }
      await storage.addUserToTenant(userId, tenantId, roleInTenant, isDefault);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error adding user to tenant:", error);
      res.status(500).json({ message: error.message || "Failed to add user to tenant" });
    }
  });

  app.delete(
    "/api/super-admin/users/:userId/tenants/:tenantId",
    deps.requireSuperAdmin,
    async (req: any, res) => {
      try {
        const { userId, tenantId } = req.params;
        await storage.removeUserFromTenant(userId, tenantId);
        res.json({ success: true });
      } catch (error: any) {
        console.error("Error removing user from tenant:", error);
        res.status(500).json({ message: error.message || "Failed to remove user from tenant" });
      }
    }
  );

  app.patch(
    "/api/super-admin/users/:userId/tenants/:tenantId",
    deps.requireSuperAdmin,
    async (req: any, res) => {
      try {
        const { userId, tenantId } = req.params;
        const { roleInTenant } = req.body;
        if (!roleInTenant || !["agent", "org_admin"].includes(roleInTenant)) {
          return res.status(400).json({ message: 'Invalid roleInTenant. Must be "agent" or "org_admin"' });
        }
        await storage.updateUserRoleInTenant(userId, tenantId, roleInTenant);
        res.json({ success: true });
      } catch (error: any) {
        console.error("Error updating user role in tenant:", error);
        res.status(500).json({ message: error.message || "Failed to update user role in tenant" });
      }
    }
  );

  app.post("/api/super-admin/users", deps.requireSuperAdmin, async (req: any, res) => {
    try {
      const { email, firstName, lastName, agentName, password, role, tenantId, roleInTenant, selectedCategory, referredBy } =
        req.body;

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
    } catch (error: any) {
      console.error("Error creating user:", error);
      res.status(500).json({ message: error.message || "Failed to create user" });
    }
  });

  app.patch("/api/super-admin/users/:userId", deps.requireSuperAdmin, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const { firstName, lastName, agentName, email, role } = req.body;

      const updates: any = {};
      if (firstName !== undefined) updates.firstName = firstName;
      if (lastName !== undefined) updates.lastName = lastName;
      if (agentName !== undefined) updates.agentName = agentName;
      if (email !== undefined) updates.email = email;
      if (role !== undefined) updates.role = role;

      const updatedUser = await storage.updateUser(userId, updates);
      res.json({ user: updatedUser });
    } catch (error: any) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: error.message || "Failed to update user" });
    }
  });

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
    } catch (error: any) {
      console.error("Error resetting password:", error);
      res.status(500).json({ message: error.message || "Failed to reset password" });
    }
  });

  app.post("/api/super-admin/users/:userId/deactivate", deps.requireSuperAdmin, async (req: any, res) => {
    try {
      const { userId } = req.params;
      await storage.updateUser(userId, { isActive: false });
      res.json({ success: true, message: "User deactivated successfully" });
    } catch (error: any) {
      console.error("Error deactivating user:", error);
      res.status(500).json({ message: error.message || "Failed to deactivate user" });
    }
  });

  app.post("/api/super-admin/users/:userId/reactivate", deps.requireSuperAdmin, async (req: any, res) => {
    try {
      const { userId } = req.params;
      await storage.updateUser(userId, { isActive: true });
      res.json({ success: true, message: "User reactivated successfully" });
    } catch (error: any) {
      console.error("Error reactivating user:", error);
      res.status(500).json({ message: error.message || "Failed to reactivate user" });
    }
  });

  app.patch("/api/super-admin/users/:userId/voice-access", deps.requireSuperAdmin, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const { hasVoiceAccess } = req.body;

      if (typeof hasVoiceAccess !== "boolean") {
        return res.status(400).json({ message: "hasVoiceAccess must be a boolean" });
      }

      await storage.updateUser(userId, { hasVoiceAccess });
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error updating voice access:", error);
      res.status(500).json({ message: error.message || "Failed to update voice access" });
    }
  });
}

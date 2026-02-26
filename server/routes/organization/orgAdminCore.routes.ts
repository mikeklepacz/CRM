import type { Express } from "express";
import bcrypt from "bcrypt";
import { storage } from "../../storage";

export function registerOrgAdminCoreRoutes(
  app: Express,
  deps: { requireOrgAdmin: any }
): void {
  app.get("/api/org-admin/users", deps.requireOrgAdmin, async (req: any, res) => {
    try {
      const tenantId = req.user.tenantId;
      const users = await storage.listTenantUsers(tenantId);
      res.json({ users });
    } catch (error: any) {
      console.error("Error listing tenant users:", error);
      res.status(500).json({ message: error.message || "Failed to list users" });
    }
  });

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
    } catch (error: any) {
      console.error("Error creating user:", error);
      res.status(500).json({ message: error.message || "Failed to create user" });
    }
  });

  app.patch("/api/org-admin/users/:userId/role", deps.requireOrgAdmin, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const { role } = req.body;
      const tenantId = req.user.tenantId;

      if (!role || !["org_admin", "agent"].includes(role)) {
        return res.status(400).json({ message: "Invalid role. Must be org_admin or agent" });
      }

      if (userId === req.user.id && role !== "org_admin") {
        return res.status(400).json({ message: "Cannot demote yourself" });
      }

      await storage.updateUserRoleInTenant(userId, tenantId, role);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: error.message || "Failed to update user role" });
    }
  });

  app.patch("/api/org-admin/users/:userId", deps.requireOrgAdmin, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const tenantId = req.user.tenantId;

      const tenantUsers = await storage.listTenantUsers(tenantId);
      const isMember = tenantUsers.some((u: any) => u.id === userId);
      if (!isMember) {
        return res.status(404).json({ message: "User not found in your organization" });
      }

      const { firstName, lastName, agentName, phone, twilioPhoneNumber, meetingLink } = req.body;
      const updates: Record<string, any> = {};
      if (firstName !== undefined) updates.firstName = firstName;
      if (lastName !== undefined) updates.lastName = lastName;
      if (agentName !== undefined) updates.agentName = agentName;
      if (phone !== undefined) updates.phone = phone;
      if (twilioPhoneNumber !== undefined) updates.twilioPhoneNumber = twilioPhoneNumber;
      if (meetingLink !== undefined) updates.meetingLink = meetingLink;

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ message: "No valid fields provided to update" });
      }

      const updatedUser = await storage.updateUser(userId, updates);
      res.json(updatedUser);
    } catch (error: any) {
      console.error("Error updating user profile:", error);
      res.status(500).json({ message: error.message || "Failed to update user profile" });
    }
  });

  app.delete("/api/org-admin/users/:userId", deps.requireOrgAdmin, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const tenantId = req.user.tenantId;

      if (userId === req.user.id) {
        return res.status(400).json({ message: "Cannot remove yourself from the organization" });
      }

      await storage.removeUserFromTenant(userId, tenantId);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error removing user from tenant:", error);
      res.status(500).json({ message: error.message || "Failed to remove user" });
    }
  });

  app.get("/api/org-admin/settings", deps.requireOrgAdmin, async (req: any, res) => {
    try {
      const tenantId = req.user.tenantId;
      const tenant = await storage.getTenantById(tenantId);
      if (!tenant) {
        return res.status(404).json({ message: "Tenant not found" });
      }
      res.json({ tenant });
    } catch (error: any) {
      console.error("Error getting tenant settings:", error);
      res.status(500).json({ message: error.message || "Failed to get settings" });
    }
  });

  app.patch("/api/org-admin/settings", deps.requireOrgAdmin, async (req: any, res) => {
    try {
      const tenantId = req.user.tenantId;
      const { settings } = req.body;

      if (!settings || typeof settings !== "object") {
        return res.status(400).json({ message: "Invalid settings object" });
      }

      const currentTenant = await storage.getTenantById(tenantId);
      const previousModules = currentTenant?.settings?.enabledModules || [];
      const newModules = settings.enabledModules || previousModules;

      if (settings.enabledModules) {
        const { handleModuleHardOff } = await import("../../services/moduleHardOff");
        const hardOffResults = await handleModuleHardOff(tenantId, previousModules, newModules);
        if (hardOffResults.length > 0) {
          console.log(`[OrgAdmin] Module hard-off results for tenant ${tenantId}:`, hardOffResults);
        }
      }

      const updated = await storage.updateTenantSettings(tenantId, settings);
      res.json({ tenant: updated });
    } catch (error: any) {
      console.error("Error updating tenant settings:", error);
      res.status(500).json({ message: error.message || "Failed to update settings" });
    }
  });

  app.get("/api/org-admin/stats", deps.requireOrgAdmin, async (req: any, res) => {
    try {
      const tenantId = req.user.tenantId;
      const stats = await storage.getTenantStats(tenantId);
      res.json(stats);
    } catch (error: any) {
      console.error("Error getting tenant stats:", error);
      res.status(500).json({ message: error.message || "Failed to get stats" });
    }
  });

  app.get("/api/org-admin/invites", deps.requireOrgAdmin, async (req: any, res) => {
    try {
      const tenantId = req.user.tenantId;
      const invites = await storage.listTenantInvites(tenantId);
      res.json({ invites });
    } catch (error: any) {
      console.error("Error listing invites:", error);
      res.status(500).json({ message: error.message || "Failed to list invites" });
    }
  });

  app.post("/api/org-admin/invites", deps.requireOrgAdmin, async (req: any, res) => {
    try {
      const tenantId = req.user.tenantId;
      const { email, role } = req.body;

      if (!email || !role) {
        return res.status(400).json({ message: "Missing required fields: email, role" });
      }

      if (!["org_admin", "agent"].includes(role)) {
        return res.status(400).json({ message: "Invalid role. Must be org_admin or agent" });
      }

      const existingUsers = await storage.listTenantUsers(tenantId);
      const alreadyMember = existingUsers.some((u) => u.email?.toLowerCase() === email.toLowerCase());
      if (alreadyMember) {
        return res.status(400).json({ message: "User is already a member of this organization" });
      }

      const existingInvites = await storage.listTenantInvites(tenantId);
      const pendingInvite = existingInvites.find(
        (i) => i.email.toLowerCase() === email.toLowerCase() && i.status === "pending"
      );
      if (pendingInvite) {
        return res.status(400).json({ message: "An invite is already pending for this email" });
      }

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const invite = await storage.createTenantInvite(tenantId, email, role, req.user.id, expiresAt);
      res.json({ invite });
    } catch (error: any) {
      console.error("Error creating invite:", error);
      res.status(500).json({ message: error.message || "Failed to create invite" });
    }
  });

  app.delete("/api/org-admin/invites/:inviteId", deps.requireOrgAdmin, async (req: any, res) => {
    try {
      const { inviteId } = req.params;
      const tenantId = req.user.tenantId;

      await storage.cancelTenantInvite(inviteId, tenantId);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error cancelling invite:", error);
      res.status(500).json({ message: error.message || "Failed to cancel invite" });
    }
  });
}

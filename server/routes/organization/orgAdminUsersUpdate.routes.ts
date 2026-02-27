import type { Express } from "express";
import type { OrgAdminCoreRouteDeps } from "./orgAdminCore.types";
import { storage } from "../../storage";

export function registerOrgAdminUsersUpdateRoute(app: Express, deps: OrgAdminCoreRouteDeps): void {
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
          if (firstName !== undefined)
              updates.firstName = firstName;
          if (lastName !== undefined)
              updates.lastName = lastName;
          if (agentName !== undefined)
              updates.agentName = agentName;
          if (phone !== undefined)
              updates.phone = phone;
          if (twilioPhoneNumber !== undefined)
              updates.twilioPhoneNumber = twilioPhoneNumber;
          if (meetingLink !== undefined)
              updates.meetingLink = meetingLink;
          if (Object.keys(updates).length === 0) {
              return res.status(400).json({ message: "No valid fields provided to update" });
          }
          const updatedUser = await storage.updateUser(userId, updates);
          res.json(updatedUser);
      }
      catch (error: any) {
          console.error("Error updating user profile:", error);
          res.status(500).json({ message: error.message || "Failed to update user profile" });
      }
  });
}

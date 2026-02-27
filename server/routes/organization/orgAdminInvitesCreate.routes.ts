import type { Express } from "express";
import type { OrgAdminCoreRouteDeps } from "./orgAdminCore.types";
import { storage } from "../../storage";

export function registerOrgAdminInvitesCreateRoute(app: Express, deps: OrgAdminCoreRouteDeps): void {
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
          const pendingInvite = existingInvites.find((i) => i.email.toLowerCase() === email.toLowerCase() && i.status === "pending");
          if (pendingInvite) {
              return res.status(400).json({ message: "An invite is already pending for this email" });
          }
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + 7);
          const invite = await storage.createTenantInvite(tenantId, email, role, req.user.id, expiresAt);
          res.json({ invite });
      }
      catch (error: any) {
          console.error("Error creating invite:", error);
          res.status(500).json({ message: error.message || "Failed to create invite" });
      }
  });
}

import type { Express } from "express";
import type { OrgAdminCoreRouteDeps } from "./orgAdminCore.types";
import { storage } from "../../storage";

export function registerOrgAdminInvitesListRoute(app: Express, deps: OrgAdminCoreRouteDeps): void {
  app.get("/api/org-admin/invites", deps.requireOrgAdmin, async (req: any, res) => {
      try {
          const tenantId = req.user.tenantId;
          const invites = await storage.listTenantInvites(tenantId);
          res.json({ invites });
      }
      catch (error: any) {
          console.error("Error listing invites:", error);
          res.status(500).json({ message: error.message || "Failed to list invites" });
      }
  });
}

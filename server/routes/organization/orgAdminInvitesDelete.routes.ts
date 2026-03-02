import type { Express } from "express";
import type { OrgAdminCoreRouteDeps } from "./orgAdminCore.types";
import { storage } from "../../storage";

export function registerOrgAdminInvitesDeleteRoute(app: Express, deps: OrgAdminCoreRouteDeps): void {
  app.delete("/api/org-admin/invites/:inviteId", deps.requireOrgAdmin, async (req: any, res) => {
      try {
          const { inviteId } = req.params;
          const tenantId = req.user.tenantId;
          await storage.cancelTenantInvite(inviteId, tenantId);
          res.json({ success: true });
      }
      catch (error: any) {
          console.error("Error cancelling invite:", error);
          res.status(500).json({ message: error.message || "Failed to cancel invite" });
      }
  });
}

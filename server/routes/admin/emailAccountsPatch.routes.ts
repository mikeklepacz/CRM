import type { Express } from "express";
import type { AdminEmailAccountsRouteDeps } from "./emailAccounts.types";
import { storage } from "../../storage";

export function registerEmailAccountsPatchRoute(app: Express, deps: AdminEmailAccountsRouteDeps): void {
  app.patch("/api/email-accounts/:id", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
      try {
          const { id } = req.params;
          const { status } = req.body;
          const tenantId = await deps.getEffectiveTenantId(req);
          if (!tenantId) {
              return res.status(400).json({ message: "No tenant associated with user" });
          }
          if (!["active", "inactive"].includes(status)) {
              return res.status(400).json({ message: 'Invalid status. Use "active" or "inactive"' });
          }
          const updated = await storage.updateEmailAccount(id, tenantId, { status });
          if (!updated) {
              return res.status(404).json({ message: "Email account not found" });
          }
          res.json({
              id: updated.id,
              email: updated.email,
              status: updated.status,
              dailySendCount: updated.dailySendCount,
          });
      }
      catch (error: any) {
          console.error("Error updating email account:", error);
          res.status(500).json({ message: error.message || "Failed to update email account" });
      }
  });
}

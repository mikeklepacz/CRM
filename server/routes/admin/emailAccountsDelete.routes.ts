import type { Express } from "express";
import type { AdminEmailAccountsRouteDeps } from "./emailAccounts.types";
import { storage } from "../../storage";

export function registerEmailAccountsDeleteRoute(app: Express, deps: AdminEmailAccountsRouteDeps): void {
  app.delete("/api/email-accounts/:id", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
      try {
          const { id } = req.params;
          const tenantId = await deps.getEffectiveTenantId(req);
          if (!tenantId) {
              return res.status(400).json({ message: "No tenant associated with user" });
          }
          const deleted = await storage.deleteEmailAccount(id, tenantId);
          if (!deleted) {
              return res.status(404).json({ message: "Email account not found" });
          }
          res.json({ message: "Email account disconnected successfully" });
      }
      catch (error: any) {
          console.error("Error deleting email account:", error);
          res.status(500).json({ message: error.message || "Failed to disconnect email account" });
      }
  });
}

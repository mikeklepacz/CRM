import type { Express } from "express";
import type { AdminEmailAccountsRouteDeps } from "./emailAccounts.types";
import { storage } from "../../storage";

export function registerEmailAccountsListRoute(app: Express, deps: AdminEmailAccountsRouteDeps): void {
  app.get("/api/email-accounts", deps.isAuthenticatedCustom, async (req: any, res) => {
      try {
          const tenantId = await deps.getEffectiveTenantId(req);
          if (!tenantId) {
              return res.status(400).json({ message: "No tenant associated with user" });
          }
          const tenantIntegrations = await storage.getUserIntegrationsWithGmailByTenant(tenantId);
          for (const integration of tenantIntegrations) {
              const existingAccount = await storage.getEmailAccountByEmail(tenantId, integration.googleCalendarEmail!);
              if (!existingAccount) {
                  try {
                      await storage.createEmailAccount({
                          tenantId,
                          email: integration.googleCalendarEmail!,
                          accessToken: integration.googleCalendarAccessToken,
                          refreshToken: integration.googleCalendarRefreshToken || undefined,
                          tokenExpiry: integration.googleCalendarTokenExpiry || undefined,
                          status: "active",
                          connectedBy: integration.userId,
                      });
                  }
                  catch (err: any) {
                      if (!err.message?.includes("unique") && !err.code?.includes("23505")) {
                          console.warn("Failed to auto-import email account:", integration.googleCalendarEmail, err.message);
                      }
                  }
              }
          }
          const accounts = await storage.listEmailAccounts(tenantId);
          const safeAccounts = accounts.map((acc) => ({
              id: acc.id,
              email: acc.email,
              status: acc.status,
              dailySendCount: acc.dailySendCount,
              lastSendCountReset: acc.lastSendCountReset,
              connectedAt: acc.connectedAt,
              lastUsedAt: acc.lastUsedAt,
              errorMessage: acc.errorMessage,
          }));
          res.json(safeAccounts);
      }
      catch (error: any) {
          console.error("Error listing email accounts:", error);
          res.status(500).json({ message: error.message || "Failed to list email accounts" });
      }
  });
}

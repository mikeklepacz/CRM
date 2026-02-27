import type { Express } from "express";
import { storage } from "../../storage";
import type { IntegrationsDeps } from "./integrations.types";

export function registerIntegrationsGoogleSheetsDisconnectRoute(app: Express, deps: IntegrationsDeps): void {
  app.post("/api/integrations/google-sheets/disconnect", deps.isAuthenticatedCustom, async (req: any, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;

      await (storage as any).updateUserIntegration(userId, {
        googleAccessToken: null,
        googleRefreshToken: null,
        googleTokenExpiry: null,
        googleEmail: null,
        googleConnectedAt: null,
      });

      res.json({ success: true });
    } catch (error: any) {
      console.error("Error disconnecting Google Sheets:", error);
      res.status(500).json({ message: error.message || "Failed to disconnect Google Sheets" });
    }
  });
}

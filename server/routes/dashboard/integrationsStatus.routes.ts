import type { Express } from "express";
import { storage } from "../../storage";
import type { IntegrationsDeps } from "./integrations.types";

export function registerIntegrationsStatusRoute(app: Express, deps: IntegrationsDeps): void {
  app.get("/api/integrations/status", deps.isAuthenticatedCustom, async (req: any, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const integration = (await storage.getUserIntegration(userId)) as any;

      res.json({
        googleSheetsConnected: !!(integration?.googleAccessToken && integration?.googleRefreshToken),
        googleCalendarConnected: !!(integration?.googleCalendarAccessToken && integration?.googleCalendarRefreshToken),
        googleSheetsEmail: integration?.googleEmail || null,
        googleCalendarEmail: integration?.googleCalendarEmail || null,
      });
    } catch (error: any) {
      console.error("Error fetching integration status:", error);
      res.status(500).json({ message: error.message || "Failed to fetch integration status" });
    }
  });
}

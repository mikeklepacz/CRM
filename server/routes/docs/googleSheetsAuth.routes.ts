import type { Express } from "express";
import {
  createGoogleSheetsOauthUrl,
  disconnectGoogleSheets,
  getGoogleSheetsSettings,
  isGoogleSheetsAuthHttpError,
  processGoogleSheetsOauthCallback,
  updateGoogleSheetsSettings,
} from "../../services/docs/googleSheetsAuthService";

type Deps = {
  isAuthenticatedCustom: any;
  isAdmin: any;
};

export function registerGoogleSheetsAuthRoutes(app: Express, deps: Deps): void {
  app.get("/api/auth/google/sheets/settings", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const settings = await getGoogleSheetsSettings(req.user);
      res.json(settings);
    } catch (error: any) {
      console.error("❌ Error fetching Google Sheets settings:", error);
      res.status(500).json({ message: error.message || "Failed to fetch settings" });
    }
  });

  app.put("/api/auth/google/sheets/settings", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      await updateGoogleSheetsSettings(req.body);
      res.json({ message: "Google Sheets OAuth settings updated successfully" });
    } catch (error: any) {
      if (isGoogleSheetsAuthHttpError(error)) {
        return res.status(error.status).json({ message: error.message });
      }
      console.error("❌ Error updating Google Sheets OAuth settings:", error);
      res.status(500).json({ message: error.message || "Failed to update settings" });
    }
  });

  app.get("/api/auth/google/sheets/oauth-url", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const url = await createGoogleSheetsOauthUrl({
        authUser: req.user,
        protocol: req.protocol,
        host: req.get("host"),
      });
      return res.json({ url });
    } catch (error: any) {
      if (isGoogleSheetsAuthHttpError(error)) {
        return res.status(error.status).json({ message: error.message });
      }
      console.error("❌ Error generating Google Sheets OAuth URL:", error);
      return res.status(500).json({ message: error.message || "Failed to generate OAuth URL" });
    }
  });

  app.get("/api/auth/google/sheets/callback", async (req: any, res) => {
    try {
      const html = await processGoogleSheetsOauthCallback({
        code: req.query?.code,
        state: req.query?.state,
        protocol: req.protocol,
        host: req.get("host"),
      });
      res.send(html);
    } catch (error: any) {
      console.error("❌ Google Sheets OAuth callback error:", error);
      res.send('<script>alert("Connection failed"); window.close();</script>');
    }
  });

  app.delete("/api/auth/google/sheets/disconnect", deps.isAuthenticatedCustom, deps.isAdmin, async (_req, res) => {
    try {
      await disconnectGoogleSheets();
      console.log("✅ Google Sheets disconnected successfully");
      res.json({ message: "Google Sheets disconnected successfully" });
    } catch (error: any) {
      console.error("❌ Error disconnecting Google Sheets:", error);
      res.status(500).json({ message: error.message || "Failed to disconnect" });
    }
  });
}

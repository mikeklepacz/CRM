import type { Express } from "express";
import { getGoogleSheetsSettings } from "../../services/docs/googleSheetsAuthService";
import type { GoogleSheetsAuthDeps } from "./googleSheetsAuth.types";

export function registerGoogleSheetsSettingsGetRoute(app: Express, deps: GoogleSheetsAuthDeps): void {
  app.get("/api/auth/google/sheets/settings", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const settings = await getGoogleSheetsSettings(req.user);
      res.json(settings);
    } catch (error: any) {
      console.error("❌ Error fetching Google Sheets settings:", error);
      res.status(500).json({ message: error.message || "Failed to fetch settings" });
    }
  });
}

import type { Express } from "express";
import { isGoogleSheetsAuthHttpError, updateGoogleSheetsSettings } from "../../services/docs/googleSheetsAuthService";
import type { GoogleSheetsAuthDeps } from "./googleSheetsAuth.types";

export function registerGoogleSheetsSettingsPutRoute(app: Express, deps: GoogleSheetsAuthDeps): void {
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
}

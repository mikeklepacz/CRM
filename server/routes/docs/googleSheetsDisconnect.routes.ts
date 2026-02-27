import type { Express } from "express";
import { disconnectGoogleSheets } from "../../services/docs/googleSheetsAuthService";
import type { GoogleSheetsAuthDeps } from "./googleSheetsAuth.types";

export function registerGoogleSheetsDisconnectRoute(app: Express, deps: GoogleSheetsAuthDeps): void {
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

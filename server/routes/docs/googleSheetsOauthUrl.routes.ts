import type { Express } from "express";
import { createGoogleSheetsOauthUrl, isGoogleSheetsAuthHttpError } from "../../services/docs/googleSheetsAuthService";
import type { GoogleSheetsAuthDeps } from "./googleSheetsAuth.types";

export function registerGoogleSheetsOauthUrlRoute(app: Express, deps: GoogleSheetsAuthDeps): void {
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
}

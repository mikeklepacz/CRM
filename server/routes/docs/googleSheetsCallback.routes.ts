import type { Express } from "express";
import { processGoogleSheetsOauthCallback } from "../../services/docs/googleSheetsAuthService";
import type { GoogleSheetsAuthDeps } from "./googleSheetsAuth.types";

export function registerGoogleSheetsCallbackRoute(app: Express, _deps: GoogleSheetsAuthDeps): void {
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
}

import type { Express } from "express";
import {
  createGmailOauthUrl,
  disconnectGmail,
  isGmailOauthHttpError,
  processGmailOauthCallback,
} from "../../services/docs/gmailOauthSupportService";

type Deps = {
  isAuthenticatedCustom: any;
};

export function registerGmailOauthSupportRoutes(app: Express, deps: Deps): void {
  app.get("/api/gmail/oauth-url", deps.isAuthenticatedCustom, async (req: any, res) => {
    try {
      const url = await createGmailOauthUrl({
        authUser: req.user,
        protocol: req.protocol,
        host: req.get("host"),
      });
      res.json({ url });
    } catch (error: any) {
      if (isGmailOauthHttpError(error)) {
        return res.status(error.status).json({ message: error.message });
      }
      console.error("❌ Error generating Gmail OAuth URL:", error);
      res.status(500).json({ message: error.message || "Failed to generate OAuth URL" });
    }
  });

  app.get("/api/gmail/callback", async (req, res) => {
    try {
      const html = await processGmailOauthCallback({
        code: req.query?.code,
        userId: req.query?.state,
        protocol: req.protocol,
        host: req.get("host") || "localhost:5000",
      });
      res.send(html);
    } catch (error: any) {
      console.error("Gmail OAuth callback error:", error);
      res.send('<script>alert("Connection failed"); window.close();</script>');
    }
  });

  app.post("/api/gmail/disconnect", deps.isAuthenticatedCustom, async (req: any, res) => {
    try {
      await disconnectGmail(req.user);
      res.json({ message: "Gmail disconnected successfully" });
    } catch (error: any) {
      console.error("Error disconnecting Gmail:", error);
      res.status(500).json({ message: error.message || "Failed to disconnect Gmail" });
    }
  });
}

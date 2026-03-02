import type { Express } from "express";
import type { AdminEmailAccountsRouteDeps } from "./emailAccounts.types";
import { storage } from "../../storage";

export function registerEmailAccountsOauthUrlRoute(app: Express, deps: AdminEmailAccountsRouteDeps): void {
  app.get("/api/email-accounts/oauth-url", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
      try {
          const integration = await storage.getSystemIntegration("google_sheets");
          if (!integration?.googleClientId) {
              return res.status(400).json({ message: "Please configure Google OAuth credentials first in Admin Dashboard" });
          }
          const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
          const tenantId = await deps.getEffectiveTenantId(req);
          if (!tenantId) {
              return res.status(400).json({ message: "No tenant associated with user" });
          }
          const redirectUri = `${req.protocol}://${req.get("host")}/api/email-accounts/callback`;
          const scope = "https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/userinfo.email";
          const { createHmac, randomBytes } = await import("crypto");
          const nonce = randomBytes(16).toString("hex");
          const statePayload = { userId, tenantId, nonce };
          const stateString = JSON.stringify(statePayload);
          const signature = createHmac("sha256", integration.googleClientSecret as string).update(stateString).digest("hex");
          const signedState = JSON.stringify({ payload: statePayload, sig: signature });
          const oauthUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
          oauthUrl.searchParams.set("client_id", integration.googleClientId);
          oauthUrl.searchParams.set("redirect_uri", redirectUri);
          oauthUrl.searchParams.set("response_type", "code");
          oauthUrl.searchParams.set("scope", scope);
          oauthUrl.searchParams.set("access_type", "offline");
          oauthUrl.searchParams.set("prompt", "consent");
          oauthUrl.searchParams.set("state", signedState);
          return res.json({ url: oauthUrl.toString() });
      }
      catch (error: any) {
          console.error("Error generating email accounts OAuth URL:", error);
          return res.status(500).json({ message: error.message || "Failed to generate OAuth URL" });
      }
  });
}

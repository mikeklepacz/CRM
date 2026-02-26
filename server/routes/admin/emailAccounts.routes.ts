import type { Express } from "express";
import { storage } from "../../storage";

type Deps = {
  isAdmin: any;
  isAuthenticatedCustom: any;
  getEffectiveTenantId: (req: any) => Promise<string | null>;
};

export function registerAdminEmailAccountsRoutes(app: Express, deps: Deps): void {
  app.get("/api/email-accounts", deps.isAuthenticatedCustom, async (req: any, res) => {
    try {
      const tenantId = await deps.getEffectiveTenantId(req);
      if (!tenantId) {
        return res.status(400).json({ message: "No tenant associated with user" });
      }

      const tenantIntegrations = await storage.getUserIntegrationsWithGmailByTenant(tenantId);

      for (const integration of tenantIntegrations) {
        const existingAccount = await storage.getEmailAccountByEmail(tenantId, integration.googleCalendarEmail!);
        if (!existingAccount) {
          try {
            await storage.createEmailAccount({
              tenantId,
              email: integration.googleCalendarEmail!,
              accessToken: integration.googleCalendarAccessToken,
              refreshToken: integration.googleCalendarRefreshToken || undefined,
              tokenExpiry: integration.googleCalendarTokenExpiry || undefined,
              status: "active",
              connectedBy: integration.userId,
            });
          } catch (err: any) {
            if (!err.message?.includes("unique") && !err.code?.includes("23505")) {
              console.warn("Failed to auto-import email account:", integration.googleCalendarEmail, err.message);
            }
          }
        }
      }

      const accounts = await storage.listEmailAccounts(tenantId);
      const safeAccounts = accounts.map((acc) => ({
        id: acc.id,
        email: acc.email,
        status: acc.status,
        dailySendCount: acc.dailySendCount,
        lastSendCountReset: acc.lastSendCountReset,
        connectedAt: acc.connectedAt,
        lastUsedAt: acc.lastUsedAt,
        errorMessage: acc.errorMessage,
      }));

      res.json(safeAccounts);
    } catch (error: any) {
      console.error("Error listing email accounts:", error);
      res.status(500).json({ message: error.message || "Failed to list email accounts" });
    }
  });

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
      const scope =
        "https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/userinfo.email";

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
    } catch (error: any) {
      console.error("Error generating email accounts OAuth URL:", error);
      return res.status(500).json({ message: error.message || "Failed to generate OAuth URL" });
    }
  });

  app.get("/api/email-accounts/callback", async (req: any, res) => {
    try {
      const { code, state } = req.query;
      if (!code || !state) {
        return res.send('<script>alert("Missing authorization code"); window.close();</script>');
      }

      let stateData;
      try {
        stateData = JSON.parse(state as string);
      } catch {
        console.error("Email accounts OAuth: Invalid state format");
        return res.send('<script>alert("Invalid state parameter"); window.close();</script>');
      }

      const { payload, sig } = stateData;
      if (!payload || !sig || !payload.userId || !payload.tenantId || !payload.nonce) {
        console.error("Email accounts OAuth: Missing state fields");
        return res.send('<script>alert("Invalid state parameter"); window.close();</script>');
      }

      const integration = await storage.getSystemIntegration("google_sheets");
      if (!integration?.googleClientId || !integration?.googleClientSecret) {
        return res.send('<script>alert("OAuth credentials not configured"); window.close();</script>');
      }

      const { createHmac } = await import("crypto");
      const expectedSig = createHmac("sha256", integration.googleClientSecret)
        .update(JSON.stringify(payload))
        .digest("hex");

      if (sig !== expectedSig) {
        console.error("Email accounts OAuth: State signature mismatch - possible CSRF attack");
        return res.send('<script>alert("Security validation failed"); window.close();</script>');
      }

      const { userId, tenantId } = payload;
      const redirectUri = `${req.protocol}://${req.get("host")}/api/email-accounts/callback`;
      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code: code as string,
          client_id: integration.googleClientId,
          client_secret: integration.googleClientSecret,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
      });

      if (!tokenResponse.ok) {
        const error = await tokenResponse.text();
        console.error("Email account token exchange failed:", error);
        return res.send('<script>alert("Authentication failed"); window.close();</script>');
      }

      const tokens = await tokenResponse.json();
      const userinfoResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      const userinfo = await userinfoResponse.json();

      const existingAccount = await storage.getEmailAccountByEmail(tenantId, userinfo.email);
      if (existingAccount) {
        await storage.updateEmailAccount(existingAccount.id, tenantId, {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token || existingAccount.refreshToken,
          tokenExpiry: Date.now() + tokens.expires_in * 1000,
          status: "active",
          errorMessage: null,
        });
        console.log(`Email account ${userinfo.email} reconnected for tenant ${tenantId}`);
        return res.send('<script>alert("Email account reconnected successfully!"); window.close();</script>');
      }

      await storage.createEmailAccount({
        tenantId,
        email: userinfo.email,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        tokenExpiry: Date.now() + tokens.expires_in * 1000,
        status: "active",
        connectedBy: userId,
      });

      console.log(`New email account ${userinfo.email} connected for tenant ${tenantId}`);
      res.send('<script>alert("Email account connected successfully!"); window.close();</script>');
    } catch (error: any) {
      console.error("Email accounts OAuth callback error:", error);
      res.send('<script>alert("Connection failed"); window.close();</script>');
    }
  });

  app.delete("/api/email-accounts/:id", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const tenantId = await deps.getEffectiveTenantId(req);
      if (!tenantId) {
        return res.status(400).json({ message: "No tenant associated with user" });
      }

      const deleted = await storage.deleteEmailAccount(id, tenantId);
      if (!deleted) {
        return res.status(404).json({ message: "Email account not found" });
      }

      res.json({ message: "Email account disconnected successfully" });
    } catch (error: any) {
      console.error("Error deleting email account:", error);
      res.status(500).json({ message: error.message || "Failed to disconnect email account" });
    }
  });

  app.patch("/api/email-accounts/:id", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const tenantId = await deps.getEffectiveTenantId(req);
      if (!tenantId) {
        return res.status(400).json({ message: "No tenant associated with user" });
      }

      if (!["active", "inactive"].includes(status)) {
        return res.status(400).json({ message: 'Invalid status. Use "active" or "inactive"' });
      }

      const updated = await storage.updateEmailAccount(id, tenantId, { status });
      if (!updated) {
        return res.status(404).json({ message: "Email account not found" });
      }

      res.json({
        id: updated.id,
        email: updated.email,
        status: updated.status,
        dailySendCount: updated.dailySendCount,
      });
    } catch (error: any) {
      console.error("Error updating email account:", error);
      res.status(500).json({ message: error.message || "Failed to update email account" });
    }
  });
}

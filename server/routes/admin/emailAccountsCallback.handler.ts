import { storage } from "../../storage";

export async function handleEmailAccountsCallback(req: any, res: any): Promise<any> {
  try {
    const { code, state } = req.query;
    if (!code || !state) {
      return res.send('<script>alert("Missing authorization code"); window.close();</script>');
    }
    let stateData;
    try {
      stateData = JSON.parse(state as string);
    }
    catch {
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
  }
  catch (error: any) {
    console.error("Email accounts OAuth callback error:", error);
    res.send('<script>alert("Connection failed"); window.close();</script>');
  }
}

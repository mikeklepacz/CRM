import { z } from "zod";
import { storage } from "../../storage";

const googleOAuthSchema = z.object({
  clientId: z.string().min(1, "Client ID is required"),
  clientSecret: z.string().min(1, "Client Secret is required"),
});

class GoogleSheetsAuthHttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "GoogleSheetsAuthHttpError";
  }
}

function getUserId(authUser: any): string {
  return authUser.isPasswordAuth ? authUser.id : authUser.claims.sub;
}

export function isGoogleSheetsAuthHttpError(error: unknown): error is { status: number; message: string } {
  return error instanceof GoogleSheetsAuthHttpError;
}

export async function getGoogleSheetsSettings(authUser: any): Promise<any> {
  const integration = await storage.getSystemIntegration("google_sheets");
  await storage.getUser(getUserId(authUser));

  return {
    clientId: integration?.googleClientId || "",
    clientSecret: integration?.googleClientSecret || "",
    googleEmail: integration?.googleEmail || null,
    connected: !!(integration?.googleAccessToken && integration?.googleRefreshToken),
    connectedByEmail: integration?.connectedByEmail || null,
    connectedAt: integration?.createdAt || null,
  };
}

export async function updateGoogleSheetsSettings(body: any): Promise<void> {
  const validation = googleOAuthSchema.safeParse(body);
  if (!validation.success) {
    throw new GoogleSheetsAuthHttpError(400, validation.error.errors[0].message);
  }

  const { clientId, clientSecret } = validation.data;
  await storage.updateSystemIntegration("google_sheets", {
    googleClientId: clientId,
    googleClientSecret: clientSecret,
  });
}

export async function createGoogleSheetsOauthUrl(params: {
  authUser: any;
  protocol: string;
  host: string;
}): Promise<string> {
  const { authUser, protocol, host } = params;
  const integration = await storage.getSystemIntegration("google_sheets");
  if (!integration?.googleClientId) {
    throw new GoogleSheetsAuthHttpError(
      400,
      "Please configure Google Sheets OAuth credentials first in Admin Dashboard"
    );
  }

  const redirectUri = `${protocol}://${host}/api/auth/google/sheets/callback`;
  const scope = "https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive";

  const userId = getUserId(authUser);
  const user = await storage.getUser(userId);

  const oauthUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  oauthUrl.searchParams.set("client_id", integration.googleClientId);
  oauthUrl.searchParams.set("redirect_uri", redirectUri);
  oauthUrl.searchParams.set("response_type", "code");
  oauthUrl.searchParams.set("scope", scope);
  oauthUrl.searchParams.set("access_type", "offline");
  oauthUrl.searchParams.set("prompt", "consent");
  oauthUrl.searchParams.set("state", JSON.stringify({ userId, email: user?.email }));

  return oauthUrl.toString();
}

export async function processGoogleSheetsOauthCallback(params: {
  code: unknown;
  state: unknown;
  protocol: string;
  host: string;
}): Promise<string> {
  const { code, state, protocol, host } = params;
  if (!code || !state) {
    return '<script>window.close();</script>';
  }

  const { userId } = JSON.parse(String(state));
  const integration = await storage.getSystemIntegration("google_sheets");
  if (!integration?.googleClientId || !integration?.googleClientSecret) {
    return '<script>alert("OAuth credentials not configured"); window.close();</script>';
  }

  const redirectUri = `${protocol}://${host}/api/auth/google/sheets/callback`;
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code: String(code),
      client_id: integration.googleClientId,
      client_secret: integration.googleClientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenResponse.ok) {
    const error = await tokenResponse.text();
    console.error("❌ Google Sheets token exchange failed:", error);
    return '<script>alert("Authentication failed"); window.close();</script>';
  }

  const tokens = await tokenResponse.json();
  const userinfoResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  const userinfo = await userinfoResponse.json();

  const expiryTimestamp = Date.now() + tokens.expires_in * 1000;
  await storage.updateSystemIntegration("google_sheets", {
    googleAccessToken: tokens.access_token,
    googleRefreshToken: tokens.refresh_token,
    googleTokenExpiry: expiryTimestamp,
    googleEmail: userinfo.email,
    connectedBy: userId,
    connectedAt: new Date(),
  });

  console.log("✅ Google Sheets connected successfully (system-wide)");
  return '<script>alert("Google Sheets connected successfully! All agents can now access client data."); window.close();</script>';
}

export async function disconnectGoogleSheets(): Promise<void> {
  await storage.deleteSystemIntegration("google_sheets");
}

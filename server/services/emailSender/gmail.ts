import { google, gmail_v1 } from "googleapis";
import { replaceImagePlaceholders } from "../../utils/imageUtils";
import { storage } from "../../storage";
import { EmailOptions, EmailResponse } from "./types";

function mimeEncodeSubject(subject: string): string {
  const hasNonAscii = /[^\x00-\x7F]/.test(subject);
  if (!hasNonAscii) {
    return subject;
  }
  const encoded = Buffer.from(subject, "utf8").toString("base64");
  return `=?UTF-8?B?${encoded}?=`;
}

export async function sendEmail(options: EmailOptions): Promise<EmailResponse> {
  try {
    const integration = await storage.getUserIntegration(options.userId);
    if (!integration?.googleCalendarAccessToken) {
      throw new Error("Gmail not connected. Please connect Gmail first.");
    }

    const systemIntegration = await storage.getSystemIntegration("google_sheets");
    if (!systemIntegration?.googleClientId || !systemIntegration?.googleClientSecret) {
      throw new Error("System OAuth not configured");
    }

    let accessToken = integration.googleCalendarAccessToken;

    if (integration.googleCalendarTokenExpiry && integration.googleCalendarTokenExpiry < Date.now()) {
      if (!integration.googleCalendarRefreshToken) {
        throw new Error("Gmail token expired. Please reconnect Gmail.");
      }

      const refreshResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: systemIntegration.googleClientId,
          client_secret: systemIntegration.googleClientSecret,
          refresh_token: integration.googleCalendarRefreshToken,
          grant_type: "refresh_token",
        }),
      });

      if (!refreshResponse.ok) {
        throw new Error("Failed to refresh Gmail token");
      }

      const tokens = await refreshResponse.json();
      accessToken = tokens.access_token;

      await storage.updateUserIntegration(options.userId, {
        googleCalendarAccessToken: accessToken,
        googleCalendarTokenExpiry: Date.now() + tokens.expires_in * 1000,
      });
    }

    const oauth2Client = new google.auth.OAuth2(systemIntegration.googleClientId, systemIntegration.googleClientSecret);

    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: integration.googleCalendarRefreshToken,
    });

    const gmail = google.gmail({ version: "v1", auth: oauth2Client });

    return sendEmailWithGmailClient(gmail, {
      to: options.to,
      subject: options.subject,
      body: options.body,
      threadId: options.threadId,
      inReplyTo: options.inReplyTo,
      references: options.references,
    });
  } catch (error: any) {
    return { success: false, error: error.message || "Unknown error" };
  }
}

export async function getGmailClientForEmailAccount(emailAccountId: string, tenantId: string): Promise<{ gmail: gmail_v1.Gmail; email: string }> {
  const account = await storage.getEmailAccount(emailAccountId, tenantId);
  if (!account) throw new Error("Email account not found");
  if (account.status !== "active") throw new Error("Email account is not active");
  if (!account.accessToken) throw new Error("Email account not connected");

  const systemIntegration = await storage.getSystemIntegration("google_sheets");
  if (!systemIntegration?.googleClientId || !systemIntegration?.googleClientSecret) {
    throw new Error("System OAuth not configured");
  }

  let accessToken = account.accessToken;

  if (account.tokenExpiry && account.tokenExpiry < Date.now()) {
    if (!account.refreshToken) throw new Error("Email account token expired");

    const refreshResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: systemIntegration.googleClientId,
        client_secret: systemIntegration.googleClientSecret,
        refresh_token: account.refreshToken,
        grant_type: "refresh_token",
      }),
    });

    if (!refreshResponse.ok) throw new Error("Failed to refresh email account token");
    const tokens = await refreshResponse.json();
    accessToken = tokens.access_token;

    await storage.updateEmailAccount(emailAccountId, tenantId, {
      accessToken,
      tokenExpiry: Date.now() + tokens.expires_in * 1000,
    });
  }

  const oauth2Client = new google.auth.OAuth2(systemIntegration.googleClientId, systemIntegration.googleClientSecret);
  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: account.refreshToken,
  });

  return { gmail: google.gmail({ version: "v1", auth: oauth2Client }), email: account.email };
}

export async function sendEmailWithGmailClient(
  gmail: gmail_v1.Gmail,
  options: { to: string; subject: string; body: string; threadId?: string; inReplyTo?: string; references?: string },
): Promise<EmailResponse> {
  try {
    const headers: string[] = [
      `To: ${options.to}`,
      `Subject: ${mimeEncodeSubject(options.subject)}`,
      "Content-Type: text/html; charset=utf-8",
    ];

    if (options.inReplyTo) headers.push(`In-Reply-To: ${options.inReplyTo}`);
    if (options.references) headers.push(`References: ${options.references}`);

    const processedBody = replaceImagePlaceholders(options.body);
    const email = [...headers, "", processedBody].join("\r\n");

    const encodedEmail = Buffer.from(email)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    const requestBody: any = { raw: encodedEmail };
    if (options.threadId) requestBody.threadId = options.threadId;

    const response = await gmail.users.messages.send({ userId: "me", requestBody });

    const gmailMessageId = response.data.id;
    const gmailThreadId = response.data.threadId;

    let rfc822MessageId: string | undefined;
    if (gmailMessageId) {
      try {
        const message = await gmail.users.messages.get({
          userId: "me",
          id: gmailMessageId,
          format: "full",
        });

        const msgHeaders = message.data.payload?.headers || [];
        const msgIdHeader = msgHeaders.find((h) => h.name?.toLowerCase() === "message-id");
        if (msgIdHeader?.value) rfc822MessageId = msgIdHeader.value;
      } catch {}
    }

    return {
      success: true,
      messageId: gmailMessageId ?? undefined,
      threadId: gmailThreadId ?? undefined,
      rfc822MessageId,
    };
  } catch (error: any) {
    return { success: false, error: error.message || "Unknown error" };
  }
}

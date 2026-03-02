import type { GmailMessage } from "./types";

export function extractEmailBody(payload: any): string {
  if (!payload) return "";

  if (payload.body?.data) {
    return Buffer.from(payload.body.data, "base64").toString("utf-8");
  }

  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === "text/plain" && part.body?.data) {
        return Buffer.from(part.body.data, "base64").toString("utf-8");
      }
    }

    for (const part of payload.parts) {
      if (part.mimeType === "text/html" && part.body?.data) {
        return Buffer.from(part.body.data, "base64").toString("utf-8");
      }
    }

    for (const part of payload.parts) {
      if (part.parts) {
        const body = extractEmailBody(part);
        if (body) return body;
      }
    }
  }

  return "";
}

export async function fetchSentMessages(accessToken: string): Promise<GmailMessage[]> {
  try {
    const listResponse = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?q=in:sent&maxResults=500`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!listResponse.ok) {
      console.error(`[ReplyScanner] Failed to list sent messages: ${listResponse.status}`);
      return [];
    }

    const listData = await listResponse.json();
    const messageIds = (listData.messages || []).map((m: any) => m.id);

    const messages: GmailMessage[] = [];
    const batchSize = 20;

    for (let i = 0; i < messageIds.length; i += batchSize) {
      const batch = messageIds.slice(i, i + batchSize);
      const batchPromises = batch.map(async (msgId: string) => {
        try {
          const msgResponse = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msgId}`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          });

          if (!msgResponse.ok) {
            return null;
          }

          const msgData = await msgResponse.json();
          const headers = msgData.payload?.headers || [];

          const toHeader = headers.find((h: any) => h.name.toLowerCase() === "to");
          const subjectHeader = headers.find((h: any) => h.name.toLowerCase() === "subject");

          if (!toHeader?.value) {
            return null;
          }

          const emailMatch = toHeader.value.match(/<([^>]+)>/) || [null, toHeader.value];
          const toEmail = emailMatch[1]?.trim().toLowerCase();

          if (!toEmail) {
            return null;
          }

          const body = extractEmailBody(msgData.payload);

          return {
            id: msgData.id,
            threadId: msgData.threadId,
            internalDate: msgData.internalDate,
            to: toEmail,
            subject: subjectHeader?.value,
            body,
          };
        } catch (error) {
          console.error(`[ReplyScanner] Error fetching message ${msgId}:`, error);
          return null;
        }
      });

      const batchResults = await Promise.all(batchPromises);
      messages.push(...batchResults.filter((m): m is GmailMessage => m !== null));
    }

    return messages;
  } catch (error: any) {
    console.error("[ReplyScanner] Error fetching sent messages:", error);
    return [];
  }
}

export async function checkForReplies(messageId: string, threadId: string, accessToken: string): Promise<boolean> {
  try {
    const threadResponse = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/threads/${threadId}?format=full`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!threadResponse.ok) {
      console.error(`[ReplyScanner] Failed to fetch thread ${threadId}: ${threadResponse.status}`);
      return false;
    }

    const thread = await threadResponse.json();
    const messages = thread.messages || [];

    if (messages.length <= 1) {
      return false;
    }

    const profileResponse = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/profile", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!profileResponse.ok) {
      console.error("[ReplyScanner] Failed to fetch Gmail profile");
      return false;
    }

    const profile = await profileResponse.json();
    const senderEmail = profile.emailAddress.toLowerCase();

    for (const msg of messages) {
      const headers = msg.payload?.headers || [];
      const fromHeader = headers.find((h: any) => h.name.toLowerCase() === "from");

      if (fromHeader?.value) {
        const emailMatch = fromHeader.value.match(/<([^>]+)>/) || [null, fromHeader.value];
        const fromEmail = emailMatch[1]?.trim().toLowerCase() || fromHeader.value.toLowerCase();

        if (fromEmail !== senderEmail) {
          return true;
        }
      }
    }

    return false;
  } catch (error: any) {
    console.error("[ReplyScanner] Error checking for replies:", error);
    return false;
  }
}

export async function refreshAccessToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string,
): Promise<string | null> {
  try {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });

    if (!response.ok) {
      console.error("[ReplyScanner] Token refresh failed:", await response.text());
      return null;
    }

    const tokens = await response.json();
    return tokens.access_token;
  } catch (error: any) {
    console.error("[ReplyScanner] Error refreshing token:", error);
    return null;
  }
}

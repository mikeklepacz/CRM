import { google } from "googleapis";
import { storage } from "../../storage";
import { FailureNotificationParams } from "./types";

export async function sendFailureNotification(params: FailureNotificationParams): Promise<void> {
  const { recipientEmail, recipientId, sequenceName, sequenceId, tenantId, errorReason, emailAccountId } = params;

  try {
    const adminTenantId = await storage.getAdminTenantId();
    const adminUser = await storage.getUserByEmail("michael@naturalmaterials.eu");

    if (!adminUser) {
      console.error("[EmailSender] Cannot send failure notification: admin user not found");
      return;
    }

    const notificationTitle = "Email Send Failed";
    const notificationMessage = `Failed to send email to ${recipientEmail} from sequence "${sequenceName}". Reason: ${errorReason}`;

    await (storage as any).createNotification({
      tenantId: adminTenantId || tenantId,
      userId: adminUser.id,
      notificationType: "email_failure",
      title: notificationTitle,
      message: notificationMessage,
      priority: "high",
      metadata: {
        recipientEmail,
        recipientId,
        sequenceId,
        sequenceName,
        emailAccountId,
        errorReason,
        failedAt: new Date().toISOString(),
      },
    });

    try {
      const adminIntegration = await storage.getUserIntegration(adminUser.id);
      if (adminIntegration?.googleCalendarAccessToken) {
        const systemIntegration = await storage.getSystemIntegration("google_sheets");
        if (systemIntegration?.googleClientId && systemIntegration?.googleClientSecret) {
          const oauth2Client = new google.auth.OAuth2(systemIntegration.googleClientId, systemIntegration.googleClientSecret);
          oauth2Client.setCredentials({
            access_token: adminIntegration.googleCalendarAccessToken,
            refresh_token: adminIntegration.googleCalendarRefreshToken,
          });

          const gmail = google.gmail({ version: "v1", auth: oauth2Client });

          const emailBody = `
<h2>Email Send Failed</h2>
<p><strong>Recipient:</strong> ${recipientEmail}</p>
<p><strong>Sequence:</strong> ${sequenceName}</p>
<p><strong>Error:</strong> ${errorReason}</p>
<p><strong>Email Account ID:</strong> ${emailAccountId || "Not assigned"}</p>
<p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
<p>The recipient has been bumped to the next available slot.</p>
          `.trim();

          const headers = [
            "To: michael@naturalmaterials.eu",
            `Subject: [E-Hub Alert] Email Send Failed - ${sequenceName}`,
            "Content-Type: text/html; charset=utf-8",
          ];

          const email = [...headers, "", emailBody].join("\r\n");
          const encodedEmail = Buffer.from(email)
            .toString("base64")
            .replace(/\+/g, "-")
            .replace(/\//g, "_")
            .replace(/=+$/, "");

          await gmail.users.messages.send({ userId: "me", requestBody: { raw: encodedEmail } });
          console.log("[EmailSender] Failure notification email sent to michael@naturalmaterials.eu");
        }
      }
    } catch (emailError: any) {
      console.error(`[EmailSender] Could not send failure notification email: ${emailError.message}`);
    }
  } catch (error: any) {
    console.error(`[EmailSender] Failed to create failure notification: ${error.message}`);
  }
}

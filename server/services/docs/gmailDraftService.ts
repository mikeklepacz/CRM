import { updateCommissionTrackerStatus } from "../commissionTrackerUpdate";
import { enrollManualFollowUpRecipient } from "../followup/manualDraftEnrollmentService";
import { storage } from "../../storage";
import { replaceImagePlaceholders } from "../../utils/imageUtils";
import { getOrCreateGmailLabels } from "./gmailDraftLabelsService";

export async function createGmailDraft(params: {
  authUser: any;
  body: any;
}): Promise<{
  success: boolean;
  draftId: string;
  message: string;
  labelsApplied: boolean;
  labelWarning: string | null;
}> {
  const { authUser, body } = params;
  const userId = authUser.isPasswordAuth ? authUser.id : authUser.claims.sub;
  const { to, subject, body: emailBody, clientLink } = body;

  if (!to || !subject || !emailBody) {
    throw new Error("Missing required fields: to, subject, body");
  }

  const anyBracketPattern = /\[[^\]]+\]/;
  if (anyBracketPattern.test(to) || anyBracketPattern.test(subject) || anyBracketPattern.test(emailBody)) {
    throw new Error(
      "Email contains invalid bracket-style placeholders like [recipient email]. Please use {{variable}} format instead."
    );
  }

  if (!to.includes("@") || to.includes("{{") || to.includes("}}")) {
    throw new Error("Invalid email address or unreplaced placeholder in To field.");
  }

  const integration = await storage.getUserIntegration(userId);
  if (!integration?.googleCalendarAccessToken) {
    throw new Error("Gmail not connected. Please connect Gmail in Settings.");
  }

  const systemIntegration = await storage.getSystemIntegration("google_sheets");
  if (!systemIntegration?.googleClientId || !systemIntegration?.googleClientSecret) {
    throw new Error("System OAuth not configured. Please contact administrator.");
  }

  let accessToken = integration.googleCalendarAccessToken;
  if (integration.googleCalendarTokenExpiry && integration.googleCalendarTokenExpiry < Date.now()) {
    if (!integration.googleCalendarRefreshToken) {
      throw new Error("Gmail token expired. Please reconnect Gmail in Settings.");
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
      const errorText = await refreshResponse.text();
      console.error("[Gmail] Token refresh failed:", {
        status: refreshResponse.status,
        error: errorText,
      });
      throw new Error("Failed to refresh Gmail token. Please reconnect Gmail in Settings.");
    }

    const tokens = await refreshResponse.json();
    accessToken = tokens.access_token;
    const newExpiry = Date.now() + tokens.expires_in * 1000;
    await storage.updateUserIntegration(userId, {
      googleCalendarAccessToken: accessToken,
      googleCalendarTokenExpiry: newExpiry,
    });
  }

  const processedBody = replaceImagePlaceholders(emailBody);
  const hasHtmlTags = /<[a-z][\s\S]*>/i.test(processedBody);
  const isHtml = processedBody !== emailBody || hasHtmlTags;
  const htmlBody = isHtml ? processedBody.replace(/\n/g, "<br>\n") : processedBody;

  const emailContent = [
    "MIME-Version: 1.0",
    `Content-Type: ${isHtml ? "text/html" : "text/plain"}; charset=UTF-8`,
    `To: ${to}`,
    `Subject: ${subject}`,
    "",
    htmlBody,
  ].join("\r\n");

  const encodedMessage = Buffer.from(emailContent)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const draftResponse = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/drafts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: {
        raw: encodedMessage,
      },
    }),
  });

  if (!draftResponse.ok) {
    const error = await draftResponse.text();
    console.error("Gmail API error:", error);
    throw new Error("Failed to create Gmail draft");
  }

  const draft = await draftResponse.json();
  console.log("📧 [GMAIL] ✅ Draft created successfully. Draft ID:", draft.id, "Message ID:", draft.message.id);

  if (clientLink) {
    console.log('📧 [GMAIL] Updating Commission Tracker status to "Emailed" for link:', clientLink);
    const currentUser = await storage.getUser(userId);
    const agentName = currentUser?.agentName || "";
    const trackerResult = await updateCommissionTrackerStatus(clientLink, agentName, "Emailed", authUser.tenantId);

    if (trackerResult.success) {
      console.log(`📧 [GMAIL] ✅ Commission Tracker updated: ${trackerResult.message}${trackerResult.created ? " (new row created)" : ""}`);
    } else {
      console.warn(`📧 [GMAIL] ⚠️ Commission Tracker update failed: ${trackerResult.message}`);
    }
  }

  try {
    console.log("📧 [MANUAL FOLLOW-UPS] Auto-enrolling recipient in system sequence...");
    const enrollmentResult = await enrollManualFollowUpRecipient({
      tenantId: authUser.tenantId,
      userId,
      recipientEmail: to,
      subject,
      body: emailBody,
      clientLink: clientLink || null,
      threadId: draft.message.threadId || null,
      messageId: draft.message.id || null,
      enforceClientLink: false,
      respectBlacklistPreference: false,
      updateSentStats: true,
      setExplicitTimestamps: false,
    });

    if (enrollmentResult.enrolled) {
      console.log(`📧 [MANUAL FOLLOW-UPS] ✅ Enrolled ${to} at currentStep=1 (awaiting_reply). Original email saved as Step 1. Message ID: ${draft.message.id}`);
    } else if (enrollmentResult.reason === "already_enrolled") {
      console.log(`📧 [MANUAL FOLLOW-UPS] ℹ️ Recipient ${to} already enrolled. Skipping auto-enrollment.`);
    }
  } catch (enrollError: any) {
    console.error("📧 [MANUAL FOLLOW-UPS] ❌ Auto-enrollment failed:", enrollError);
  }

  console.log("📧 [GMAIL] Fetching user settings to check for Gmail labels...");
  const user = await storage.getUser(userId);

  let labelsApplied = false;
  let labelWarning: string | null = null;

  if (user?.gmailLabels && user.gmailLabels.length > 0) {
    console.log("📧 [GMAIL] 🏷️  User has configured labels:", user.gmailLabels);
    console.log("📧 [GMAIL] Starting label application process...");
    try {
      const labelIds = await getOrCreateGmailLabels(accessToken, user.gmailLabels);
      if (labelIds.length > 0) {
        console.log(`📧 [GMAIL] Attempting to apply ${labelIds.length} labels to draft message...`);
        const modifyResponse = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${draft.message.id}/modify`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ addLabelIds: labelIds }),
          }
        );

        if (modifyResponse.ok) {
          const result = await modifyResponse.json();
          console.log(`📧 [GMAIL] ✅ Successfully applied ${labelIds.length} labels to draft`);
          console.log("📧 [GMAIL] Modified message now has labels:", result.labelIds);
          labelsApplied = true;
        } else {
          const errorText = await modifyResponse.text();
          console.error("📧 [GMAIL] ❌ Failed to apply labels to draft. Status:", modifyResponse.status);
          console.error("📧 [GMAIL] Error details:", errorText);
          if (modifyResponse.status === 403 || errorText.includes("insufficient") || errorText.includes("permission")) {
            labelWarning =
              "Draft created but labels could not be applied. You may need to reconnect Gmail in Settings to grant label permissions.";
          } else {
            labelWarning = "Draft created but labels could not be applied. Please check server logs for details.";
          }
        }
      } else {
        console.log("📧 [GMAIL] ⚠️  No label IDs returned from getOrCreateGmailLabels. Labels will not be applied.");
        labelWarning = "Draft created but configured labels could not be found or created.";
      }
    } catch (error: any) {
      console.error("📧 [GMAIL] ❌ Error during label application:", error);
      labelWarning = `Draft created but labels could not be applied: ${error.message}`;
    }
  } else {
    console.log("📧 [GMAIL] ℹ️  No Gmail labels configured for this user. Skipping label application.");
  }

  return {
    success: true,
    draftId: draft.id,
    message: labelsApplied
      ? `Gmail draft created successfully with ${user?.gmailLabels?.length || 0} labels applied`
      : labelWarning
        ? `${labelWarning}`
        : "Gmail draft created successfully",
    labelsApplied,
    labelWarning,
  };
}

import { google } from "googleapis";
import OpenAI from "openai";

type Deps = {
  googleSheets: {
    readSheetData: (spreadsheetId: string, range: string) => Promise<any[][]>;
    writeSheetData: (spreadsheetId: string, range: string, values: any[][]) => Promise<any>;
  };
  storage: any;
};

function columnLetter(index: number): string {
  return String.fromCharCode(65 + index);
}

async function unregisterGoogleCalendarWebhook(storage: any, userId: string, context: string) {
  try {
    const integration = await storage.getUserIntegration(userId);
    if (
      !integration?.googleCalendarWebhookChannelId ||
      !integration?.googleCalendarWebhookResourceId ||
      !integration?.googleCalendarAccessToken
    ) {
      return;
    }

    const oauth2Client = new google.auth.OAuth2(integration.googleClientId, integration.googleClientSecret);
    oauth2Client.setCredentials({
      access_token: integration.googleCalendarAccessToken,
      refresh_token: integration.googleCalendarRefreshToken || undefined,
    });

    await google.calendar({ version: "v3", auth: oauth2Client }).channels.stop({
      requestBody: {
        id: integration.googleCalendarWebhookChannelId,
        resourceId: integration.googleCalendarWebhookResourceId,
      },
    });

    await storage.updateUserIntegration(userId, {
      googleCalendarWebhookChannelId: undefined,
      googleCalendarWebhookResourceId: undefined,
      googleCalendarWebhookExpiry: undefined,
    });

    console.log(`[${context}] Unregistered Google Calendar webhook for user ${userId}`);
  } catch (error: any) {
    console.error(`[${context}] Failed to unregister webhook for user ${userId}:`, error.message);
  }
}

async function releaseUnclosedListings(deps: Deps, tenantId: string, userAgentName: string) {
  const sheets = await deps.storage.getAllActiveGoogleSheets(tenantId);
  const trackerSheet = sheets.find((s: any) => s.sheetPurpose === "commissions");
  const storeDbSheet = sheets.find((s: any) => s.sheetPurpose === "Store Database");
  if (!trackerSheet || !storeDbSheet) return { releasedCount: 0, protectedCount: 0 };

  let releasedCount = 0;
  let protectedCount = 0;

  const trackerRows = await deps.googleSheets.readSheetData(trackerSheet.spreadsheetId, `${trackerSheet.sheetName}!A:ZZ`);
  if (trackerRows.length === 0) return { releasedCount, protectedCount };

  const headers = trackerRows[0];
  const agentNameIndex = headers.findIndex((h: string) => h.toLowerCase() === "agent name");
  const transactionIdIndex = headers.findIndex((h: string) => h.toLowerCase() === "transaction id");
  const statusIndex = headers.findIndex((h: string) => h.toLowerCase() === "status");
  if (agentNameIndex === -1) return { releasedCount, protectedCount };

  for (let i = 1; i < trackerRows.length; i++) {
    const row = trackerRows[i];
    const rowAgentName = (row[agentNameIndex] || "").toString().toLowerCase().trim();
    const transactionId = row[transactionIdIndex] || "";
    if (rowAgentName !== userAgentName.toLowerCase().trim()) continue;

    if (transactionId) {
      protectedCount++;
      continue;
    }

    const rowIndex = i + 1;
    await deps.googleSheets.writeSheetData(
      trackerSheet.spreadsheetId,
      `${trackerSheet.sheetName}!${columnLetter(agentNameIndex)}${rowIndex}`,
      [[""]]
    );

    if (statusIndex !== -1) {
      await deps.googleSheets.writeSheetData(
        trackerSheet.spreadsheetId,
        `${trackerSheet.sheetName}!${columnLetter(statusIndex)}${rowIndex}`,
        [["7 – Warm"]]
      );
    }

    releasedCount++;
  }

  return { releasedCount, protectedCount };
}

async function deleteUserOpenAiFiles(storage: any, tenantId: string, userId: string) {
  try {
    const openaiSettings = await storage.getOpenaiSettings(tenantId);
    if (!openaiSettings?.apiKey) return;

    const allFiles = await storage.getAllKnowledgeBaseFiles(tenantId);
    const userFiles = allFiles.filter((file: any) => file.uploadedBy === userId);
    if (userFiles.length === 0) return;

    const openai = new OpenAI({ apiKey: openaiSettings.apiKey });
    for (const file of userFiles) {
      try {
        if (file.openaiFileId) {
          await (openai.files as any).del(file.openaiFileId);
          console.log(`[Delete User] Deleted OpenAI file ${file.openaiFileId} (${file.originalName})`);
        }
      } catch (fileError: any) {
        console.error(`[Delete User] Failed to delete OpenAI file ${file.openaiFileId}:`, fileError.message);
      }
    }
  } catch (openaiError: any) {
    console.error("[Delete User] Failed to delete OpenAI files:", openaiError.message);
  }
}

export function createDeactivateUserHandler(deps: Deps) {
  return async (req: any, res: any) => {
    try {
      const { userId } = req.params;
      const user = await deps.storage.getUser(userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      await deps.storage.updateUser(userId, { isActive: false });
      await unregisterGoogleCalendarWebhook(deps.storage, userId, "Deactivate");

      const { releasedCount, protectedCount } = await releaseUnclosedListings(
        deps,
        (req.user as any).tenantId,
        user.agentName || ""
      );

      res.json({
        message: `User deactivated successfully. Released ${releasedCount} unclosed listings. Protected ${protectedCount} listings with transactions.`,
        releasedCount,
        protectedCount,
      });
    } catch (error: any) {
      console.error("Error deactivating user:", error);
      res.status(500).json({ message: error.message || "Failed to deactivate user" });
    }
  };
}

export function createReactivateUserHandler(storage: any) {
  return async (req: any, res: any) => {
    try {
      const { userId } = req.params;
      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      await storage.updateUser(userId, { isActive: true });
      res.json({ message: "User reactivated successfully" });
    } catch (error: any) {
      console.error("Error reactivating user:", error);
      res.status(500).json({ message: error.message || "Failed to reactivate user" });
    }
  };
}

export function createDeleteUserHandler(storage: any) {
  return async (req: any, res: any) => {
    try {
      const adminUserId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const { userId } = req.params;
      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ message: "User not found" });
      if (userId === adminUserId) return res.status(400).json({ message: "You cannot delete your own account" });

      console.log(`[Delete User] Starting permanent deletion of user ${userId} (${user.email})`);
      await unregisterGoogleCalendarWebhook(storage, userId, "Delete User");
      await deleteUserOpenAiFiles(storage, req.user.tenantId, userId);
      await storage.deleteUser(userId);

      console.log(`[Delete User] Successfully deleted user ${userId} (${user.email})`);
      res.json({ message: `User ${user.email} has been permanently deleted along with all their data.` });
    } catch (error: any) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: error.message || "Failed to delete user" });
    }
  };
}

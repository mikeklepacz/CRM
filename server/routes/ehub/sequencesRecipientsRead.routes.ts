import type { Express } from "express";
import { normalizeLink } from "../../../shared/linkUtils";
import * as googleSheets from "../../googleSheets";
import { storage } from "../../storage";

export function registerEhubSequencesRecipientsReadRoutes(
  app: Express,
  deps: { isAdmin: any; isAuthenticatedCustom: any }
): void {
  app.get("/api/sequences/:id/recipients", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { contactedStatus, limit } = req.query;

      const recipients = await storage.getRecipients(id, {});

      const sheets = await storage.getAllActiveGoogleSheets((req.user as any).tenantId);
      const trackerSheet = sheets.find((s) => s.sheetPurpose === "commissions");

      if (!trackerSheet) {
        console.error("[E-Hub Recipients] No Commission Tracker found");
        return res.status(503).json({
          message: "Commission Tracker sheet not configured. Please set up the tracker sheet before using E-Hub."
        });
      }

      const { spreadsheetId, sheetName } = trackerSheet;
      const range = `${sheetName}!A:ZZ`;
      const rows = await googleSheets.readSheetData(spreadsheetId, range);

      if (rows.length === 0) {
        console.error("[E-Hub Recipients] Commission Tracker sheet is empty");
        return res.status(503).json({
          message: "Commission Tracker sheet is empty. Please ensure headers are configured."
        });
      }

      const headers = rows[0];
      const linkIndex = headers.findIndex((h) => h?.toString().toLowerCase() === "link");
      const statusIndex = headers.findIndex((h) => h?.toString().toLowerCase() === "status");
      const pocIndex = headers.findIndex((h) => h?.toString().toLowerCase() === "point of contact");
      const pocEmailIndex = headers.findIndex((h) => h?.toString().toLowerCase() === "poc email");
      const salesSummaryIndex = headers.findIndex((h) => h?.toString().toLowerCase() === "sales-ready summary");

      if (linkIndex === -1) {
        console.error("[E-Hub Recipients] Link column not found in Commission Tracker");
        return res.status(503).json({
          message: "Link column not found in Commission Tracker. Please ensure the sheet has a \"Link\" column."
        });
      }

      type TrackerData = {
        status: string;
        name: string | null;
        link: string | null;
        salesSummary: string | null;
      };

      const linkDataMap = new Map<string, TrackerData>();
      const emailDataMap = new Map<string, TrackerData>();

      for (let i = 1; i < rows.length; i++) {
        const rowLink = rows[i][linkIndex];
        const rowEmail = pocEmailIndex !== -1 ? rows[i][pocEmailIndex] : null;
        const trackerData: TrackerData = {
          status: statusIndex !== -1 ? (rows[i][statusIndex]?.toString().trim() || "") : "",
          name: pocIndex !== -1 ? (rows[i][pocIndex]?.toString().trim() || null) : null,
          link: rowLink ? rowLink.toString().trim() : null,
          salesSummary: salesSummaryIndex !== -1 ? (rows[i][salesSummaryIndex]?.toString().trim() || null) : null,
        };

        if (rowLink) {
          const normalizedLink = normalizeLink(rowLink.toString().trim());
          linkDataMap.set(normalizedLink, trackerData);
        }

        if (rowEmail) {
          const normalizedEmail = rowEmail.toString().trim().toLowerCase();
          emailDataMap.set(normalizedEmail, trackerData);
        }
      }

      const enrichedRecipients = recipients.map((recipient) => {
        let trackerData: TrackerData | undefined;

        if (recipient.link) {
          const normalizedRecipientLink = normalizeLink(recipient.link.trim());
          trackerData = linkDataMap.get(normalizedRecipientLink);
        }

        if (!trackerData && recipient.email) {
          const normalizedEmail = recipient.email.trim().toLowerCase();
          trackerData = emailDataMap.get(normalizedEmail);
        }

        let recipientContactedStatus: any;
        const recipientStatus = recipient.status?.toLowerCase() || "";
        if (recipientStatus === "replied") {
          recipientContactedStatus = "replied";
        } else if (recipientStatus === "bounced") {
          recipientContactedStatus = "bounced";
        } else if (recipientStatus === "in_sequence") {
          recipientContactedStatus = "in_sequence";
        } else if (!trackerData) {
          recipientContactedStatus = "unknown";
        } else if (trackerData.status.trim().toLowerCase() === "contacted") {
          recipientContactedStatus = "contacted";
        } else {
          recipientContactedStatus = "not contacted";
        }

        return {
          ...recipient,
          name: trackerData?.name || recipient.name,
          link: trackerData?.link || recipient.link,
          salesSummary: trackerData?.salesSummary || recipient.salesSummary,
          contactedStatus: recipientContactedStatus,
          trackerStatus: trackerData?.status || null
        };
      });

      let filtered = enrichedRecipients;
      if (contactedStatus) {
        filtered = enrichedRecipients.filter((r) =>
          r.contactedStatus.toLowerCase() === contactedStatus.toString().toLowerCase()
        );
      }

      if (limit) {
        const limitNum = parseInt(limit.toString());
        filtered = filtered.slice(0, limitNum);
      }

      res.json(filtered);
    } catch (error: any) {
      console.error("Error getting recipients:", error);
      res.status(500).json({ message: error.message || "Failed to get recipients" });
    }
  });

  app.post("/api/sequences/:id/test-send", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { testEmail } = req.body;

      if (!testEmail) {
        return res.status(400).json({ message: "Test email address required" });
      }

      const sequence = await storage.getSequence(id, req.user.tenantId);
      if (!sequence) {
        return res.status(404).json({ message: "Sequence not found" });
      }

      const userIntegration = await storage.getUserIntegration(req.user.id);
      if (!userIntegration?.googleAccessToken) {
        return res.status(400).json({ message: "Gmail not connected" });
      }

      res.json({
        success: true,
        message: "Test send functionality will be implemented in the next task",
        testEmail,
      });
    } catch (error: any) {
      console.error("Error sending test email:", error);
      res.status(500).json({ message: error.message || "Failed to send test email" });
    }
  });
}

import { v4 as uuidv4 } from "uuid";
import * as googleSheets from "../../googleSheets";
import { storage } from "../../storage";

export function buildSequencesSyntheticTestHandler() {
  return async (req: any, res: any) => {
    try {
      const { id } = req.params;

      const sequence = await storage.getSequence(id, req.user.tenantId);
      if (!sequence) {
        return res.status(404).json({ message: "Sequence not found" });
      }

      const finalizedStrategy = (sequence as any).finalizedStrategy;
      if (!finalizedStrategy || finalizedStrategy.trim() === "") {
        return res.status(422).json({
          message: "Campaign Brief is required before testing. Complete \"Finalize Strategy\" in the Strategy tab first."
        });
      }

      console.log("[SyntheticTest] Sequence strategy status:", {
        hasFinalizedStrategy: !!(sequence as any).finalizedStrategy,
        finalizedStrategyPreview: (sequence as any).finalizedStrategy?.substring(0, 100),
        hasStrategyTranscript: !!sequence.strategyTranscript,
        transcriptMessageCount: sequence.strategyTranscript?.messages?.length || 0,
      });

      if (!sequence.stepDelays || sequence.stepDelays.length === 0) {
        return res.status(400).json({ message: "Sequence has no steps configured. Set up step delays first." });
      }

      const ehubSettings = await storage.getEhubSettings(req.user.tenantId);
      if (!ehubSettings) {
        return res.status(500).json({ message: "E-Hub settings not configured" });
      }

      console.log("[SyntheticTest] Fetching random real store from Store Database...");

      const storeSheet = await storage.getGoogleSheetByPurpose("Store Database", (req.user as any).tenantId);
      if (!storeSheet) {
        return res.status(500).json({ message: "Store Database not configured" });
      }

      const storeData = await googleSheets.readSheetData(
        storeSheet.spreadsheetId,
        `${storeSheet.sheetName}!A:ZZ`
      );

      if (!storeData || storeData.length < 2) {
        return res.status(500).json({ message: "No stores found in Store Database" });
      }

      const headers = storeData[0].map((h: string) => h.toLowerCase().trim());
      const rows = storeData.slice(1).filter((row: any[]) => {
        const emailIndex = headers.indexOf("email");
        return emailIndex !== -1 && row[emailIndex] && row[emailIndex].includes("@");
      });

      if (rows.length === 0) {
        return res.status(500).json({ message: "No valid stores with emails found" });
      }

      const randomRow = rows[Math.floor(Math.random() * rows.length)];

      const nameIndex = headers.indexOf("name");
      const stateIndex = headers.indexOf("state");
      const hoursIndex = headers.indexOf("hours");
      const linkIndex = headers.indexOf("link");
      const salesSummaryIndex = headers.indexOf("sales-ready summary");

      const realName = nameIndex !== -1 ? (randomRow[nameIndex] || "Unknown Store") : "Unknown Store";
      const realLink = linkIndex !== -1 ? (randomRow[linkIndex] || null) : null;
      const realSalesSummary = salesSummaryIndex !== -1 ? (randomRow[salesSummaryIndex] || null) : null;
      const realHours = hoursIndex !== -1 ? (randomRow[hoursIndex] || "9:00 AM - 5:00 PM") : "9:00 AM - 5:00 PM";
      const realState = stateIndex !== -1 ? (randomRow[stateIndex] || null) : null;

      let timezone = "America/New_York";
      if (realState) {
        const { detectTimezone } = await import("../../services/timezoneHours");
        const detected = detectTimezone(realState);
        if (detected) {
          timezone = detected;
        }
      }

      const tenantId = req.user.tenantId;
      const testRecipientId = uuidv4();
      const testEmail = `synthetic-test-${Date.now()}@test.local`;

      const testRecipient = {
        id: testRecipientId,
        tenantId,
        sequenceId: id,
        email: testEmail,
        name: realName,
        link: realLink,
        salesSummary: realSalesSummary,
        businessHours: realHours,
        timezone: timezone,
        status: "paused",
        currentStep: 0,
        eligibleAt: new Date("2099-12-31"),
        scheduledAt: null,
        nextSendAt: null,
        threadId: null,
        messageId: null,
        repliedAt: null,
        replyCount: 0,
        contactedStatus: "not contacted",
        trackerStatus: null,
        createdAt: new Date(),
      };

      await storage.addRecipients([testRecipient] as any);

      try {
        const { personalizeEmailWithAI } = await import("../../services/emailSender");
        const generatedEmails: Array<{ stepNumber: number; subject: string; body: string }> = [];

        const stepCount = sequence.stepDelays.length;
        for (let stepIndex = 0; stepIndex < stepCount; stepIndex++) {
          const stepNumber = stepIndex + 1;

          const { subject, body } = await personalizeEmailWithAI(
            testRecipient as any,
            { subject: undefined, body: undefined },
            sequence.strategyTranscript || null,
            {
              promptInjection: ehubSettings.promptInjection || "",
              keywordBin: ehubSettings.keywordBin || "",
              signature: "",
            },
            stepNumber,
            (sequence as any).finalizedStrategy || null,
            req.user.tenantId,
          );

          await storage.createRecipientMessage({
            recipientId: testRecipientId,
            sequenceId: id,
            stepNumber,
            subject,
            body,
            sentAt: new Date(),
            threadId: null,
            messageId: null,
            tenantId: req.user.tenantId,
          } as any);

          generatedEmails.push({ stepNumber, subject, body });
        }

        await storage.deleteRecipientMessages(testRecipientId);
        await storage.removeRecipient(testRecipientId);

        res.json({
          emails: generatedEmails,
          storeContext: {
            name: realName,
            link: realLink,
            salesSummary: realSalesSummary,
            state: realState,
            timezone: timezone,
          }
        });
      } catch (generationError: any) {
        try {
          await storage.deleteRecipientMessages(testRecipientId);
          await storage.removeRecipient(testRecipientId);
        } catch (cleanupError) {
          console.error("[SyntheticTest] Failed to clean up test data:", cleanupError);
        }
        throw generationError;
      }
    } catch (error: any) {
      console.error("[SyntheticTest] Error generating synthetic emails:", error);
      res.status(500).json({ message: error.message || "Failed to generate synthetic email preview" });
    }
  };
}

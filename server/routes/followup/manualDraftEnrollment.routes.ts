import type { Express } from "express";
import { enrollManualFollowUpRecipient } from "../../services/followup/manualDraftEnrollmentService";

export function registerManualDraftEnrollmentRoutes(
  app: Express,
  deps: { isAuthenticatedCustom: any }
): void {
  app.post("/api/email-drafts", deps.isAuthenticatedCustom, async (req: any, res) => {
    try {
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const { recipientEmail, subject, body, clientLink } = req.body;

      if (!recipientEmail) {
        return res.status(400).json({ message: "Recipient email is required" });
      }

      if (clientLink) {
        try {
          await enrollManualFollowUpRecipient({
            tenantId: req.user.tenantId,
            userId,
            recipientEmail,
            subject,
            body,
            clientLink,
            enforceClientLink: true,
            respectBlacklistPreference: true,
            updateSentStats: false,
            setExplicitTimestamps: true,
          });
        } catch (enrollError: any) {
          console.error("[ManualFollowUps] Error auto-enrolling recipient:", enrollError);
          return res.status(500).json({ message: enrollError.message || "Failed to enroll recipient" });
        }
      }

      res.json({ success: true, message: "Draft processed" });
    } catch (error: any) {
      console.error("Error enrolling recipient:", error);
      res.status(500).json({ message: error.message || "Failed to enroll recipient" });
    }
  });
}

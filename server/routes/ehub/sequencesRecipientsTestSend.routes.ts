import type { Express } from "express";
import { storage } from "../../storage";
import type { SequencesRecipientsReadDeps } from "./sequencesRecipientsRead.types";

export function registerSequencesRecipientsTestSendRoute(app: Express, deps: SequencesRecipientsReadDeps): void {
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

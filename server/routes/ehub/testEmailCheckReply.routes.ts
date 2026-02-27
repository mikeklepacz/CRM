import type { Express } from "express";
import type { TestEmailRouteDeps } from "./testEmail.types";
import { storage } from "../../storage";

export function registerTestEmailCheckReplyRoute(app: Express, deps: TestEmailRouteDeps): void {
  app.get('/api/test-email/check-reply/:id', deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
      try {
          const { id } = req.params;
          const testSend = await storage.getTestEmailSendById(id);
          if (!testSend) {
              return res.status(404).json({ message: 'Test email not found' });
          }
          if (testSend.createdBy !== req.user.id) {
              return res.status(403).json({ message: 'Forbidden: Not your test email' });
          }
          if (!testSend.gmailThreadId) {
              return res.status(400).json({ message: 'No thread ID available for this test email' });
          }
          const { checkForReplies } = await import('../../services/gmailReplyDetection');
          const replyResult = await checkForReplies(req.user.id, testSend.gmailThreadId);
          if (replyResult.hasReply && !testSend.replyDetectedAt) {
              await storage.updateTestEmailSendStatus(id, {
                  status: 'replied',
                  replyDetectedAt: new Date(),
                  lastCheckedAt: new Date(),
              });
          }
          else {
              await storage.updateTestEmailSendStatus(id, {
                  lastCheckedAt: new Date(),
              });
          }
          res.json({
              success: true,
              hasReply: replyResult.hasReply,
              replyCount: replyResult.replyCount,
              replies: replyResult.replies,
          });
      }
      catch (error: any) {
          console.error('Error checking for replies:', error);
          res.status(500).json({ message: error.message || 'Failed to check for replies' });
      }
  });
}

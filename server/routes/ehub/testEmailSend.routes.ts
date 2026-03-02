import type { Express } from "express";
import type { TestEmailRouteDeps } from "./testEmail.types";
import { storage } from "../../storage";

export function registerTestEmailSendRoute(app: Express, deps: TestEmailRouteDeps): void {
  app.post('/api/test-email/send', deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
      try {
          const userId = req.user?.id;
          if (!userId) {
              return res.status(401).json({ message: 'Unauthorized' });
          }
          const { recipientEmail, subject, body } = req.body;
          if (!recipientEmail || !subject || !body) {
              return res.status(400).json({ message: 'recipientEmail, subject, and body are required' });
          }
          const userIntegration = await storage.getUserIntegration(userId);
          if (!userIntegration?.googleCalendarAccessToken) {
              return res.status(400).json({ message: 'Gmail not connected. Please connect Gmail first.' });
          }
          const { sendEmail } = await import('../../services/emailSender');
          const sendResult = await sendEmail({
              userId,
              to: recipientEmail,
              subject,
              body,
          });
          if (!sendResult.success) {
              return res.status(500).json({ message: sendResult.error || 'Failed to send email' });
          }
          const testSend = await storage.createTestEmailSend({
              recipientEmail,
              subject,
              body,
              gmailThreadId: sendResult.threadId,
              gmailMessageId: sendResult.messageId,
              rfc822MessageId: sendResult.rfc822MessageId,
              status: 'sent',
              createdBy: userId,
              sentAt: new Date(),
              lastCheckedAt: null,
              replyDetectedAt: null,
              followUpCount: 0,
          } as any);
          res.json({
              success: true,
              testSend,
              message: 'Test email sent successfully',
          });
      }
      catch (error: any) {
          console.error('Error sending test email:', error);
          res.status(500).json({ message: error.message || 'Failed to send test email' });
      }
  });
}

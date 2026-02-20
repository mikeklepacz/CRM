import type { Express } from "express";
import { storage } from "../../storage";

export function registerTestEmailRoutes(
  app: Express,
  deps: { isAdmin: any; isAuthenticatedCustom: any }
): void {
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
      });

      res.json({
        success: true,
        testSend,
        message: 'Test email sent successfully',
      });
    } catch (error: any) {
      console.error('Error sending test email:', error);
      res.status(500).json({ message: error.message || 'Failed to send test email' });
    }
  });

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
      } else {
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
    } catch (error: any) {
      console.error('Error checking for replies:', error);
      res.status(500).json({ message: error.message || 'Failed to check for replies' });
    }
  });

  app.post('/api/test-email/send-followup/:id', deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { subject, body } = req.body;

      if (!subject || !body) {
        return res.status(400).json({ message: 'subject and body are required' });
      }

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

      const userIntegration = await storage.getUserIntegration(req.user.id);
      if (!userIntegration?.googleCalendarAccessToken) {
        return res.status(400).json({ message: 'Gmail not connected' });
      }

      const { getLatestMessageId, getAllMessageIds } = await import('../../services/gmailReplyDetection');
      const [latestMessageId, allMessageIds] = await Promise.all([
        getLatestMessageId(req.user.id, testSend.gmailThreadId),
        getAllMessageIds(req.user.id, testSend.gmailThreadId),
      ]);

      const { sendEmail } = await import('../../services/emailSender');
      const sendResult = await sendEmail({
        userId: req.user.id,
        to: testSend.recipientEmail,
        subject,
        body,
        threadId: testSend.gmailThreadId,
        inReplyTo: latestMessageId || undefined,
        references: allMessageIds.length > 0 ? allMessageIds.join(' ') : undefined,
      });

      if (!sendResult.success) {
        return res.status(500).json({ message: sendResult.error || 'Failed to send follow-up' });
      }

      await storage.updateTestEmailSendStatus(id, {
        followUpCount: (testSend.followUpCount || 0) + 1,
        lastCheckedAt: new Date(),
      });

      res.json({
        success: true,
        message: 'Follow-up sent successfully',
        threadId: sendResult.threadId,
      });
    } catch (error: any) {
      console.error('Error sending follow-up:', error);
      res.status(500).json({ message: error.message || 'Failed to send follow-up' });
    }
  });

  app.get('/api/test-email/history', deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const history = await storage.listTestEmailSendsForUser(userId);
      res.json(history);
    } catch (error: any) {
      console.error('Error getting test email history:', error);
      res.status(500).json({ message: error.message || 'Failed to get test email history' });
    }
  });

  app.get('/api/ehub/test-data/nuke/counts', deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const emailPattern = req.query.emailPattern as string | undefined;
      const counts = await storage.getTestDataNukeCounts(emailPattern);
      res.json(counts);
    } catch (error: any) {
      console.error('Error getting nuke counts:', error);
      res.status(500).json({ message: error.message || 'Failed to get nuke counts' });
    }
  });

  app.post('/api/ehub/test-data/nuke', deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const { emailPattern } = req.body;
      const result = await storage.nukeTestData(userId, req.user.tenantId, emailPattern);

      res.json({
        success: true,
        message: 'Test data deleted successfully',
        ...result,
      });
    } catch (error: any) {
      console.error('Error nuking test data:', error);
      res.status(500).json({ message: error.message || 'Failed to delete test data' });
    }
  });
}

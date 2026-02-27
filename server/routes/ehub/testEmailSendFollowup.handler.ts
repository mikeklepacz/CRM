import { storage } from "../../storage";

export async function handleTestEmailSendFollowup(req: any, res: any): Promise<any> {
  try {
    const { id } = req.params;
    const { subject, body } = req.body;
    if (!subject || !body) {
      return res.status(400).json({ message: "subject and body are required" });
    }

    const testSend = await storage.getTestEmailSendById(id);
    if (!testSend) {
      return res.status(404).json({ message: "Test email not found" });
    }

    if (testSend.createdBy !== req.user.id) {
      return res.status(403).json({ message: "Forbidden: Not your test email" });
    }

    if (!testSend.gmailThreadId) {
      return res.status(400).json({ message: "No thread ID available for this test email" });
    }

    const userIntegration = await storage.getUserIntegration(req.user.id);
    if (!userIntegration?.googleCalendarAccessToken) {
      return res.status(400).json({ message: "Gmail not connected" });
    }

    const { getLatestMessageId, getAllMessageIds } = await import("../../services/gmailReplyDetection");
    const [latestMessageId, allMessageIds] = await Promise.all([
      getLatestMessageId(req.user.id, testSend.gmailThreadId),
      getAllMessageIds(req.user.id, testSend.gmailThreadId),
    ]);

    const { sendEmail } = await import("../../services/emailSender");
    const sendResult = await sendEmail({
      userId: req.user.id,
      to: testSend.recipientEmail,
      subject,
      body,
      threadId: testSend.gmailThreadId,
      inReplyTo: latestMessageId || undefined,
      references: allMessageIds.length > 0 ? allMessageIds.join(" ") : undefined,
    });

    if (!sendResult.success) {
      return res.status(500).json({ message: sendResult.error || "Failed to send follow-up" });
    }

    await storage.updateTestEmailSendStatus(id, {
      followUpCount: (testSend.followUpCount || 0) + 1,
      lastCheckedAt: new Date(),
    } as any);

    res.json({
      success: true,
      message: "Follow-up sent successfully",
      threadId: sendResult.threadId,
    });
  } catch (error: any) {
    console.error("Error sending follow-up:", error);
    res.status(500).json({ message: error.message || "Failed to send follow-up" });
  }
}

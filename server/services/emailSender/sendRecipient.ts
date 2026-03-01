import { storage } from "../../storage";
import { updateCommissionTrackerStatus } from "../commissionTrackerUpdate";
import { assignSingleRecipient } from "../Matrix2/slotAssigner";
import { EmailResponse } from "./types";
import { personalizeEmailWithAI } from "./ai";
import { sendFailureNotification } from "./failureNotification";
import { getGmailClientForEmailAccount, sendEmailWithGmailClient } from "./gmail";

export async function sendEmailToRecipient(recipientId: string): Promise<boolean> {
  try {
    const recipient = await storage.getRecipientById(recipientId);
    if (!recipient) {
      return false;
    }

    const sequence = await storage.getSequenceById(recipient.sequenceId);
    if (!sequence) {
      return false;
    }

    const settings = await storage.getEhubSettings(sequence.tenantId);
    if (!settings) {
      return false;
    }

    const currentStep = (recipient.currentStep || 0) + 1;

    const { subject, body } = await personalizeEmailWithAI(
      recipient,
      {},
      sequence.strategyTranscript,
      {
        promptInjection: settings.promptInjection || undefined,
        keywordBin: settings.keywordBin || undefined,
        signature: (settings as any).signature || undefined,
      },
      currentStep,
      sequence.finalizedStrategy,
      sequence.tenantId,
    );

    let threadId: string | undefined;
    let inReplyTo: string | undefined;
    let references: string | undefined;

    if (currentStep > 1) {
      const previousMessages = await storage.getRecipientMessages(recipient.id);
      if (previousMessages.length > 0) {
        previousMessages.sort((a: any, b: any) => {
          const aStep = a.stepNumber ?? a.step_number ?? 0;
          const bStep = b.stepNumber ?? b.step_number ?? 0;
          return aStep - bStep;
        });
        const firstMessage = previousMessages[0] as any;
        const lastMessage = previousMessages[previousMessages.length - 1] as any;

        threadId = firstMessage.threadId || firstMessage.thread_id || undefined;
        inReplyTo = lastMessage.messageId || lastMessage.message_id || undefined;

        const rfc822Ids = (previousMessages as any[])
          .map((m) => m.messageId || m.message_id)
          .filter((id): id is string => !!id);
        if (rfc822Ids.length > 0) {
          references = rfc822Ids.join(" ");
        }
      }
    }

    let emailResult: EmailResponse;
    let usedEmailAccountId: string | null = null;

    if (!sequence.senderEmailAccountId) {
      const errorMsg = `No email account assigned to sequence "${sequence.name}"`;
      console.error(`[EmailSender] ${errorMsg} - recipient: ${recipient.email}`);

      await sendFailureNotification({
        recipientEmail: recipient.email,
        recipientId: recipient.id,
        sequenceName: sequence.name || "Unknown Sequence",
        sequenceId: sequence.id,
        tenantId: sequence.tenantId,
        errorReason: errorMsg,
      });

      return false;
    }

    try {
      const { gmail } = await getGmailClientForEmailAccount(sequence.senderEmailAccountId, sequence.tenantId);
      emailResult = await sendEmailWithGmailClient(gmail, {
        to: recipient.email,
        subject,
        body,
        threadId,
        inReplyTo,
        references,
      });
      usedEmailAccountId = sequence.senderEmailAccountId;
    } catch (emailAccountError: any) {
      const errorMsg = emailAccountError.message || "Unknown email account error";
      console.error(`[EmailSender] Email account failed for sequence "${sequence.name}": ${errorMsg}`);

      await sendFailureNotification({
        recipientEmail: recipient.email,
        recipientId: recipient.id,
        sequenceName: sequence.name || "Unknown Sequence",
        sequenceId: sequence.id,
        tenantId: sequence.tenantId,
        errorReason: `Email account error: ${errorMsg}`,
        emailAccountId: sequence.senderEmailAccountId,
      });

      return false;
    }

    if (!emailResult.success) {
      const errorMsg = emailResult.error || "Gmail send failed";
      console.error(`[EmailSender] Gmail send failed for ${recipient.email}: ${errorMsg}`);

      await sendFailureNotification({
        recipientEmail: recipient.email,
        recipientId: recipient.id,
        sequenceName: sequence.name || "Unknown Sequence",
        sequenceId: sequence.id,
        tenantId: sequence.tenantId,
        errorReason: errorMsg,
        emailAccountId: sequence.senderEmailAccountId,
      });

      return false;
    }

    const now = new Date();
    await storage.updateRecipient(recipient.id, {
      currentStep,
      lastStepSentAt: now,
      status: currentStep >= (sequence.stepDelays?.length || 0) && !sequence.repeatLastStep ? "completed" : "in_sequence",
      updatedAt: now,
      threadId: emailResult.threadId,
    });

    await storage.insertRecipientMessage({
      id: crypto.randomUUID(),
      tenantId: sequence.tenantId,
      recipientId: recipient.id,
      stepNumber: currentStep,
      subject,
      body,
      sentAt: now,
      gmailMessageId: emailResult.messageId,
      gmailThreadId: emailResult.threadId,
      rfc822MessageId: emailResult.rfc822MessageId,
    });

    try {
      await storage.incrementSequenceSentCount(sequence.id, sequence.tenantId);
    } catch (error) {}

    if (usedEmailAccountId) {
      try {
        await storage.incrementEmailAccountDailySendCount(usedEmailAccountId, sequence.tenantId);
      } catch (error) {}
    }

    if (recipient.link) {
      try {
        const sequenceCreator = await storage.getUserById(sequence.createdBy);
        const agentName = sequenceCreator?.agentName || "Unknown Agent";
        await updateCommissionTrackerStatus(recipient.link, agentName, "Emailed", sequence.tenantId);
      } catch (error) {}
    }

    if (recipient.status === "in_sequence" || currentStep < (sequence.stepDelays?.length || 0)) {
      try {
        await assignSingleRecipient(recipient.id);
      } catch (error) {}
    }

    return true;
  } catch (error: any) {
    return false;
  }
}

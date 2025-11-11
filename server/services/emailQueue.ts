
import { storage } from '../storage';
import { sendEmail, personalizeEmailWithAI } from './emailSender';

let isProcessing = false;

export async function startEmailQueueProcessor() {
  console.log('[EmailQueue] Starting email queue processor...');
  
  // Run every 60 seconds
  setInterval(async () => {
    if (isProcessing) {
      console.log('[EmailQueue] Skipping cycle - already processing');
      return;
    }

    await processEmailQueue();
  }, 60000);

  // Run immediately on startup
  await processEmailQueue();
}

async function processEmailQueue() {
  isProcessing = true;

  try {
    const settings = await storage.getEhubSettings();
    if (!settings) {
      console.log('[EmailQueue] No E-Hub settings configured');
      return;
    }

    // Check sending hours and weekends
    const now = new Date();
    const currentHour = now.getHours();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 6 = Saturday

    if (settings.skipWeekends && (dayOfWeek === 0 || dayOfWeek === 6)) {
      console.log('[EmailQueue] Skipping - weekend');
      return;
    }

    if (currentHour < settings.sendingHoursStart || currentHour >= settings.sendingHoursEnd) {
      console.log(`[EmailQueue] Outside sending hours (${settings.sendingHoursStart}-${settings.sendingHoursEnd})`);
      return;
    }

    // Get pending recipients ready to send
    const pendingRecipients = await storage.getNextRecipientsToSend(settings.dailyEmailLimit);
    
    if (pendingRecipients.length === 0) {
      console.log('[EmailQueue] No recipients ready to send');
      return;
    }

    console.log(`[EmailQueue] Found ${pendingRecipients.length} recipients to process`);

    for (const recipient of pendingRecipients) {
      try {
        // Get sequence details
        const sequence = await storage.getSequence(recipient.sequenceId);
        if (!sequence) {
          console.error(`[EmailQueue] Sequence ${recipient.sequenceId} not found`);
          continue;
        }

        // Personalize email
        const personalizedEmail = await personalizeEmailWithAI(
          recipient,
          { subject: sequence.subject, body: sequence.body },
          { promptInjection: settings.promptInjection || undefined, keywordBin: settings.keywordBin || undefined }
        );

        // Send email
        const result = await sendEmail({
          to: recipient.email,
          subject: personalizedEmail.subject,
          body: personalizedEmail.body,
        });

        if (result.success) {
          // Update recipient status
          await storage.updateRecipientStatus(recipient.id, {
            status: 'sent',
            sentAt: new Date(),
            gmailMessageId: result.messageId,
          });

          // Update sequence stats
          const currentStats = await storage.getSequence(sequence.id);
          await storage.updateSequenceStats(sequence.id, {
            sentCount: (currentStats?.sentCount || 0) + 1,
            lastSentAt: new Date(),
          });

          console.log(`[EmailQueue] ✅ Sent to ${recipient.email}`);

          // Random delay between sends (respect rate limits)
          const delayMs = (settings.minDelayMinutes + Math.random() * (settings.maxDelayMinutes - settings.minDelayMinutes)) * 60 * 1000;
          await new Promise(resolve => setTimeout(resolve, delayMs));
        } else {
          // Mark as failed
          await storage.updateRecipientStatus(recipient.id, {
            status: 'failed',
          });

          const currentStats = await storage.getSequence(sequence.id);
          await storage.updateSequenceStats(sequence.id, {
            failedCount: (currentStats?.failedCount || 0) + 1,
          });

          console.error(`[EmailQueue] ❌ Failed to send to ${recipient.email}: ${result.error}`);
        }
      } catch (error: any) {
        console.error(`[EmailQueue] Error processing recipient ${recipient.id}:`, error);
      }
    }
  } catch (error: any) {
    console.error('[EmailQueue] Error in queue processor:', error);
  } finally {
    isProcessing = false;
  }
}


import { storage } from '../storage';
import { sendEmail, personalizeEmailWithAI } from './emailSender';
import { computeOptimalSendTime } from './smartTiming';
import { addDays } from 'date-fns';

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

        // Personalize email using AI with strategy transcript
        const personalizedEmail = await personalizeEmailWithAI(
          recipient,
          { subject: sequence.subject, body: sequence.body },
          sequence.strategyTranscript || null,
          { 
            promptInjection: settings.promptInjection || undefined, 
            keywordBin: settings.keywordBin || undefined,
            signature: sequence.signature || undefined
          }
        );

        // Send email using sequence creator's Gmail credentials
        const result = await sendEmail({
          userId: sequence.createdBy,
          to: recipient.email,
          subject: personalizedEmail.subject,
          body: personalizedEmail.body,
        });

        if (result.success) {
          const now = new Date();
          const currentStep = (recipient.currentStep || 0) + 1; // Increment step (0 -> 1, 1 -> 2, etc.)
          
          // Parse stepDelays (convert from string[] to number[])
          const stepDelays = (sequence.stepDelays || []).map(d => parseFloat(d.toString()));
          
          // Calculate next send time using gap-based delays + smart timing
          // stepDelays[0] = initial delay before first send (used when recipient added)
          // stepDelays[1] = gap after first send, before second send
          // stepDelays[n] = gap after nth send, before (n+1)th send
          let nextSendAt = null;
          let recipientStatus: string = 'sent';
          
          // Check if there are more steps remaining
          if (currentStep < stepDelays.length) {
            // Schedule next step using stepDelays[currentStep] + smart timing
            const gapDays = stepDelays[currentStep];
            const baselineTime = addDays(now, gapDays);
            
            nextSendAt = computeOptimalSendTime({
              businessHours: recipient.businessHours || '',
              state: recipient.timezone || 'America/New_York',
              skipWeekends: settings.skipWeekends,
              baselineTime,
            });
            recipientStatus = 'in_sequence';
          } else if (currentStep === stepDelays.length && sequence.repeatLastStep) {
            // On last step with repeat enabled - schedule repeat using the last gap + smart timing
            const lastGapDays = stepDelays[stepDelays.length - 1];
            const baselineTime = addDays(now, lastGapDays);
            
            nextSendAt = computeOptimalSendTime({
              businessHours: recipient.businessHours || '',
              state: recipient.timezone || 'America/New_York',
              skipWeekends: settings.skipWeekends,
              baselineTime,
            });
            recipientStatus = 'in_sequence';
          } else {
            // Sequence complete
            recipientStatus = 'completed';
          }

          // Update recipient status
          await storage.updateRecipientStatus(recipient.id, {
            status: recipientStatus,
            currentStep,
            lastStepSentAt: now,
            nextSendAt,
            sentAt: recipient.sentAt || now, // Set sentAt only on first send
            threadId: result.threadId || recipient.threadId,
          });

          // Update sequence stats
          const currentStats = await storage.getSequence(sequence.id);
          await storage.updateSequenceStats(sequence.id, {
            sentCount: (currentStats?.sentCount || 0) + 1,
            lastSentAt: now,
          });

          console.log(`[EmailQueue] ✅ Sent step ${currentStep} to ${recipient.email}, next: ${nextSendAt ? nextSendAt.toISOString() : 'none'}`);

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

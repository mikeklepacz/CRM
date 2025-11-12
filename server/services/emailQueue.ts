
import { storage } from '../storage';
import { sendEmail, personalizeEmailWithAI } from './emailSender';
import { computeNextSendSlot } from './smartTiming';
import { resolveAdminWindow } from './emailSchedulingService';
import { addDays } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';

let isProcessing = false;

export async function startEmailQueueProcessor() {
  console.log('[EmailQueue] Starting email queue processor...');
  
  // Validate OpenAI API key at startup (REQUIRED - no fallback system)
  try {
    const openaiSettings = await storage.getOpenaiSettings();
    if (!openaiSettings?.apiKey) {
      console.error('[EmailQueue] ⛔ CRITICAL: No OpenAI API key configured!');
      console.error('[EmailQueue] ⛔ Email queue cannot operate without AI email generation.');
      console.error('[EmailQueue] ⛔ Configure OpenAI API key in Sales Assistant settings to enable email sending.');
      // Don't start the queue processor if no API key
      return;
    }
    console.log('[EmailQueue] ✅ OpenAI API key validated');
  } catch (error) {
    console.error('[EmailQueue] ⛔ Failed to validate OpenAI settings:', error);
    return;
  }
  
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

    const now = new Date();

    // Get pending recipients ready to send
    const pendingRecipients = await storage.getNextRecipientsToSend(settings.dailyEmailLimit);
    
    if (pendingRecipients.length === 0) {
      console.log('[EmailQueue] No recipients ready to send');
      return;
    }

    console.log(`[EmailQueue] Found ${pendingRecipients.length} recipients to process`);

    // Group recipients by sequence to batch admin window lookups
    const recipientsBySequence = new Map<string, typeof pendingRecipients>();
    for (const recipient of pendingRecipients) {
      if (!recipientsBySequence.has(recipient.sequenceId)) {
        recipientsBySequence.set(recipient.sequenceId, []);
      }
      recipientsBySequence.get(recipient.sequenceId)!.push(recipient);
    }

    console.log(`[EmailQueue] Processing ${recipientsBySequence.size} sequences`);

    // Process recipients grouped by sequence
    for (const [sequenceId, sequenceRecipients] of recipientsBySequence) {
      try {
        // Get sequence details
        const sequence = await storage.getSequence(sequenceId);
        if (!sequence) {
          console.error(`[EmailQueue] Sequence ${sequenceId} not found`);
          continue;
        }

        // Resolve admin window ONCE per sequence
        let adminWindow;
        try {
          adminWindow = await resolveAdminWindow(sequenceId, storage);
        } catch (adminError: any) {
          console.error(`[EmailQueue] ⚠️  Failed to resolve admin window for sequence ${sequenceId}: ${adminError.message}`);
          console.error(`[EmailQueue] ⚠️  Skipping ${sequenceRecipients.length} recipients in this sequence`);
          continue;
        }

        // Check if current time is within admin sending window
        const currentHourInAdminTz = parseInt(formatInTimeZone(now, adminWindow.timezone, 'H'), 10);
        const currentDayInAdminTz = parseInt(formatInTimeZone(now, adminWindow.timezone, 'i'), 10); // ISO day: 1=Mon, 7=Sun
        const isWeekend = currentDayInAdminTz === 6 || currentDayInAdminTz === 7; // 6=Sat, 7=Sun

        if (adminWindow.skipWeekends && isWeekend) {
          console.log(`[EmailQueue] Skipping sequence ${sequenceId} - weekend in admin timezone (${adminWindow.timezone})`);
          continue;
        }

        if (currentHourInAdminTz < adminWindow.startHour || currentHourInAdminTz >= adminWindow.endHour) {
          console.log(`[EmailQueue] Skipping sequence ${sequenceId} - outside sending hours (${adminWindow.startHour}-${adminWindow.endHour} in ${adminWindow.timezone}, current: ${currentHourInAdminTz})`);
          continue;
        }

        console.log(`[EmailQueue] ✅ Sequence ${sequenceId} within admin window, processing ${sequenceRecipients.length} recipients`);

        // Process each recipient in this sequence
        for (const recipient of sequenceRecipients) {
          try {

        // Personalize email using AI with strategy transcript (AI-only, no fallback)
        let personalizedEmail;
        try {
          personalizedEmail = await personalizeEmailWithAI(
            recipient,
            { subject: sequence.subject, body: sequence.body },
            sequence.strategyTranscript || null,
            { 
              promptInjection: settings.promptInjection || undefined, 
              keywordBin: settings.keywordBin || undefined,
              signature: sequence.signature || undefined
            }
          );
        } catch (aiError: any) {
          // Log AI error but DON'T update recipient status - keep them pending for retry
          console.error(`[EmailQueue] 🔄 AI generation failed for ${recipient.email}: ${aiError.message}`);
          console.error(`[EmailQueue] 🔄 Recipient will retry in next queue cycle`);
          continue; // Skip this recipient, don't mark as failed
        }

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
            // Schedule next step using dual-window scheduler (admin + recipient windows)
            const gapDays = stepDelays[currentStep];
            const baselineTime = addDays(now, gapDays);
            
            nextSendAt = computeNextSendSlot({
              baselineTime,
              adminTimezone: adminWindow.timezone,
              adminStartHour: adminWindow.startHour,
              adminEndHour: adminWindow.endHour,
              recipientBusinessHours: recipient.businessHours || '',
              recipientTimezone: recipient.timezone || 'America/New_York',
              skipWeekends: adminWindow.skipWeekends,
            });
            recipientStatus = 'in_sequence';
          } else if (currentStep === stepDelays.length && sequence.repeatLastStep) {
            // On last step with repeat enabled - schedule repeat using dual-window scheduler
            const lastGapDays = stepDelays[stepDelays.length - 1];
            const baselineTime = addDays(now, lastGapDays);
            
            nextSendAt = computeNextSendSlot({
              baselineTime,
              adminTimezone: adminWindow.timezone,
              adminStartHour: adminWindow.startHour,
              adminEndHour: adminWindow.endHour,
              recipientBusinessHours: recipient.businessHours || '',
              recipientTimezone: recipient.timezone || 'America/New_York',
              skipWeekends: adminWindow.skipWeekends,
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
    } // End of recipient loop
  } catch (error: any) {
    console.error(`[EmailQueue] Error processing sequence ${sequenceId}:`, error);
  }
} // End of sequence loop
  } catch (error: any) {
    console.error('[EmailQueue] Error in queue processor:', error);
  } finally {
    isProcessing = false;
  }
}

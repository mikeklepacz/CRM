
import { storage } from '../storage';
import { sendEmail, personalizeEmailWithAI } from './emailSender';
import { computeNextSendSlot } from './smartTiming';
import { resolveAdminWindow } from './emailSchedulingService';
import { addDays } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import * as googleSheets from '../googleSheets';
import { normalizeLink } from '../../shared/linkUtils';

let isProcessing = false;

/**
 * Check Commission Tracker for existing agent and ensure row exists
 * Returns { shouldSkip: boolean, reason?: string }
 * - If store has claimed agent -> shouldSkip: true
 * - If store unclaimed/new -> creates/updates row with Agent="Mike Klepacz", Status="Emailed", shouldSkip: false
 */
async function checkAndUpdateCommissionTracker(recipientLink: string, recipientEmail: string, recipientName: string): Promise<{ shouldSkip: boolean; reason?: string }> {
  try {
    // Find Commission Tracker sheet
    const sheets = await storage.getAllActiveGoogleSheets();
    const trackerSheet = sheets.find(s => s.sheetPurpose === 'commissions');
    
    if (!trackerSheet) {
      console.log('[CommissionTracker] No Commission Tracker configured - proceeding with email send');
      return { shouldSkip: false };
    }

    // Read Commission Tracker data
    const trackerRange = `${trackerSheet.sheetName}!A:ZZ`;
    const trackerRows = await googleSheets.readSheetData(trackerSheet.spreadsheetId, trackerRange);
    
    if (trackerRows.length === 0) {
      console.log('[CommissionTracker] Empty tracker sheet - proceeding with email send');
      return { shouldSkip: false };
    }

    const trackerHeaders = trackerRows[0];
    const linkIndex = trackerHeaders.findIndex(h => h.toLowerCase() === 'link');
    const agentIndex = trackerHeaders.findIndex(h => h.toLowerCase() === 'agent name');
    const statusIndex = trackerHeaders.findIndex(h => h.toLowerCase() === 'status');
    const storeNameIndex = trackerHeaders.findIndex(h => h.toLowerCase() === 'store name');
    const pocEmailIndex = trackerHeaders.findIndex(h => h.toLowerCase() === 'poc email');
    const claimDateIndex = trackerHeaders.findIndex(h => h.toLowerCase() === 'claim date');

    if (linkIndex === -1) {
      console.log('[CommissionTracker] ⚠️  No Link column found - proceeding with email send');
      return { shouldSkip: false };
    }

    if (agentIndex === -1) {
      console.warn('[CommissionTracker] ⚠️  No "Agent Name" column found - cannot check for existing claims or assign Mike Klepacz. Proceeding with email send.');
      return { shouldSkip: false };
    }

    // Look for existing row by normalized link
    const normalizedInputLink = normalizeLink(recipientLink);
    let existingRowIndex = -1;
    let existingAgent = '';

    for (let i = 1; i < trackerRows.length; i++) {
      const rowLink = trackerRows[i][linkIndex];
      if (rowLink && normalizeLink(rowLink) === normalizedInputLink) {
        existingRowIndex = i + 1; // 1-indexed for Google Sheets
        // Safe to access agentIndex now because we've verified it exists
        existingAgent = trackerRows[i][agentIndex] || '';
        break;
      }
    }

    // If row exists and has an agent, skip the email
    if (existingRowIndex !== -1 && existingAgent.trim()) {
      console.log(`[CommissionTracker] ⛔ Store already claimed by agent "${existingAgent}" - SKIPPING email to ${recipientEmail}`);
      return { 
        shouldSkip: true, 
        reason: `Store already claimed by ${existingAgent}` 
      };
    }

    // Row exists but no agent OR row doesn't exist - ensure row with "Mike Klepacz"
    const EHUB_AGENT = 'Mike Klepacz';
    const EHUB_STATUS = 'Emailed';
    const claimDate = new Date().toISOString();

    if (existingRowIndex !== -1) {
      // Update existing row with Mike Klepacz as agent
      console.log(`[CommissionTracker] ✅ Updating unclaimed row ${existingRowIndex} with Agent="${EHUB_AGENT}"`);
      
      const updates = [];
      if (agentIndex !== -1) {
        const agentCol = String.fromCharCode(65 + agentIndex);
        updates.push(googleSheets.writeSheetData(
          trackerSheet.spreadsheetId,
          `${trackerSheet.sheetName}!${agentCol}${existingRowIndex}`,
          [[EHUB_AGENT]]
        ));
      }
      if (statusIndex !== -1) {
        const statusCol = String.fromCharCode(65 + statusIndex);
        updates.push(googleSheets.writeSheetData(
          trackerSheet.spreadsheetId,
          `${trackerSheet.sheetName}!${statusCol}${existingRowIndex}`,
          [[EHUB_STATUS]]
        ));
      }
      if (claimDateIndex !== -1) {
        const claimDateCol = String.fromCharCode(65 + claimDateIndex);
        updates.push(googleSheets.writeSheetData(
          trackerSheet.spreadsheetId,
          `${trackerSheet.sheetName}!${claimDateCol}${existingRowIndex}`,
          [[claimDate]]
        ));
      }
      
      await Promise.all(updates);
    } else {
      // Create new row
      console.log(`[CommissionTracker] ✅ Creating new row with Agent="${EHUB_AGENT}" for ${recipientEmail}`);
      
      const newRow = new Array(trackerHeaders.length).fill('');
      if (linkIndex !== -1) newRow[linkIndex] = recipientLink;
      if (agentIndex !== -1) newRow[agentIndex] = EHUB_AGENT;
      if (statusIndex !== -1) newRow[statusIndex] = EHUB_STATUS;
      if (storeNameIndex !== -1) newRow[storeNameIndex] = recipientName;
      if (pocEmailIndex !== -1) newRow[pocEmailIndex] = recipientEmail;
      if (claimDateIndex !== -1) newRow[claimDateIndex] = claimDate;
      
      const appendRange = `${trackerSheet.sheetName}!A:ZZ`;
      await googleSheets.appendSheetData(trackerSheet.spreadsheetId, appendRange, [newRow]);
    }

    return { shouldSkip: false };
  } catch (error: any) {
    console.error(`[CommissionTracker] ❌ Error checking tracker: ${error.message}`);
    console.error(`[CommissionTracker] ⚠️  Proceeding with email send despite error`);
    // Don't block emails on tracker errors
    return { shouldSkip: false };
  }
}

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

        // Determine current step (before increment)
        const currentStepNumber = (recipient.currentStep || 0) + 1; // 0 -> 1, 1 -> 2, etc.

        // CHECK COMMISSION TRACKER: Skip if store is already claimed by another agent
        const trackerCheck = await checkAndUpdateCommissionTracker(
          recipient.link,
          recipient.email,
          recipient.name
        );

        if (trackerCheck.shouldSkip) {
          console.log(`[EmailQueue] ⛔ SKIPPED ${recipient.email}: ${trackerCheck.reason}`);
          // Mark recipient as skipped
          await storage.updateRecipient(recipient.id, { 
            status: 'skipped',
            nextSendAt: null // Clear next send time
          });
          continue; // Skip to next recipient
        }

        // For follow-ups, fetch first email's subject for threading
        let firstEmailSubject: string | null = null;
        if (currentStepNumber > 1) {
          const previousMessages = await storage.getRecipientMessages(recipient.id);
          const firstMessage = previousMessages.find(m => m.stepNumber === 1);
          if (firstMessage) {
            firstEmailSubject = firstMessage.subject;
          }
        }

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
            },
            currentStepNumber // Pass step number for context-aware generation
          );

          // OVERRIDE subject for follow-ups to ensure threading
          if (currentStepNumber > 1 && firstEmailSubject) {
            personalizedEmail.subject = `Re: ${firstEmailSubject}`;
            console.log(`[EmailQueue] 📧 Step ${currentStepNumber} - enforcing threaded subject: "${personalizedEmail.subject}"`);
          }
        } catch (aiError: any) {
          // Log AI error but DON'T update recipient status - keep them pending for retry
          console.error(`[EmailQueue] 🔄 AI generation failed for ${recipient.email}: ${aiError.message}`);
          console.error(`[EmailQueue] 🔄 Recipient will retry in next queue cycle`);
          continue; // Skip this recipient, don't mark as failed
        }

        // Send email using sequence creator's Gmail credentials
        // For follow-ups (step 2+), thread with previous email
        const result = await sendEmail({
          userId: sequence.createdBy,
          to: recipient.email,
          subject: personalizedEmail.subject,
          body: personalizedEmail.body,
          threadId: currentStepNumber > 1 ? recipient.threadId : undefined, // Thread for follow-ups
        });

        if (result.success) {
          const now = new Date();
          const currentStep = currentStepNumber; // Already calculated above
          
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
              clientWindowStartOffset: adminWindow.clientWindowStartOffset,
              clientWindowEndHour: adminWindow.clientWindowEndHour,
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
              clientWindowStartOffset: adminWindow.clientWindowStartOffset,
              clientWindowEndHour: adminWindow.clientWindowEndHour,
              skipWeekends: adminWindow.skipWeekends,
            });
            recipientStatus = 'in_sequence';
          } else {
            // Sequence complete
            recipientStatus = 'completed';
          }

          // Save sent email to sequenceRecipientMessages for AI context
          await storage.createRecipientMessage({
            recipientId: recipient.id,
            stepNumber: currentStep,
            subject: personalizedEmail.subject,
            body: personalizedEmail.body,
            threadId: result.threadId || recipient.threadId,
            messageId: result.rfc822MessageId || null,
          });

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

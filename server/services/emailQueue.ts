
import { storage } from '../storage';
import { sendEmail, personalizeEmailWithAI } from './emailSender';
import { addDays } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import * as googleSheets from '../googleSheets';
import { normalizeLink } from '../../shared/linkUtils';
import { generateDailySlots } from './Matrix2/slotGenerator';
import { runSlotAssigner } from './Matrix2/slotAssigner';
import { getReadyToSendSlots, markSlotSent } from './Matrix2/slotDb';

let isProcessing = false;

// Terminal statuses that block all emails (Step 1 and Step 2+)
const TERMINAL_STATUSES = [
  'Interested',
  'Sample Sent',
  'Closed Won',
  'Closed Lost',
  'Replied'
];

// Non-terminal statuses that allow Step 1 emails (claiming the store)
const STEP1_ALLOWED_STATUSES = [
  '', // blank
  'Claimed',
  'Emailed'
];

/**
 * STEP 1 VALIDATION: Check Commission Tracker for Step 1 (fresh/cold) emails
 * Returns { shouldSkip: boolean, reason?: string }
 * 
 * GREEN LIGHT (send Step 1):
 * - Store doesn't exist in tracker -> CREATE new row
 * - Status is blank/Claimed/Emailed -> UPDATE Agent="Mike Klepacz", Status="Emailed"
 * 
 * RED LIGHT (skip Step 1):
 * - Status is terminal (Interested/Sample Sent/Closed Won/Closed Lost/Replied)
 * - Status is Contacted/Follow-Up/Warm (manual sales work in progress)
 * - Agent is someone else (not blank, not Mike Klepacz)
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
    let existingStatus = '';

    for (let i = 1; i < trackerRows.length; i++) {
      const rowLink = trackerRows[i][linkIndex];
      if (rowLink && normalizeLink(rowLink) === normalizedInputLink) {
        existingRowIndex = i + 1; // 1-indexed for Google Sheets
        existingAgent = (trackerRows[i][agentIndex] || '').trim();
        existingStatus = statusIndex !== -1 ? (trackerRows[i][statusIndex] || '').trim() : '';
        break;
      }
    }

    const EHUB_AGENT = 'Mike Klepacz';
    const EHUB_STATUS = 'Emailed';

    // If row exists in Commission Tracker, validate based on Status and Agent
    if (existingRowIndex !== -1) {
      // Check if status is terminal (already a customer, not interested, etc.)
      if (TERMINAL_STATUSES.includes(existingStatus)) {
        console.log(`[CommissionTracker] ⛔ STEP 1 BLOCKED: Store has terminal status "${existingStatus}" - SKIPPING ${recipientEmail}`);
        return { 
          shouldSkip: true, 
          reason: `Store has terminal status: ${existingStatus}` 
        };
      }

      // Check for manual sales work statuses (Contacted, Follow-Up, Warm)
      const manualWorkStatuses = ['Contacted', 'Follow-Up', 'Warm'];
      if (manualWorkStatuses.includes(existingStatus)) {
        console.log(`[CommissionTracker] ⛔ STEP 1 BLOCKED: Store has manual status "${existingStatus}" - SKIPPING ${recipientEmail}`);
        return { 
          shouldSkip: true, 
          reason: `Manual sales work in progress: ${existingStatus}` 
        };
      }

      // ENFORCE ALLOWED STATUS WHITELIST: Only allow blank/Claimed/Emailed
      if (existingStatus && !STEP1_ALLOWED_STATUSES.includes(existingStatus)) {
        console.log(`[CommissionTracker] ⛔ STEP 1 BLOCKED: Store has disallowed status "${existingStatus}" - SKIPPING ${recipientEmail}`);
        return { 
          shouldSkip: true, 
          reason: `Disallowed status: ${existingStatus}` 
        };
      }

      // Check if another agent owns this store
      if (existingAgent && existingAgent !== EHUB_AGENT) {
        console.log(`[CommissionTracker] ⛔ STEP 1 BLOCKED: Store claimed by "${existingAgent}" - SKIPPING ${recipientEmail}`);
        return { 
          shouldSkip: true, 
          reason: `Store claimed by ${existingAgent}` 
        };
      }

      // GREEN LIGHT: Status is blank/Claimed/Emailed, update to Agent="Mike Klepacz", Status="Emailed"
      console.log(`[CommissionTracker] ✅ STEP 1 APPROVED: Updating row ${existingRowIndex} to Agent="${EHUB_AGENT}", Status="${EHUB_STATUS}"`);
      
      const updates = [];
      const claimDate = new Date().toISOString();
      
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
      return { shouldSkip: false };
    }

    // Store doesn't exist - CREATE new row
    console.log(`[CommissionTracker] ✅ STEP 1 APPROVED: Creating new row with Agent="${EHUB_AGENT}" for ${recipientEmail}`);
    
    const newRow = new Array(trackerHeaders.length).fill('');
    const claimDate = new Date().toISOString();
    
    if (linkIndex !== -1) newRow[linkIndex] = recipientLink;
    if (agentIndex !== -1) newRow[agentIndex] = EHUB_AGENT;
    if (statusIndex !== -1) newRow[statusIndex] = EHUB_STATUS;
    if (storeNameIndex !== -1) newRow[storeNameIndex] = recipientName;
    if (pocEmailIndex !== -1) newRow[pocEmailIndex] = recipientEmail;
    if (claimDateIndex !== -1) newRow[claimDateIndex] = claimDate;
    
    const appendRange = `${trackerSheet.sheetName}!A:ZZ`;
    await googleSheets.appendSheetData(trackerSheet.spreadsheetId, appendRange, [newRow]);

    return { shouldSkip: false };
  } catch (error: any) {
    console.error(`[CommissionTracker] ❌ Error checking tracker: ${error.message}`);
    console.error(`[CommissionTracker] ⚠️  Proceeding with email send despite error`);
    // Don't block emails on tracker errors
    return { shouldSkip: false };
  }
}

/**
 * STEP 2+ VALIDATION: Check Commission Tracker for follow-up emails
 * Returns { shouldSkip: boolean, reason?: string }
 * 
 * GREEN LIGHT (send follow-up):
 * - Agent="Mike Klepacz" AND Status="Emailed"
 * 
 * RED LIGHT (skip follow-up):
 * - Everything else (agent mismatch, terminal status, etc.)
 */
async function validateFollowUpEmail(recipientLink: string, recipientEmail: string): Promise<{ shouldSkip: boolean; reason?: string }> {
  try {
    // Find Commission Tracker sheet
    const sheets = await storage.getAllActiveGoogleSheets();
    const trackerSheet = sheets.find(s => s.sheetPurpose === 'commissions');
    
    if (!trackerSheet) {
      console.log('[CommissionTracker] No Commission Tracker configured - proceeding with follow-up send');
      return { shouldSkip: false };
    }

    // Read Commission Tracker data
    const trackerRange = `${trackerSheet.sheetName}!A:ZZ`;
    const trackerRows = await googleSheets.readSheetData(trackerSheet.spreadsheetId, trackerRange);
    
    if (trackerRows.length === 0) {
      console.log('[CommissionTracker] Empty tracker sheet - proceeding with follow-up send');
      return { shouldSkip: false };
    }

    const trackerHeaders = trackerRows[0];
    const linkIndex = trackerHeaders.findIndex(h => h.toLowerCase() === 'link');
    const agentIndex = trackerHeaders.findIndex(h => h.toLowerCase() === 'agent name');
    const statusIndex = trackerHeaders.findIndex(h => h.toLowerCase() === 'status');

    if (linkIndex === -1 || agentIndex === -1 || statusIndex === -1) {
      console.log('[CommissionTracker] ⚠️  Missing required columns - proceeding with follow-up send');
      return { shouldSkip: false };
    }

    // Look for existing row by normalized link
    const normalizedInputLink = normalizeLink(recipientLink);
    let existingAgent = '';
    let existingStatus = '';

    for (let i = 1; i < trackerRows.length; i++) {
      const rowLink = trackerRows[i][linkIndex];
      if (rowLink && normalizeLink(rowLink) === normalizedInputLink) {
        existingAgent = (trackerRows[i][agentIndex] || '').trim();
        existingStatus = (trackerRows[i][statusIndex] || '').trim();
        break;
      }
    }

    const EHUB_AGENT = 'Mike Klepacz';

    // Follow-ups only allowed if Agent="Mike Klepacz" AND Status="Emailed"
    if (existingAgent !== EHUB_AGENT) {
      console.log(`[CommissionTracker] ⛔ FOLLOW-UP BLOCKED: Agent is "${existingAgent}", not "${EHUB_AGENT}" - SKIPPING ${recipientEmail}`);
      return { 
        shouldSkip: true, 
        reason: `Not your lead (Agent: ${existingAgent || 'none'})` 
      };
    }

    if (existingStatus !== 'Emailed') {
      console.log(`[CommissionTracker] ⛔ FOLLOW-UP BLOCKED: Status is "${existingStatus}", not "Emailed" - SKIPPING ${recipientEmail}`);
      return { 
        shouldSkip: true, 
        reason: `Status changed to: ${existingStatus || 'blank'}` 
      };
    }

    console.log(`[CommissionTracker] ✅ FOLLOW-UP APPROVED: Agent="${EHUB_AGENT}", Status="Emailed" - SENDING to ${recipientEmail}`);
    return { shouldSkip: false };

  } catch (error: any) {
    console.error(`[CommissionTracker] ❌ Error validating follow-up: ${error.message}`);
    console.error(`[CommissionTracker] ⚠️  Proceeding with follow-up send despite error`);
    // Don't block emails on tracker errors
    return { shouldSkip: false };
  }
}

export async function startEmailQueueProcessor() {
  console.log('[EmailQueue] Starting email queue processor (real-time scheduling)...');
  
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
  
  // Run once at startup, queue will decide whether to sleep
  await processEmailQueue();

  // Run every 60 seconds, BUT the processor itself decides whether to sleep
  setInterval(async () => {
    if (isProcessing) return;
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
      return;
    }

    const now = new Date();

    // GLOBAL SENDING HOURS CHECK: Only run during admin's sending window
    // Get admin's timezone from first sequence creator (assumes single admin)
    const sequences = await storage.listSequences();
    if (sequences.length === 0) {
      return; // No sequences to process
    }

    const firstSequence = sequences[0];
    const userPrefs = await storage.getUserPreferences(firstSequence.createdBy);
    const adminTimezone = userPrefs?.timezone || 'America/New_York';
    
    const currentAdminHour = parseInt(formatInTimeZone(now, adminTimezone, 'H'));
    
    if (currentAdminHour < settings.sendingHoursStart || currentAdminHour >= settings.sendingHoursEnd) {
      console.log(`[EmailQueue] Sleeping (true sleep). Outside sending hours.`);
      // DO NOTHING — no DB reads, no Gmail checks, no tracker checks.
      return;
    }

    // MATRIX2: Generate and assign slots for today
    try {
      const todayUTC = formatInTimeZone(now, 'UTC', 'yyyy-MM-dd');
      console.log(`[EmailQueue] [Matrix2] Running slot generation and assignment for ${todayUTC}`);
      
      // Generate daily slots (this will skip if slots already exist for today)
      await generateDailySlots({
        slotsPerDay: settings.dailyRateLimit || 20,
        sendHourLocal: 16, // 4 PM default
        jitterMin: 12,
        jitterMax: 20,
      });
      
      // Assign recipients to empty slots
      await runSlotAssigner();
      
      console.log(`[EmailQueue] [Matrix2] Slot generation and assignment complete`);
    } catch (matrix2Error: any) {
      console.error(`[EmailQueue] [Matrix2] Error in slot generation/assignment: ${matrix2Error.message}`);
      // Continue with queue processing even if Matrix2 fails
    }

    // MATRIX2: Get ready-to-send slots (filled=TRUE, sent=FALSE, time<=now)
    const readySlots = await getReadyToSendSlots(10);
    
    if (readySlots.length === 0) {
      return;
    }

    console.log(`[EmailQueue] [Matrix2] Processing ${readySlots.length} ready-to-send slots`);

    // Process each ready slot
    for (const slot of readySlots) {
      try {
        // MATRIX2: Get recipient from slot
        if (!slot.recipientId) {
          console.error(`[EmailQueue] [Matrix2] Slot ${slot.id} has no recipientId`);
          await markSlotSent(slot.id); // Mark as sent to prevent reprocessing
          continue;
        }

        // Get recipient data
        const recipient = await storage.getRecipient(slot.recipientId);
        if (!recipient) {
          console.error(`[EmailQueue] [Matrix2] Recipient ${slot.recipientId} not found`);
          await markSlotSent(slot.id);
          continue;
        }

        // Get sequence details
        const sequence = await storage.getSequence(recipient.sequenceId);
        if (!sequence) {
          console.error(`[EmailQueue] [Matrix2] Sequence ${recipient.sequenceId} not found`);
          await markSlotSent(slot.id);
          continue;
        }

        // Skip if sequence is not active
        if (sequence.status !== 'active') {
          console.log(`[EmailQueue] [Matrix2] ⏸️ SKIPPED - Sequence "${sequence.name}" status is "${sequence.status}"`);
          continue; // Don't mark as sent, allow retry when sequence is active again
        }

        // Determine current step to send (currentStep + 1)
        // currentStep shows last completed step (0=none, 1=step1 done, etc.)
        const currentStepNumber = (recipient.currentStep || 0) + 1;

        // CHECK COMMISSION TRACKER VALIDATION
        if (currentStepNumber === 1) {
          // STEP 1: Fresh/cold email - validate and create/update tracker row
          const trackerCheck = await checkAndUpdateCommissionTracker(
            recipient.link,
            recipient.email,
            recipient.name
          );

          if (trackerCheck.shouldSkip) {
            console.log(`[EmailQueue] [Matrix2] ⛔ STEP 1 SKIPPED ${recipient.email}: ${trackerCheck.reason}`);
            // Mark slot as sent and recipient as skipped
            await markSlotSent(slot.id);
            await storage.updateRecipientStatus(recipient.id, { 
              status: 'skipped',
              nextSendAt: null
            });
            continue;
          }
        } else {
          // STEP 2+: Follow-up email - validate agent ownership and active status
          const followUpCheck = await validateFollowUpEmail(
            recipient.link,
            recipient.email
          );

          if (followUpCheck.shouldSkip) {
            console.log(`[EmailQueue] [Matrix2] ⛔ STEP ${currentStepNumber} FOLLOW-UP SKIPPED ${recipient.email}: ${followUpCheck.reason}`);
            // Mark slot as sent and recipient as skipped
            await markSlotSent(slot.id);
            await storage.updateRecipientStatus(recipient.id, { 
              status: 'skipped',
              nextSendAt: null
            });
            continue;
          }
        }

        // TWO-GATE REPLY DETECTION: Check for replies before sending
        // Use centralized replyGuard for all follow-ups (step 2+)
        if (currentStepNumber > 1) {
          const { shouldSendEmail } = await import('./replyGuard');
          const allowed = await shouldSendEmail({
            userId: sequence.createdBy,
            threadId: recipient.threadId,
            scheduledAt: slot.slotTimeUtc,
          });

          if (!allowed) {
            console.log(`[EmailQueue] [Matrix2] ✉️  REPLY DETECTED for ${recipient.email} - Cancelling sequence`);
            
            // Mark slot as sent
            await markSlotSent(slot.id);
            
            // Update recipient status to 'replied'
            await storage.updateRecipientStatus(recipient.id, {
              status: 'replied',
              nextSendAt: null,
            });
            
            continue; // Skip this send
          }
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
            currentStepNumber,
            sequence.finalizedStrategy || null  // Pass finalizedStrategy for 90% token savings
          );

          // OVERRIDE subject for follow-ups to ensure threading
          if (currentStepNumber > 1 && firstEmailSubject) {
            personalizedEmail.subject = `Re: ${firstEmailSubject}`;
            console.log(`[EmailQueue] 📧 Step ${currentStepNumber} - enforcing threaded subject: "${personalizedEmail.subject}"`);
          }
        } catch (aiError: any) {
          console.error(`[EmailQueue] [Matrix2] 🔄 AI generation failed for ${recipient.email}: ${aiError.message}`);
          console.error(`[EmailQueue] [Matrix2] 🔄 Will retry in next queue cycle`);
          // Don't mark slot as sent - allow retry
          continue;
        }

        // Send email using sequence creator's Gmail credentials
        const result = await sendEmail({
          userId: sequence.createdBy,
          to: recipient.email,
          subject: personalizedEmail.subject,
          body: personalizedEmail.body,
          threadId: currentStepNumber > 1 ? recipient.threadId : undefined,
        });

        if (result.success) {
          // Capture fresh timestamp for this send
          const sentAt = new Date();

          // MATRIX2: Mark slot as sent
          await markSlotSent(slot.id);

          // Save sent email to sequenceRecipientMessages for AI context
          await storage.createRecipientMessage({
            recipientId: recipient.id,
            stepNumber: currentStepNumber,
            subject: personalizedEmail.subject,
            body: personalizedEmail.body,
            threadId: result.threadId || recipient.threadId,
            messageId: result.rfc822MessageId || null,
          });

          // MATRIX2: Determine recipient status after this send
          const stepDelays = (sequence.stepDelays || []).map((d: string | number) => parseFloat(String(d)));
          const isLastStep = currentStepNumber === stepDelays.length;
          let recipientStatus: 'in_sequence' | 'completed' = 'completed';
          
          // If there are more steps or repeat is enabled, recipient stays in sequence
          if (!isLastStep || sequence.repeatLastStep) {
            recipientStatus = 'in_sequence';
          }

          // Update recipient status
          await storage.updateRecipientStatus(recipient.id, {
            status: recipientStatus,
            currentStep: currentStepNumber,
            lastStepSentAt: sentAt,
            nextSendAt: null, // Matrix2 will handle next scheduling
            sentAt: recipient.sentAt || sentAt,
            threadId: result.threadId || recipient.threadId,
          });

          // Update sequence stats
          const currentStats = await storage.getSequence(sequence.id);
          await storage.updateSequenceStats(sequence.id, {
            sentCount: (currentStats?.sentCount || 0) + 1,
            lastSentAt: sentAt,
          });

          console.log(`[EmailQueue] [Matrix2] ✅ Sent step ${currentStepNumber} to ${recipient.email}`);

          // Random delay between sends (1-3 minutes for natural pacing)
          const delayMs = (1 + Math.random() * 2) * 60 * 1000;
          await new Promise(resolve => setTimeout(resolve, delayMs));
        } else {
          // MATRIX2: Mark slot as sent even on failure to prevent retry loops
          await markSlotSent(slot.id);

          // Mark recipient as failed
          await storage.updateRecipientStatus(recipient.id, {
            status: 'failed',
          });

          const currentStats = await storage.getSequence(sequence.id);
          await storage.updateSequenceStats(sequence.id, {
            failedCount: (currentStats?.failedCount || 0) + 1,
          });

          console.error(`[EmailQueue] [Matrix2] ❌ Failed to send to ${recipient.email}: ${result.error}`);
        }
      } catch (error: any) {
        console.error(`[EmailQueue] [Matrix2] Error processing slot ${slot.id}:`, error);
        // Mark slot as sent on unexpected errors to prevent infinite retries
        try {
          await markSlotSent(slot.id);
        } catch (updateError) {
          console.error(`[EmailQueue] [Matrix2] Failed to mark slot as sent:`, updateError);
        }
      }
    } // End of slot processing loop
  } catch (error: any) {
    console.error('[EmailQueue] Error in queue processor:', error);
  } finally {
    isProcessing = false;
  }
}

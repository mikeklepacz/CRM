
import { storage } from '../storage';
import { sendEmail, personalizeEmailWithAI } from './emailSender';
import { computeNextSendSlot } from './smartTiming';
import { resolveAdminWindow } from './emailSchedulingService';
import { addDays } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import * as googleSheets from '../googleSheets';
import { normalizeLink } from '../../shared/linkUtils';

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
  
  // Run every 60 seconds (NEW: slower polling since sends are pre-scheduled)
  setInterval(async () => {
    if (isProcessing) {
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
      console.log(`[EmailQueue] ⏸️  Outside sending hours (${currentAdminHour}:00 in ${adminTimezone}). Queue paused until ${settings.sendingHoursStart}:00.`);
      return;
    }

    // Get sends where scheduledAt <= now (real-time scheduling - no null scheduledAt)
    const scheduledSends = await storage.getNextScheduledSends(10);
    
    if (scheduledSends.length === 0) {
      return;
    }

    console.log(`[EmailQueue] Processing ${scheduledSends.length} scheduled sends`);

    // Process each scheduled send
    for (const scheduledSend of scheduledSends) {
      try {
        // Get sequence details BEFORE claiming to check if we should process it
        const sequence = await storage.getSequence(scheduledSend.sequenceId);
        if (!sequence) {
          console.error(`[EmailQueue] Sequence ${scheduledSend.sequenceId} not found`);
          // Claim it to mark as failed so it doesn't keep getting picked up
          const claimed = await storage.claimScheduledSend(scheduledSend.id);
          if (claimed) {
            await storage.updateScheduledSend(scheduledSend.id, { status: 'failed' });
          }
          continue;
        }

        // CRITICAL: Skip if sequence is paused UNLESS this is a manual override (Send Now)
        // Manual overrides bypass pause to allow immediate sending of specific emails
        if (sequence.status === 'paused' && !scheduledSend.manualOverride) {
          console.log(`[EmailQueue] ⏸️ SKIPPED - Sequence "${sequence.name}" is paused (will retry when resumed)`);
          continue;
        }

        // Skip if sequence is not active (draft, completed, cancelled, etc.) UNLESS manual override
        if (sequence.status !== 'active' && !scheduledSend.manualOverride) {
          console.log(`[EmailQueue] ⏸️ SKIPPED - Sequence "${sequence.name}" status is "${sequence.status}"`);
          continue;
        }

        // Log manual override if present
        if (scheduledSend.manualOverride) {
          console.log(`[EmailQueue] 🚀 MANUAL OVERRIDE - Sending despite sequence status "${sequence.status}"`);
        }

        // Atomically claim this scheduled send (prevents double-processing)
        const claimed = await storage.claimScheduledSend(scheduledSend.id);
        if (!claimed) {
          continue;
        }

        // Get recipient data
        const recipient = await storage.getRecipient(scheduledSend.recipientId);
        if (!recipient) {
          console.error(`[EmailQueue] Recipient ${scheduledSend.recipientId} not found`);
          await storage.updateScheduledSend(scheduledSend.id, { status: 'failed' });
          continue;
        }

        // Determine current step from scheduledSend
        const currentStepNumber = scheduledSend.stepNumber;

        // CHECK COMMISSION TRACKER VALIDATION
        if (currentStepNumber === 1) {
          // STEP 1: Fresh/cold email - validate and create/update tracker row
          const trackerCheck = await checkAndUpdateCommissionTracker(
            recipient.link,
            recipient.email,
            recipient.name
          );

          if (trackerCheck.shouldSkip) {
            console.log(`[EmailQueue] ⛔ STEP 1 SKIPPED ${recipient.email}: ${trackerCheck.reason}`);
            // Mark scheduled send as cancelled and recipient as skipped
            await storage.updateScheduledSend(scheduledSend.id, { status: 'cancelled' });
            await storage.deleteRecipientScheduledSends(recipient.id); // Delete all future sends
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
            console.log(`[EmailQueue] ⛔ STEP ${currentStepNumber} FOLLOW-UP SKIPPED ${recipient.email}: ${followUpCheck.reason}`);
            // Mark scheduled send as cancelled and delete all future sends
            await storage.updateScheduledSend(scheduledSend.id, { status: 'cancelled' });
            await storage.deleteRecipientScheduledSends(recipient.id);
            await storage.updateRecipientStatus(recipient.id, { 
              status: 'skipped',
              nextSendAt: null
            });
            continue;
          }
        }

        // TWO-GATE REPLY DETECTION: Check for replies before sending
        // For follow-ups only (step 2+), check if recipient has replied
        if (currentStepNumber > 1 && recipient.threadId) {
          try {
            const { checkForReplies } = await import('./gmailReplyDetection');
            const replyCheck = await checkForReplies(sequence.createdBy, recipient.threadId);
            
            if (replyCheck.hasReply) {
              console.log(`[EmailQueue] ✉️  REPLY DETECTED for ${recipient.email} - Cancelling sequence`);
              
              // Mark scheduled send as cancelled
              await storage.updateScheduledSend(scheduledSend.id, { status: 'cancelled' });
              
              // Delete all future scheduled sends
              await storage.deleteRecipientScheduledSends(recipient.id);
              
              // Update recipient status to 'replied'
              await storage.updateRecipientStatus(recipient.id, {
                status: 'replied',
                nextSendAt: null,
              });
              
              continue; // Skip this send
            }
          } catch (replyError: any) {
            console.warn(`[EmailQueue] ⚠️  Reply detection failed for ${recipient.email}: ${replyError.message}`);
            console.warn(`[EmailQueue] ⚠️  Proceeding with send despite error`);
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
          console.error(`[EmailQueue] 🔄 AI generation failed for ${recipient.email}: ${aiError.message}`);
          console.error(`[EmailQueue] 🔄 Will retry in next queue cycle`);
          await storage.updateScheduledSend(scheduledSend.id, { status: 'pending' }); // Reset to pending for retry
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

          // Mark scheduled send as sent with populated fields (keep for audit history)
          await storage.updateScheduledSend(scheduledSend.id, {
            status: 'sent',
            sentAt,
            threadId: result.threadId || null,
            messageId: result.rfc822MessageId || null,
            subject: personalizedEmail.subject,
            body: personalizedEmail.body,
          });

          // Save sent email to sequenceRecipientMessages for AI context
          await storage.createRecipientMessage({
            recipientId: recipient.id,
            stepNumber: currentStepNumber,
            subject: personalizedEmail.subject,
            body: personalizedEmail.body,
            threadId: result.threadId || recipient.threadId,
            messageId: result.rfc822MessageId || null,
          });

          // LAZY SCHEDULING: Create next step's scheduled send immediately after current completes
          const stepDelays = (sequence.stepDelays || []).map((d: string | number) => parseFloat(String(d)));
          const isLastStep = currentStepNumber === stepDelays.length;
          let nextSendAt: Date | null = null;
          let recipientStatus: 'in_sequence' | 'completed' = 'completed';
          
          // Case 1: Repeat last step is enabled and we're on the last step
          if (sequence.repeatLastStep && isLastStep && stepDelays.length > 0) {
            const { scheduleRecipient } = await import('./emailSchedulingService');
            const lastStepDelay = stepDelays[stepDelays.length - 1];
            
            // Schedule the repeat of the last step
            const scheduledAt = await scheduleRecipient({
              recipientId: recipient.id,
              sequenceId: sequence.id,
              stepNumber: currentStepNumber, // Repeat same step
              stepDelay: lastStepDelay,
              lastStepSentAt: sentAt,
              recipientTimezone: recipient.timezone,
              recipientBusinessHours: recipient.businessHours,
              userId: sequence.createdBy,
            });
            
            console.log(`[EmailQueue] 🔄 Repeat last step - creating next send for step ${currentStepNumber} at ${scheduledAt.toISOString()}`);
            
            // Insert new scheduled send with calculated scheduledAt
            await storage.insertScheduledSends([{
              recipientId: recipient.id,
              sequenceId: sequence.id,
              stepNumber: currentStepNumber,
              eligibleAt: scheduledAt,
              scheduledAt,
              status: 'pending',
            }]);
            
            nextSendAt = scheduledAt;
            recipientStatus = 'in_sequence';
          }
          // Case 2: There are more steps in the sequence
          else if (!isLastStep && currentStepNumber < stepDelays.length) {
            const { scheduleRecipient } = await import('./emailSchedulingService');
            const nextStepNumber = currentStepNumber + 1;
            const nextStepDelay = stepDelays[nextStepNumber - 1];
            
            // Schedule the next step
            const scheduledAt = await scheduleRecipient({
              recipientId: recipient.id,
              sequenceId: sequence.id,
              stepNumber: nextStepNumber,
              stepDelay: nextStepDelay,
              lastStepSentAt: sentAt,
              recipientTimezone: recipient.timezone,
              recipientBusinessHours: recipient.businessHours,
              userId: sequence.createdBy,
            });
            
            console.log(`[EmailQueue] 📅 Lazy scheduling - creating step ${nextStepNumber} at ${scheduledAt.toISOString()}`);
            
            // Insert next step's scheduled send with calculated scheduledAt
            await storage.insertScheduledSends([{
              recipientId: recipient.id,
              sequenceId: sequence.id,
              stepNumber: nextStepNumber,
              eligibleAt: scheduledAt,
              scheduledAt,
              status: 'pending',
            }]);
            
            nextSendAt = scheduledAt;
            recipientStatus = 'in_sequence';
          }

          // Update recipient status
          await storage.updateRecipientStatus(recipient.id, {
            status: recipientStatus,
            currentStep: currentStepNumber,
            lastStepSentAt: sentAt,
            nextSendAt,
            sentAt: recipient.sentAt || sentAt,
            threadId: result.threadId || recipient.threadId,
          });

          // Update sequence stats
          const currentStats = await storage.getSequence(sequence.id);
          await storage.updateSequenceStats(sequence.id, {
            sentCount: (currentStats?.sentCount || 0) + 1,
            lastSentAt: sentAt,
          });

          console.log(`[EmailQueue] ✅ Sent step ${currentStepNumber} to ${recipient.email}`);

          // Random delay between sends (1-3 minutes for natural pacing)
          const delayMs = (1 + Math.random() * 2) * 60 * 1000;
          await new Promise(resolve => setTimeout(resolve, delayMs));
        } else {
          // Mark scheduled send as failed
          await storage.updateScheduledSend(scheduledSend.id, { status: 'failed' });

          // Mark recipient as failed
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
        console.error(`[EmailQueue] Error processing scheduled send ${scheduledSend.id}:`, error);
        // Mark as failed on unexpected errors
        try {
          await storage.updateScheduledSend(scheduledSend.id, { status: 'failed' });
        } catch (updateError) {
          console.error(`[EmailQueue] Failed to mark send as failed:`, updateError);
        }
      }
    } // End of scheduled send loop
  } catch (error: any) {
    console.error('[EmailQueue] Error in queue processor:', error);
  } finally {
    isProcessing = false;
  }
}

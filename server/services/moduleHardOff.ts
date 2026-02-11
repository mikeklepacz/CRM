import { db } from '../db';
import { sql } from 'drizzle-orm';
import { sequenceRecipients, sequences, callCampaigns, callCampaignTargets } from '@shared/schema';
import { eq, and, inArray } from 'drizzle-orm';

interface HardOffResult {
  module: string;
  emailsRemoved: number;
  callsCancelled: number;
}

export async function handleModuleHardOff(
  tenantId: string,
  previousModules: string[],
  newModules: string[]
): Promise<HardOffResult[]> {
  const results: HardOffResult[] = [];
  
  const removedModules = previousModules.filter(m => !newModules.includes(m));
  
  if (removedModules.length === 0) {
    return results;
  }

  console.log(`[ModuleHardOff] Tenant ${tenantId}: Modules being disabled: ${removedModules.join(', ')}`);

  for (const module of removedModules) {
    const result: HardOffResult = {
      module,
      emailsRemoved: 0,
      callsCancelled: 0,
    };

    if (module === 'ehub') {
      result.emailsRemoved = await cancelEhubQueue(tenantId);
    }

    if (module === 'voice_kb') {
      result.callsCancelled = await cancelVoiceQueue(tenantId);
    }

    results.push(result);
    console.log(`[ModuleHardOff] Module '${module}' disabled: ${result.emailsRemoved} emails removed, ${result.callsCancelled} calls cancelled`);
  }

  return results;
}

async function cancelEhubQueue(tenantId: string): Promise<number> {
  try {
    const tenantSequences = await db
      .select({ id: sequences.id })
      .from(sequences)
      .where(eq(sequences.tenantId, tenantId));

    if (tenantSequences.length === 0) {
      return 0;
    }

    const sequenceIds = tenantSequences.map(s => s.id);

    // Use 'paused' status instead of 'removed' to allow potential resume
    const result = await db
      .update(sequenceRecipients)
      .set({ 
        status: 'paused',
        nextSendAt: null,
        updatedAt: new Date()
      })
      .where(
        and(
          inArray(sequenceRecipients.sequenceId, sequenceIds),
          inArray(sequenceRecipients.status, ['pending', 'in_sequence'])
        )
      )
      .returning({ id: sequenceRecipients.id });

    const pausedCount = result.length;

    // Clear all assigned slots for these sequences
    if (pausedCount > 0) {
      const { clearSlotsForSequence } = await import('./Matrix2/slotDb');
      for (const seqId of sequenceIds) {
        await clearSlotsForSequence(seqId);
      }
    }

    return pausedCount;
  } catch (error) {
    console.error('[ModuleHardOff] Error cancelling E-Hub queue:', error);
    return 0;
  }
}

async function cancelVoiceQueue(tenantId: string): Promise<number> {
  try {
    const tenantCampaigns = await db
      .select({ id: callCampaigns.id })
      .from(callCampaigns)
      .where(eq(callCampaigns.tenantId, tenantId));

    if (tenantCampaigns.length === 0) {
      return 0;
    }

    const campaignIds = tenantCampaigns.map(c => c.id);

    // Get target IDs before updating for slot cleanup
    const targetsToCancel = await db
      .select({ id: callCampaignTargets.id, clientId: callCampaignTargets.clientId })
      .from(callCampaignTargets)
      .where(
        and(
          inArray(callCampaignTargets.campaignId, campaignIds),
          inArray(callCampaignTargets.targetStatus, ['pending', 'scheduled', 'in-progress'])
        )
      );

    if (targetsToCancel.length === 0) {
      return 0;
    }

    const targetIds = targetsToCancel.map(t => t.id);

    // Cancel all pending/scheduled/in-progress targets
    await db
      .update(callCampaignTargets)
      .set({ 
        targetStatus: 'cancelled',
        lastError: 'Module disabled by administrator',
        updatedAt: new Date()
      })
      .where(inArray(callCampaignTargets.id, targetIds));

    // Also pause all campaigns for this tenant
    await db
      .update(callCampaigns)
      .set({ 
        status: 'paused',
        updatedAt: new Date()
      })
      .where(
        and(
          eq(callCampaigns.tenantId, tenantId),
          eq(callCampaigns.status, 'active')
        )
      );

    return targetsToCancel.length;
  } catch (error) {
    console.error('[ModuleHardOff] Error cancelling voice queue:', error);
    return 0;
  }
}

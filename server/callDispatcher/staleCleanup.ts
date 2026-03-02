import { storage } from '../storage';

export async function cleanupStaleTargets(): Promise<void> {
  const cleanupStart = Date.now();
  console.log('[CallDispatcher][DEBUG] Starting stale target cleanup at', new Date().toISOString());

  try {
    const staleThresholdMinutes = 10;
    const staleDate = new Date(Date.now() - staleThresholdMinutes * 60 * 1000);

    const staleTargets = await storage.getStaleInProgressTargets(staleDate);

    if (staleTargets.length > 0) {
      console.log(`[CallDispatcher][DEBUG] Found ${staleTargets.length} stale in-progress targets, marking as failed`);

      for (const target of staleTargets) {
        console.log(`[CallDispatcher][DEBUG] Marking stale target as failed: targetId=${target.id}, campaignId=${target.campaignId}, callSessionId=${target.callSessionId || 'none'}`);
        await storage.updateCallCampaignTarget(target.id, target.tenantId, {
          targetStatus: 'failed',
          lastError: `Timeout: No status update received after ${staleThresholdMinutes} minutes`,
        });

        await storage.incrementCampaignCalls(target.campaignId, target.tenantId, 'failed');
      }
    } else {
      console.log('[CallDispatcher][DEBUG] No stale targets found');
    }

    const staleSessionCount = await storage.markStaleSessionsAsFailed(staleDate);
    if (staleSessionCount > 0) {
      console.log(`[CallDispatcher][DEBUG] Marked ${staleSessionCount} stale 'initiated' call sessions as failed`);
    }

    console.log(`[CallDispatcher][DEBUG] Stale target cleanup completed in ${Date.now() - cleanupStart}ms`);
  } catch (error) {
    console.error('[CallDispatcher][DEBUG] *** ERROR cleaning up stale targets ***');
    console.error('[CallDispatcher][DEBUG] Error:', error);
  }
}

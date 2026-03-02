import { storage } from './storage';
import { eventGateway } from './services/events/gateway';
import { isNoSendDay } from './services/holidayCalendar';
import { checkSystemHealth, checkSystemHealthForTenant } from './callDispatcher/health';
import { processCallTarget } from './callDispatcher/processTarget';
import { cleanupStaleTargets } from './callDispatcher/staleCleanup';

export class CallDispatcher {
  private isRunning = false;
  private pendingImmediateRun = false;

  // Process immediately - marks for immediate run (will be picked up when current run finishes)
  async processImmediately(): Promise<void> {
    const startTime = Date.now();
    console.log('[CallDispatcher][DEBUG] ========== PROCESS IMMEDIATELY CALLED ==========');
    console.log('[CallDispatcher][DEBUG] Timestamp:', new Date().toISOString());
    console.log('[CallDispatcher][DEBUG] isRunning:', this.isRunning);
    console.log('[CallDispatcher][DEBUG] pendingImmediateRun:', this.pendingImmediateRun);
    
    // If already running, mark that we need another run after this one
    if (this.isRunning) {
      this.pendingImmediateRun = true;
      console.log('[CallDispatcher][DEBUG] Dispatcher busy, setting pendingImmediateRun=true');
      return;
    }
    
    // Not running, process now
    console.log('[CallDispatcher][DEBUG] Dispatcher idle, processing now...');
    await this.processQueuedCalls();
    console.log(`[CallDispatcher][DEBUG] processImmediately completed in ${Date.now() - startTime}ms`);
  }

  async processQueuedCalls(): Promise<void> {
    const cycleStart = Date.now();
    console.log('[CallDispatcher][DEBUG] ========== PROCESS QUEUED CALLS ==========');
    console.log('[CallDispatcher][DEBUG] Cycle start:', new Date().toISOString());
    
    if (this.isRunning) {
      console.log('[CallDispatcher][DEBUG] Already running, skipping');
      return;
    }

    try {
      this.isRunning = true;
      console.log('[CallDispatcher][DEBUG] Set isRunning=true');

      // Cleanup stale in-progress targets (older than 10 minutes)
      await cleanupStaleTargets();

      // System health pre-flight check - verify critical components
      const healthIssues = await checkSystemHealth();
      if (healthIssues.length > 0) {
        console.log('[CallDispatcher][BLOCKED] System health check failed:', healthIssues.join(', '));
        return;
      }

      console.log('[CallDispatcher][DEBUG] Fetching targets ready for calling...');
      const targets = await storage.getCallTargetsReadyForCalling();
      console.log(`[CallDispatcher][DEBUG] Found ${targets.length} targets ready for calling`);
      
      if (targets.length === 0) {
        console.log('[CallDispatcher][DEBUG] No targets to process');
        return;
      }

      // Cache configs and holiday checks by tenant to avoid redundant lookups
      const configCache: Map<string, { apiKey: string; twilioNumber?: string; useDirectElevenLabs?: boolean } | null> = new Map();
      const holidayCache: Map<string, { blocked: boolean; reason?: string }> = new Map();

      for (let i = 0; i < targets.length; i++) {
        const target = targets[i];
        console.log(`[CallDispatcher][DEBUG] Processing target ${i + 1}/${targets.length}: ${target.id}, tenantId: ${target.tenantId}`);
        
        // Per-tenant system health check
        const tenantHealthIssues = await checkSystemHealthForTenant(target.tenantId);
        if (tenantHealthIssues.length > 0) {
          console.log(`[CallDispatcher][BLOCKED] Tenant ${target.tenantId} health check failed:`, tenantHealthIssues.join(', '));
          await storage.updateCallCampaignTarget(target.id, target.tenantId, {
            lastError: 'System health check failed: ' + tenantHealthIssues.join(', '),
          });
          continue;
        }
        
        // Check if today is a no-send day for this tenant (cached per tenant)
        if (!holidayCache.has(target.tenantId)) {
          const todayCheck = await isNoSendDay(new Date(), undefined, target.tenantId);
          holidayCache.set(target.tenantId, todayCheck);
          if (todayCheck.blocked) {
            console.log(`[CallDispatcher] Today is blocked for tenant ${target.tenantId}: ${todayCheck.reason}`);
          }
        }
        
        const tenantHolidayCheck = holidayCache.get(target.tenantId)!;
        if (tenantHolidayCheck.blocked) {
          console.log(`[CallDispatcher][DEBUG] Skipping target ${target.id} - today is blocked: ${tenantHolidayCheck.reason}`);
          continue;
        }
        
        // Get config for this target's tenant (cached)
        if (!configCache.has(target.tenantId)) {
          const config = await storage.getElevenLabsConfig(target.tenantId);
          configCache.set(target.tenantId, config || null);
          console.log(`[CallDispatcher][DEBUG] Loaded config for tenant ${target.tenantId}: ${config?.apiKey ? 'API key found' : 'NO API key'}`);
        }
        
        const tenantConfig = configCache.get(target.tenantId);
        if (!tenantConfig?.apiKey) {
          console.log(`[CallDispatcher][DEBUG] Skipping target ${target.id} - no API key for tenant ${target.tenantId}`);
          continue;
        }
        
        await processCallTarget(target, tenantConfig.apiKey, tenantConfig.useDirectElevenLabs ?? false);
      }
      
      // Emit WebSocket event for real-time UI updates
      eventGateway.emit('calls:queueChanged', {
        processed: targets.length,
        timestamp: new Date().toISOString(),
      });
      
      console.log(`[CallDispatcher][DEBUG] Cycle completed in ${Date.now() - cycleStart}ms`);
    } catch (error) {
      console.error('[CallDispatcher][DEBUG] *** ERROR IN PROCESSING CYCLE ***');
      console.error('[CallDispatcher][DEBUG] Error:', error);
    } finally {
      this.isRunning = false;
      console.log('[CallDispatcher][DEBUG] Set isRunning=false');
      
      // Check if an immediate run was requested while we were processing
      if (this.pendingImmediateRun) {
        this.pendingImmediateRun = false;
        console.log('[CallDispatcher][DEBUG] pendingImmediateRun was true, scheduling another run');
        // Use setImmediate to avoid potential stack overflow with recursive calls
        setImmediate(() => {
          this.processQueuedCalls().catch(err => {
            console.error('[CallDispatcher][DEBUG] Error in pending immediate run:', err);
          });
        });
      }
    }
  }

}

export const callDispatcher = new CallDispatcher();

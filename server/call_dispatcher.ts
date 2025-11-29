import axios from 'axios';
import { storage } from './storage';
import { generateStreamTwiML, initiateOutboundCall as twilioInitiateCall, isTwilioConfigured } from './twilio-service';
import { eventGateway } from './services/events/gateway';
import { isNoSendDay } from './services/holidayCalendar';

const ELEVENLABS_API_BASE = 'https://api.elevenlabs.io/v1';
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_BASE_MS = 2000;

interface CallTarget {
  id: string;
  campaignId: string;
  clientId: string;
  targetStatus: string;
  scheduledFor: Date | null;
  attemptCount: number;
  nextAttemptAt: Date | null;
  externalConversationId: string | null;
  lastError: string | null;
}

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

  private async cleanupStaleTargets(): Promise<void> {
    const cleanupStart = Date.now();
    console.log('[CallDispatcher][DEBUG] Starting stale target cleanup at', new Date().toISOString());
    
    try {
      const staleThresholdMinutes = 10;
      const staleDate = new Date(Date.now() - staleThresholdMinutes * 60 * 1000);
      
      // Find targets stuck in 'in-progress' status for too long
      const staleTargets = await storage.getStaleInProgressTargets(staleDate);
      
      if (staleTargets.length > 0) {
        console.log(`[CallDispatcher][DEBUG] Found ${staleTargets.length} stale in-progress targets, marking as failed`);
        
        for (const target of staleTargets) {
          console.log(`[CallDispatcher][DEBUG] Marking stale target as failed: targetId=${target.id}, campaignId=${target.campaignId}, callSessionId=${target.callSessionId || 'none'}`);
          await storage.updateCallCampaignTarget(target.id, {
            targetStatus: 'failed',
            lastError: `Timeout: No status update received after ${staleThresholdMinutes} minutes`,
          });
          
          // Update campaign stats
          await storage.incrementCampaignCalls(target.campaignId, 'failed');
        }
      } else {
        console.log('[CallDispatcher][DEBUG] No stale targets found');
      }
      
      console.log(`[CallDispatcher][DEBUG] Stale target cleanup completed in ${Date.now() - cleanupStart}ms`);
    } catch (error) {
      console.error('[CallDispatcher][DEBUG] *** ERROR cleaning up stale targets ***');
      console.error('[CallDispatcher][DEBUG] Error:', error);
    }
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

      // Check if today is a no-send day (federal holiday or custom blackout)
      const todayCheck = await isNoSendDay(new Date());
      if (todayCheck.blocked) {
        console.log(`[CallDispatcher] Today is blocked: ${todayCheck.reason} - skipping call processing`);
        return;
      }

      const config = await storage.getElevenLabsConfig();
      if (!config?.apiKey) {
        console.log('[CallDispatcher][DEBUG] No API key configured, skipping');
        return;
      }
      console.log('[CallDispatcher][DEBUG] API key found, twilioNumber:', config.twilioNumber ? 'configured' : 'NOT SET');

      // Cleanup stale in-progress targets (older than 10 minutes)
      await this.cleanupStaleTargets();

      console.log('[CallDispatcher][DEBUG] Fetching targets ready for calling...');
      const targets = await storage.getCallTargetsReadyForCalling();
      console.log(`[CallDispatcher][DEBUG] Found ${targets.length} targets ready for calling`);
      
      if (targets.length === 0) {
        console.log('[CallDispatcher][DEBUG] No targets to process');
        return;
      }

      for (let i = 0; i < targets.length; i++) {
        const target = targets[i];
        console.log(`[CallDispatcher][DEBUG] Processing target ${i + 1}/${targets.length}: ${target.id}`);
        await this.processCallTarget(target, config.apiKey);
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

  private async processCallTarget(target: any, apiKey: string): Promise<void> {
    const targetStart = Date.now();
    console.log('[CallDispatcher][DEBUG] ========== PROCESS CALL TARGET ==========');
    console.log('[CallDispatcher][DEBUG] Target ID:', target.id);
    console.log('[CallDispatcher][DEBUG] Client ID:', target.clientId);
    console.log('[CallDispatcher][DEBUG] Campaign ID:', target.campaignId);
    console.log('[CallDispatcher][DEBUG] Attempt count:', target.attemptCount);
    
    try {
      console.log('[CallDispatcher][DEBUG] Updating target status to in-progress...');
      await storage.updateCallCampaignTarget(target.id, {
        targetStatus: 'in-progress',
        attemptCount: target.attemptCount + 1,
      });

      console.log('[CallDispatcher][DEBUG] Fetching client...');
      const client = await storage.getClient(target.clientId);
      if (!client) {
        throw new Error(`Client not found: ${target.clientId}`);
      }
      console.log('[CallDispatcher][DEBUG] Client found:', client.uniqueIdentifier);

      const clientData = client.data as any;
      const phoneNumber = clientData?.Phone || clientData?.phone;
      console.log('[CallDispatcher][DEBUG] Phone number:', phoneNumber ? `***${phoneNumber.slice(-4)}` : 'NOT FOUND');
      
      if (!phoneNumber) {
        throw new Error(`No phone number found for client ${target.clientId}`);
      }

      console.log('[CallDispatcher][DEBUG] Fetching campaign...');
      const campaign = await storage.getCallCampaign(target.campaignId);
      if (!campaign) {
        throw new Error(`Campaign not found: ${target.campaignId}`);
      }
      console.log('[CallDispatcher][DEBUG] Campaign found:', campaign.name, 'agentId:', campaign.agentId);

      console.log('[CallDispatcher][DEBUG] Fetching agent...');
      const agent = await storage.getElevenLabsAgent(campaign.agentId);
      if (!agent) {
        throw new Error(`Agent not found: ${campaign.agentId}`);
      }
      console.log('[CallDispatcher][DEBUG] Agent found:', agent.name, 'agentId:', agent.agentId);

      // Fetch agent's current prompt from ElevenLabs API to append IVR instructions
      let agentPrompt = '';
      try {
        const agentDetailsResponse = await axios.get(
          `https://api.elevenlabs.io/v1/convai/agents/${agent.agentId}`,
          {
            headers: {
              'xi-api-key': apiKey,
            },
          }
        );
        
        // Extract prompt from nested structure
        const data = agentDetailsResponse.data;
        agentPrompt = data.conversation_config?.agent?.prompt?.prompt
          || data.conversation_config?.prompt
          || '';
      } catch (error: any) {
        // Continue without prompt - will use IVR instructions only
      }

      // Create User ID in format: Name_City_State
      const businessName = (clientData?.Name || clientData?.name || 'Unknown').replace(/[^a-zA-Z0-9]/g, '');
      const city = (clientData?.City || 'Unknown').replace(/[^a-zA-Z0-9]/g, '');
      const state = (clientData?.State || 'Unknown').replace(/[^a-zA-Z0-9]/g, '');
      const userId = `${businessName}_${city}_${state}`;

      // Prepare dynamic variables for ElevenLabs agent personalization
      const dynamicVariables: Record<string, string> = {
        name: clientData?.Name || clientData?.name || 'valued customer',
        poc_name: clientData?.['Point of Contact'] || clientData?.poc_name || '',
        shipping_address: clientData?.['Shipping Address'] || clientData?.shipping_address || '',
        poc_email: clientData?.['POC EMAIL'] || clientData?.poc_email || '',
      };

      // Build IVR handling instructions based on campaign setting
      const ivrBehaviorSetting = campaign.ivrBehavior || 'flag_and_end';
      let ivrInstructions = '';
      
      if (ivrBehaviorSetting === 'flag_and_navigate') {
        ivrInstructions = `\n\nIMPORTANT IVR HANDLING INSTRUCTIONS: If you encounter an automated phone system (IVR menu), you should attempt to navigate it using the play_keypad_touch_tone tool to reach a live person. Listen carefully for menu options like "Press 1 for Sales" or "Press 0 for Operator" and use the appropriate key press. Once you reach a live person, proceed with your normal conversation flow.`;
      } else {
        // flag_and_end (default)
        ivrInstructions = `\n\nIMPORTANT IVR HANDLING INSTRUCTIONS: If you encounter an automated phone system (IVR menu) or voicemail, you must politely end the call immediately. Do NOT attempt to navigate menus or leave messages. Simply say goodbye and hang up. The system will automatically flag this number for manual follow-up.`;
      }

      const combinedPrompt = agentPrompt + ivrInstructions;

      // Create call session BEFORE initiating Twilio call
      // This ensures voice proxy can find it immediately when stream starts
      // Store prompt data in storeSnapshot since metadata field doesn't exist in schema
      console.log('[CallDispatcher][DEBUG] Creating call session...');
      const callSession = await storage.createCallSession({
        callSid: null, // Will be updated after Twilio call creation
        agentId: agent.agentId,
        phoneNumber,
        clientId: target.clientId,
        status: 'initiated',
        storeSnapshot: {
          combinedPrompt: combinedPrompt,
          ivrBehavior: ivrBehaviorSetting,
          dynamicVariables: dynamicVariables,
          scenario: campaign.scenario || 'custom',
          businessName: clientData?.Name || clientData?.name,
          link: client.uniqueIdentifier,
        } as Record<string, any>,
      });
      console.log('[CallDispatcher][DEBUG] Call session created:', callSession.id);

      try {
        console.log('[CallDispatcher][DEBUG] Initiating outbound call...');
        const callStart = Date.now();
        const result = await this.initiateOutboundCall({
          apiKey,
          agentId: agent.agentId,
          phoneNumberId: agent.phoneNumberId || '',
          toNumber: phoneNumber,
          userId,
          dynamicVariables,
          clientData: {
            campaignTargetId: target.id,
            businessName: clientData?.Name || clientData?.name,
            link: client.uniqueIdentifier,
            scenario: campaign.scenario || 'custom',
            clientId: target.clientId,
          },
          ivrBehavior: ivrBehaviorSetting,
          basePrompt: combinedPrompt,
        });
        console.log(`[CallDispatcher][DEBUG] Outbound call initiated in ${Date.now() - callStart}ms`);
        console.log('[CallDispatcher][DEBUG] Call SID:', result.callSid);
        console.log('[CallDispatcher][DEBUG] Success:', result.success);

        // Update call session with Twilio SID
        console.log('[CallDispatcher][DEBUG] Updating call session with callSid...');
        await storage.updateCallSession(callSession.id, {
          callSid: result.callSid,
        });

        console.log('[CallDispatcher][DEBUG] Updating campaign target...');
        await storage.updateCallCampaignTarget(target.id, {
          externalConversationId: result.callSid || null,
          callSessionId: callSession.id,
          lastError: null,
        });
        
        console.log(`[CallDispatcher][DEBUG] Target ${target.id} processed successfully in ${Date.now() - targetStart}ms`);
      } catch (twilioError: any) {
        // Clean up orphaned call session if Twilio call creation fails
        console.error(`[CallDispatcher][DEBUG] *** TWILIO CALL FAILED ***`);
        console.error(`[CallDispatcher][DEBUG] Target: ${target.id}`);
        console.error(`[CallDispatcher][DEBUG] Error:`, twilioError);
        console.error(`[CallDispatcher][DEBUG] Cleaning up orphaned session: ${callSession.id}`);
        try {
          await storage.deleteCallSession(callSession.id);
          console.log(`[CallDispatcher][DEBUG] Deleted orphaned call session ${callSession.id}`);
        } catch (cleanupError) {
          console.error(`[CallDispatcher][DEBUG] Failed to delete orphaned session ${callSession.id}:`, cleanupError);
        }
        throw twilioError; // Re-throw to trigger handleCallFailure
      }
    } catch (error: any) {
      console.error(`[CallDispatcher][DEBUG] *** PROCESS CALL TARGET FAILED ***`);
      console.error(`[CallDispatcher][DEBUG] Target: ${target.id}`);
      console.error(`[CallDispatcher][DEBUG] Error:`, error);
      await this.handleCallFailure(target, error);
    }
  }

  private async initiateOutboundCall(params: {
    apiKey: string;
    agentId: string;
    phoneNumberId: string;
    toNumber: string;
    userId?: string;
    dynamicVariables?: Record<string, string>;
    clientData?: any;
    ivrBehavior?: string;
    basePrompt?: string;
  }): Promise<{ success: boolean; message: string; conversation_id: string | null; callSid: string | null }> {
    // Helper to mask phone numbers for security
    const maskPhone = (phone: string) => phone.length > 4 ? `***${phone.slice(-4)}` : '****';
    
    // Emit debug event for call initiation (with masked phone)
    eventGateway.emit('call:debug', {
      stage: 'dispatcher',
      message: 'Initiating outbound call',
      details: { 
        toNumber: maskPhone(params.toNumber), 
        agentId: params.agentId,
      },
      level: 'info',
    });

    // Check if Twilio is configured
    if (!isTwilioConfigured()) {
      eventGateway.emit('call:debug', {
        stage: 'dispatcher',
        message: 'Twilio credentials not configured',
        details: {},
        level: 'error',
      });
      throw new Error('Twilio credentials not configured. Please set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN environment variables.');
    }

    // Get the Twilio phone number from ElevenLabs config
    const config = await storage.getElevenLabsConfig();
    if (!config?.twilioNumber) {
      eventGateway.emit('call:debug', {
        stage: 'dispatcher',
        message: 'Twilio phone number not configured',
        details: {},
        level: 'error',
      });
      throw new Error('Twilio phone number not configured in Voice settings. Please configure a phone number.');
    }

    const ivrBehaviorSetting = params.ivrBehavior || 'flag_and_end';

    // Add IVR behavior and userId to client data for voice proxy
    const clientDataWithMetadata = {
      ...params.clientData,
      ivrBehavior: ivrBehaviorSetting,
      userId: params.userId,
    };

    // Generate TwiML that routes to our WebSocket voice proxy
    const twiml = generateStreamTwiML({
      agentId: params.agentId,
      phoneNumberId: params.phoneNumberId,
      ivrBehavior: ivrBehaviorSetting,
      dynamicVariables: params.dynamicVariables,
      clientData: clientDataWithMetadata,
      basePrompt: params.basePrompt || '',
    });

    eventGateway.emit('call:debug', {
      stage: 'dispatcher',
      message: 'TwiML generated, calling Twilio',
      details: { from: maskPhone(config.twilioNumber), to: maskPhone(params.toNumber) },
      level: 'info',
    });

    // Initiate the call using Twilio SDK
    const result = await twilioInitiateCall({
      from: config.twilioNumber,
      to: params.toNumber,
      twiml: twiml,
    });

    // Mask call SID for security
    const maskedSid = result.callSid ? `${result.callSid.slice(0, 4)}...${result.callSid.slice(-4)}` : 'N/A';
    eventGateway.emit('call:debug', {
      stage: 'dispatcher',
      message: 'Twilio call initiated',
      details: { callSid: maskedSid, success: result.success },
      level: 'info',
    });

    return {
      success: result.success,
      message: result.message,
      conversation_id: null, // Will be generated by voice proxy
      callSid: result.callSid,
    };
  }

  private async handleCallFailure(target: any, error: any): Promise<void> {
    const isRetryable = this.isRetryableError(error);
    const shouldRetry = isRetryable && target.attemptCount < MAX_RETRY_ATTEMPTS;

    let errorMessage = error.message || 'Unknown error';
    if (error.response?.data?.error) {
      errorMessage = error.response.data.error;
    }

    if (shouldRetry) {
      const retryDelay = RETRY_DELAY_BASE_MS * Math.pow(2, target.attemptCount);
      const nextAttemptAt = new Date(Date.now() + retryDelay);

      await storage.updateCallCampaignTarget(target.id, {
        targetStatus: 'pending',
        nextAttemptAt,
        lastError: errorMessage,
      });
    } else {
      await storage.updateCallCampaignTarget(target.id, {
        targetStatus: 'failed',
        lastError: errorMessage,
        nextAttemptAt: null,
      });

      await storage.incrementCampaignCalls(target.campaignId, 'failed');
    }
  }

  private isRetryableError(error: any): boolean {
    if (!error.response) {
      return true;
    }

    const status = error.response.status;
    
    if (status >= 400 && status < 500) {
      return false;
    }

    if (status >= 500) {
      return true;
    }

    return false;
  }
}

export const callDispatcher = new CallDispatcher();

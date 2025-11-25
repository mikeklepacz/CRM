import axios from 'axios';
import { storage } from './storage';
import { generateStreamTwiML, initiateOutboundCall as twilioInitiateCall, isTwilioConfigured } from './twilio-service';
import { eventGateway } from './services/events/gateway';

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

  async processQueuedCalls(): Promise<void> {
    if (this.isRunning) {
      console.log('[CallDispatcher] Already running, skipping this cycle');
      return;
    }

    try {
      this.isRunning = true;
      console.log('[CallDispatcher] Starting call processing cycle');

      const config = await storage.getElevenLabsConfig();
      if (!config?.apiKey) {
        console.warn('[CallDispatcher] No ElevenLabs API key configured, skipping');
        return;
      }

      const targets = await storage.getCallTargetsReadyForCalling();
      
      if (targets.length === 0) {
        console.log('[CallDispatcher] No calls ready to process');
        return;
      }

      console.log(`[CallDispatcher] Processing ${targets.length} calls`);

      for (const target of targets) {
        await this.processCallTarget(target, config.apiKey);
      }

      console.log('[CallDispatcher] Call processing cycle complete');
      
      // Emit WebSocket event for real-time UI updates
      eventGateway.emit('calls:queueChanged', {
        processed: targets.length,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[CallDispatcher] Error in processing cycle:', error);
    } finally {
      this.isRunning = false;
    }
  }

  private async processCallTarget(target: any, apiKey: string): Promise<void> {
    try {
      console.log(`[CallDispatcher] Processing call target ${target.id}`);

      await storage.updateCallCampaignTarget(target.id, {
        targetStatus: 'in-progress',
        attemptCount: target.attemptCount + 1,
      });

      const client = await storage.getClient(target.clientId);
      if (!client) {
        throw new Error(`Client not found: ${target.clientId}`);
      }

      const clientData = client.data as any;
      const phoneNumber = clientData?.Phone || clientData?.phone;
      
      if (!phoneNumber) {
        throw new Error(`No phone number found for client ${target.clientId}`);
      }

      const campaign = await storage.getCallCampaign(target.campaignId);
      if (!campaign) {
        throw new Error(`Campaign not found: ${target.campaignId}`);
      }

      const agent = await storage.getElevenLabsAgent(campaign.agentId);
      if (!agent) {
        throw new Error(`Agent not found: ${campaign.agentId}`);
      }

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
        
        console.log(`[CallDispatcher] Fetched agent prompt (${agentPrompt.length} chars)`);
      } catch (error: any) {
        console.error(`[CallDispatcher] Failed to fetch agent prompt:`, error.message);
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
      const callSession = await storage.createCallSession({
        callSid: null, // Will be updated after Twilio call creation
        agentId: agent.agentId,
        phoneNumber,
        clientId: target.clientId,
        status: 'initiated',
        scenario: campaign.scenario || 'custom',
        metadata: {
          combinedPrompt: combinedPrompt,
          ivrBehavior: ivrBehaviorSetting,
          dynamicVariables: dynamicVariables,
        },
      });

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

      // Update call session with Twilio SID
      await storage.updateCallSession(callSession.id, {
        callSid: result.callSid,
      });

      await storage.updateCallCampaignTarget(target.id, {
        externalConversationId: result.callSid || null,
        callSessionId: callSession.id,
        lastError: null,
      });

      console.log(`[CallDispatcher] Successfully initiated call for target ${target.id}, Twilio SID: ${result.callSid}`);
    } catch (error: any) {
      console.error(`[CallDispatcher] Error processing call target ${target.id}:`, error);
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
    // Check if Twilio is configured
    if (!isTwilioConfigured()) {
      throw new Error('Twilio credentials not configured. Please set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN environment variables.');
    }

    // Get the Twilio phone number from ElevenLabs config
    const config = await storage.getElevenLabsConfig();
    if (!config?.twilioNumber) {
      throw new Error('Twilio phone number not configured in Voice settings. Please configure a phone number.');
    }

    const ivrBehaviorSetting = params.ivrBehavior || 'flag_and_end';

    // Add IVR behavior and userId to client data for voice proxy
    const clientDataWithMetadata = {
      ...params.clientData,
      ivrBehavior: ivrBehaviorSetting,
      userId: params.userId,
    };

    console.log(`[CallDispatcher] IVR Behavior: ${ivrBehaviorSetting}`);
    console.log(`[CallDispatcher] Base prompt length: ${(params.basePrompt || '').length} chars`);

    // Generate TwiML that routes to our WebSocket voice proxy
    const twiml = generateStreamTwiML({
      agentId: params.agentId,
      phoneNumberId: params.phoneNumberId,
      ivrBehavior: ivrBehaviorSetting,
      dynamicVariables: params.dynamicVariables,
      clientData: clientDataWithMetadata,
      basePrompt: params.basePrompt || '',
    });

    console.log(`[CallDispatcher] Generated TwiML:`, twiml);

    // Initiate the call using Twilio SDK
    const result = await twilioInitiateCall({
      from: config.twilioNumber,
      to: params.toNumber,
      twiml: twiml,
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

      console.log(`[CallDispatcher] Scheduling retry for target ${target.id} at ${nextAttemptAt.toISOString()}`);

      await storage.updateCallCampaignTarget(target.id, {
        targetStatus: 'pending',
        nextAttemptAt,
        lastError: errorMessage,
      });
    } else {
      console.log(`[CallDispatcher] Marking target ${target.id} as failed (non-retryable or max attempts reached)`);

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

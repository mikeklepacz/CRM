import axios from 'axios';
import { storage } from './storage';

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

      const result = await this.initiateOutboundCall({
        apiKey,
        agentId: agent.agentId,
        phoneNumberId: agent.phoneNumberId,
        toNumber: phoneNumber,
        userId,
        dynamicVariables,
        clientData: {
          campaignTargetId: target.id,
          businessName: clientData?.Name || clientData?.name,
          link: client.uniqueIdentifier,
          scenario: campaign.scenario,
          clientId: target.clientId,
          sheetId: client.sheetId,
          rowIndex: client.rowIndex,
        },
        ivrBehavior: campaign.ivrBehavior,
        basePrompt: agentPrompt,
      });

      const callSession = await storage.createCallSession({
        conversationId: result.conversation_id || `manual-${Date.now()}`,
        agentId: agent.agentId,
        phoneNumber,
        clientId: target.clientId,
        status: 'initiated',
        callType: 'outbound',
        scenario: campaign.scenario || 'custom',
      });

      await storage.updateCallCampaignTarget(target.id, {
        externalConversationId: result.conversation_id || null,
        callSessionId: callSession.id,
        lastError: null,
      });

      console.log(`[CallDispatcher] Successfully initiated call for target ${target.id}, conversation: ${result.conversation_id}`);
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
    const url = `${ELEVENLABS_API_BASE}/convai/twilio/outbound-call`;

    // Build IVR handling instructions based on campaign setting
    // Default to flag_and_end if not specified
    const ivrBehaviorSetting = params.ivrBehavior || 'flag_and_end';
    let ivrInstructions = '';
    
    if (ivrBehaviorSetting === 'flag_and_navigate') {
      ivrInstructions = `\n\nIMPORTANT IVR HANDLING INSTRUCTIONS: If you encounter an automated phone system (IVR menu), you should attempt to navigate it using the play_keypad_touch_tone tool to reach a live person. Listen carefully for menu options like "Press 1 for Sales" or "Press 0 for Operator" and use the appropriate key press. Once you reach a live person, proceed with your normal conversation flow.`;
    } else {
      // flag_and_end (default)
      ivrInstructions = `\n\nIMPORTANT IVR HANDLING INSTRUCTIONS: If you encounter an automated phone system (IVR menu) or voicemail, you must politely end the call immediately. Do NOT attempt to navigate menus or leave messages. Simply say goodbye and hang up. The system will automatically flag this number for manual follow-up.`;
    }

    const payload: any = {
      agent_id: params.agentId,
      agent_phone_number_id: params.phoneNumberId,
      to_number: params.toNumber,
      user_id: params.userId, // Pass User ID to ElevenLabs for tracking
      conversation_initiation_client_data: params.clientData || {},
    };

    // Add dynamic variables for agent personalization (used in prompts and first message)
    if (params.dynamicVariables && Object.keys(params.dynamicVariables).length > 0) {
      payload.dynamic_variables = params.dynamicVariables;
      console.log(`[CallDispatcher] Dynamic variables:`, params.dynamicVariables);
    }

    // Use ElevenLabs conversation_config_override to inject IVR handling instructions
    // We fetch the agent's base prompt and append IVR instructions to preserve existing behavior
    // Reference: https://elevenlabs.io/docs/agents-platform/customization/personalization/overrides
    const combinedPrompt = (params.basePrompt || '') + ivrInstructions;
    
    payload.conversation_config_override = {
      agent: {
        prompt: {
          prompt: combinedPrompt
        }
      }
    };
    
    // Add IVR behavior to client data for webhook logging
    if (payload.conversation_initiation_client_data) {
      payload.conversation_initiation_client_data.ivrBehavior = ivrBehaviorSetting;
    }

    console.log(`[CallDispatcher] IVR Behavior: ${ivrBehaviorSetting}`);
    console.log(`[CallDispatcher] Base prompt length: ${(params.basePrompt || '').length} chars`);
    console.log(`[CallDispatcher] Combined prompt length: ${combinedPrompt.length} chars`);
    console.log(`[CallDispatcher] Calling ElevenLabs API: ${url}`);
    console.log(`[CallDispatcher] Payload:`, JSON.stringify(payload, null, 2));

    const response = await axios.post(url, payload, {
      headers: {
        'xi-api-key': params.apiKey,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });

    console.log(`[CallDispatcher] ElevenLabs response:`, response.data);
    return response.data;
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

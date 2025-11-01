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

      const result = await this.initiateOutboundCall({
        apiKey,
        agentId: agent.agentId,
        phoneNumberId: agent.phoneNumberId,
        toNumber: phoneNumber,
        clientData: {
          businessName: clientData?.Name || clientData?.name,
          link: client.uniqueIdentifier,
          scenario: campaign.scenario,
        },
      });

      await storage.updateCallCampaignTarget(target.id, {
        targetStatus: 'completed',
        externalConversationId: result.conversation_id || null,
        lastError: null,
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
        callSessionId: callSession.id,
      });

      await storage.incrementCampaignCalls(target.campaignId, 'successful');

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
    clientData?: any;
  }): Promise<{ success: boolean; message: string; conversation_id: string | null; callSid: string | null }> {
    const url = `${ELEVENLABS_API_BASE}/convai/twilio/outbound-call`;

    const payload = {
      agent_id: params.agentId,
      agent_phone_number_id: params.phoneNumberId,
      to_number: params.toNumber,
      conversation_initiation_client_data: params.clientData || {},
    };

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

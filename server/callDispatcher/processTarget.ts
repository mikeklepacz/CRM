import axios from 'axios';
import { storage } from '../storage';
import { handleCallFailure } from './failure';
import { initiateOutboundCall } from './outbound';

export async function processCallTarget(target: any, apiKey: string, useDirectElevenLabs: boolean): Promise<void> {
  const targetStart = Date.now();
  console.log('[CallDispatcher][DEBUG] ========== PROCESS CALL TARGET ==========');
  console.log('[CallDispatcher][DEBUG] Target ID:', target.id);
  console.log('[CallDispatcher][DEBUG] Client ID:', target.clientId);
  console.log('[CallDispatcher][DEBUG] Campaign ID:', target.campaignId);
  console.log('[CallDispatcher][DEBUG] Attempt count:', target.attemptCount);

  try {
    console.log('[CallDispatcher][DEBUG] Updating target status to in-progress...');
    await storage.updateCallCampaignTarget(target.id, target.tenantId, {
      targetStatus: 'in-progress',
      attemptCount: target.attemptCount + 1,
    });

    console.log('[CallDispatcher][DEBUG] Fetching client...');
    const client = await storage.getClient(target.clientId, target.tenantId);
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
    const campaign = await storage.getCallCampaign(target.campaignId, target.tenantId);
    if (!campaign) {
      throw new Error(`Campaign not found: ${target.campaignId}`);
    }
    console.log('[CallDispatcher][DEBUG] Campaign found:', campaign.name, 'agentId:', campaign.agentId);

    console.log('[CallDispatcher][DEBUG] Fetching agent...');
    const agent = await storage.getElevenLabsAgent(campaign.agentId, target.tenantId);
    if (!agent) {
      throw new Error(`Agent not found: ${campaign.agentId}`);
    }
    console.log('[CallDispatcher][DEBUG] Agent found:', agent.name, 'agentId:', agent.agentId);

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

      const data = agentDetailsResponse.data;
      agentPrompt = data.conversation_config?.agent?.prompt?.prompt
        || data.conversation_config?.prompt
        || '';
    } catch (error: any) {
    }

    const businessName = (clientData?.Name || clientData?.name || 'Unknown').replace(/[^a-zA-Z0-9]/g, '');
    const city = (clientData?.City || 'Unknown').replace(/[^a-zA-Z0-9]/g, '');
    const state = (clientData?.State || 'Unknown').replace(/[^a-zA-Z0-9]/g, '');
    const userId = `${businessName}_${city}_${state}`;

    const dynamicVariables: Record<string, string> = {
      name: clientData?.Name || clientData?.name || 'valued customer',
      poc_name: clientData?.['Point of Contact'] || clientData?.poc_name || '',
      shipping_address: clientData?.['Shipping Address'] || clientData?.shipping_address || '',
      poc_email: clientData?.['POC EMAIL'] || clientData?.poc_email || '',
    };

    const ivrBehaviorSetting = campaign.ivrBehavior || 'flag_and_end';
    let ivrInstructions = '';

    if (ivrBehaviorSetting === 'flag_and_navigate') {
      ivrInstructions = `\n\nIMPORTANT IVR HANDLING INSTRUCTIONS: If you encounter an automated phone system (IVR menu), you should attempt to navigate it using the play_keypad_touch_tone tool to reach a live person. Listen carefully for menu options like "Press 1 for Sales" or "Press 0 for Operator" and use the appropriate key press. Once you reach a live person, proceed with your normal conversation flow.`;
    } else {
      ivrInstructions = `\n\nIMPORTANT IVR HANDLING INSTRUCTIONS: If you encounter an automated phone system (IVR menu) or voicemail, you must politely end the call immediately. Do NOT attempt to navigate menus or leave messages. Simply say goodbye and hang up. The system will automatically flag this number for manual follow-up.`;
    }

    const combinedPrompt = agentPrompt + ivrInstructions;

    const connectionMode = useDirectElevenLabs ? 'direct' : 'proxy';
    const qualificationLeadId = clientData?.leadId || (client.uniqueIdentifier?.startsWith('lead:') ? client.uniqueIdentifier.replace('lead:', '') : null);

    console.log('[CallDispatcher][DEBUG] Creating call session...');
    console.log('[CallDispatcher][DEBUG] Connection mode:', connectionMode);
    const callSession = await storage.createCallSession({
      tenantId: target.tenantId,
      callSid: null,
      agentId: agent.agentId,
      phoneNumber,
      clientId: target.clientId,
      qualificationLeadId,
      status: 'initiated',
      connectionMode,
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
      const effectivePhoneNumberId = campaign.phoneNumberId || agent.phoneNumberId || '';
      let fromNumber: string | undefined;
      if (effectivePhoneNumberId) {
        const phoneRecord = await storage.getElevenLabsPhoneNumber(effectivePhoneNumberId, target.tenantId);
        fromNumber = phoneRecord?.phoneNumber;
        console.log('[CallDispatcher][DEBUG] Phone number lookup:', effectivePhoneNumberId, '->', fromNumber || 'NOT FOUND');
      }

      if (!fromNumber) {
        throw new Error(`No phone number found for agent. Agent phoneNumberId: ${agent.phoneNumberId}, Campaign phoneNumberId: ${campaign.phoneNumberId}`);
      }

      console.log('[CallDispatcher][DEBUG] Initiating outbound call...');
      const callStart = Date.now();
      const result = await initiateOutboundCall({
        apiKey,
        agentId: agent.agentId,
        phoneNumberId: campaign.phoneNumberId || agent.phoneNumberId || '',
        toNumber: phoneNumber,
        tenantId: target.tenantId,
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
        fromNumber: fromNumber,
        audioSettings: agent.sttEncoding || agent.ttsOutputFormat ? {
          sttEncoding: agent.sttEncoding || undefined,
          sttSampleRate: agent.sttSampleRate || undefined,
          ttsOutputFormat: agent.ttsOutputFormat || undefined,
        } : undefined,
      });
      console.log(`[CallDispatcher][DEBUG] Outbound call initiated in ${Date.now() - callStart}ms`);
      console.log('[CallDispatcher][DEBUG] Call SID:', result.callSid);
      console.log('[CallDispatcher][DEBUG] Success:', result.success);

      console.log('[CallDispatcher][DEBUG] Updating call session with callSid...');
      await storage.updateCallSession(callSession.id, target.tenantId, {
        callSid: result.callSid,
      });

      console.log('[CallDispatcher][DEBUG] Updating campaign target...');
      await storage.updateCallCampaignTarget(target.id, target.tenantId, {
        externalConversationId: result.callSid || null,
        callSessionId: callSession.id,
        lastError: null,
      });

      console.log(`[CallDispatcher][DEBUG] Target ${target.id} processed successfully in ${Date.now() - targetStart}ms`);
    } catch (twilioError: any) {
      console.error(`[CallDispatcher][DEBUG] *** TWILIO CALL FAILED ***`);
      console.error(`[CallDispatcher][DEBUG] Target: ${target.id}`);
      console.error(`[CallDispatcher][DEBUG] Error:`, twilioError);
      console.error(`[CallDispatcher][DEBUG] Cleaning up orphaned session: ${callSession.id}`);
      try {
        await storage.deleteCallSession(callSession.id, target.tenantId);
        console.log(`[CallDispatcher][DEBUG] Deleted orphaned call session ${callSession.id}`);
      } catch (cleanupError) {
        console.error(`[CallDispatcher][DEBUG] Failed to delete orphaned session ${callSession.id}:`, cleanupError);
      }
      throw twilioError;
    }
  } catch (error: any) {
    console.error(`[CallDispatcher][DEBUG] *** PROCESS CALL TARGET FAILED ***`);
    console.error(`[CallDispatcher][DEBUG] Target: ${target.id}`);
    console.error(`[CallDispatcher][DEBUG] Error:`, error);
    await handleCallFailure(target, error);
  }
}

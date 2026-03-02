import { eventGateway } from '../services/events/gateway';
import { generateStreamTwiML, initiateOutboundCall as twilioInitiateCall, isTwilioConfigured } from '../twilio-service';
import { storage } from '../storage';

export async function initiateOutboundCall(params: {
  apiKey: string;
  agentId: string;
  phoneNumberId: string;
  toNumber: string;
  tenantId: string;
  userId?: string;
  dynamicVariables?: Record<string, string>;
  clientData?: any;
  ivrBehavior?: string;
  basePrompt?: string;
  fromNumber?: string;
  audioSettings?: {
    sttEncoding?: string;
    sttSampleRate?: number;
    ttsOutputFormat?: string;
  };
}): Promise<{ success: boolean; message: string; conversation_id: string | null; callSid: string | null }> {
  const maskPhone = (phone: string) => phone.length > 4 ? `***${phone.slice(-4)}` : '****';

  eventGateway.emit('call:debug', {
    stage: 'dispatcher',
    message: 'Initiating outbound call',
    details: {
      toNumber: maskPhone(params.toNumber),
      agentId: params.agentId,
    },
    level: 'info',
  });

  if (!isTwilioConfigured()) {
    eventGateway.emit('call:debug', {
      stage: 'dispatcher',
      message: 'Twilio credentials not configured',
      details: {},
      level: 'error',
    });
    throw new Error('Twilio credentials not configured. Please set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN environment variables.');
  }

  const config = await storage.getElevenLabsConfig(params.tenantId);
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

  const clientDataWithMetadata = {
    ...params.clientData,
    ivrBehavior: ivrBehaviorSetting,
    userId: params.userId,
  };

  const useDirectMode = config.useDirectElevenLabs ?? false;
  const twiml = generateStreamTwiML({
    agentId: params.agentId,
    phoneNumberId: params.phoneNumberId,
    ivrBehavior: ivrBehaviorSetting,
    dynamicVariables: params.dynamicVariables,
    clientData: clientDataWithMetadata,
    basePrompt: params.basePrompt || '',
    useDirectElevenLabs: useDirectMode,
    elevenLabsApiKey: config.apiKey,
    audioSettings: params.audioSettings,
  });

  console.log(`[CallDispatcher] Connection mode: ${useDirectMode ? 'DIRECT ElevenLabs' : 'Fly.io Proxy'}`);

  eventGateway.emit('call:debug', {
    stage: 'dispatcher',
    message: 'TwiML generated, calling Twilio',
    details: { from: maskPhone(params.fromNumber!), to: maskPhone(params.toNumber) },
    level: 'info',
  });

  const result = await twilioInitiateCall({
    from: params.fromNumber!,
    to: params.toNumber,
    twiml: twiml,
  });

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
    conversation_id: null,
    callSid: result.callSid,
  };
}

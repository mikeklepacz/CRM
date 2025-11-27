import twilio from 'twilio';
import { eventGateway } from './services/events/gateway';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

if (!accountSid || !authToken) {
  console.warn('[Twilio] Credentials not configured. Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN environment variables.');
}

const client = accountSid && authToken ? twilio(accountSid, authToken) : null;

interface TwiMLStreamParams {
  agentId: string;
  phoneNumberId: string;
  ivrBehavior?: string;
  dynamicVariables?: Record<string, string>;
  clientData?: Record<string, any>;
  basePrompt?: string;
}

// Fly.io voice proxy URL - this handles WebSocket connections that Replit can't
const FLY_VOICE_PROXY_URL = process.env.FLY_VOICE_PROXY_URL || 'wss://hemp-voice-proxy.fly.dev/media-stream';

/**
 * Generates TwiML that connects to our WebSocket voice proxy on Fly.io
 * The proxy handles ElevenLabs connection, audio mixing, and background audio
 */
export function generateStreamTwiML(params: TwiMLStreamParams): string {
  const startTime = Date.now();
  console.log('[Twilio][DEBUG] ========== GENERATING TWIML ==========');
  console.log('[Twilio][DEBUG] Timestamp:', new Date().toISOString());
  console.log('[Twilio][DEBUG] Input params:', JSON.stringify({
    agentId: params.agentId,
    phoneNumberId: params.phoneNumberId,
    ivrBehavior: params.ivrBehavior,
    hasDynamicVariables: !!params.dynamicVariables,
    hasClientData: !!params.clientData,
    hasBasePrompt: !!params.basePrompt,
  }, null, 2));

  const VoiceResponse = twilio.twiml.VoiceResponse;
  const response = new VoiceResponse();
  
  // Use Fly.io WebSocket URL (Replit's proxy doesn't support inbound WebSocket from Twilio)
  const wsUrl = FLY_VOICE_PROXY_URL;
  
  console.log(`[Twilio][DEBUG] WebSocket URL: ${wsUrl}`);
  console.log(`[Twilio][DEBUG] FLY_VOICE_PROXY_URL env: ${process.env.FLY_VOICE_PROXY_URL || 'not set, using default'}`);
  
  // Emit debug event so user can see the WebSocket URL in Chrome DevTools
  eventGateway.emit('call:debug', {
    stage: 'twiml',
    message: 'Generated TwiML with Fly.io WebSocket URL',
    details: { 
      wsUrl, 
      isFlyio: true,
    },
    level: 'info',
  });
  
  // Connect to our WebSocket proxy
  const connect = response.connect();
  const stream = connect.stream({
    url: wsUrl,
    track: 'both_tracks' // Send and receive audio
  });
  
  // Pass parameters to the voice proxy via TwiML parameters
  // Note: basePrompt is NOT passed here due to Twilio's 4000 char TwiML limit
  // It will be retrieved by the voice proxy from the database instead
  stream.parameter({ name: 'agentId', value: params.agentId });
  stream.parameter({ name: 'phoneNumberId', value: params.phoneNumberId });
  
  if (params.ivrBehavior) {
    stream.parameter({ name: 'ivrBehavior', value: params.ivrBehavior });
  }
  
  if (params.dynamicVariables) {
    stream.parameter({ name: 'dynamicVariables', value: JSON.stringify(params.dynamicVariables) });
  }
  
  if (params.clientData) {
    stream.parameter({ name: 'clientData', value: JSON.stringify(params.clientData) });
  }
  
  const twimlOutput = response.toString();
  console.log('[Twilio][DEBUG] Generated TwiML:');
  console.log(twimlOutput);
  console.log(`[Twilio][DEBUG] TwiML generation took ${Date.now() - startTime}ms`);
  
  return twimlOutput;
}

interface InitiateCallParams {
  from: string;
  to: string;
  twiml: string;
}

/**
 * Initiates an outbound call using Twilio SDK
 * Returns the call SID for tracking
 */
export async function initiateOutboundCall(params: InitiateCallParams): Promise<{ callSid: string; success: boolean; message: string }> {
  const startTime = Date.now();
  console.log('[Twilio][DEBUG] ========== INITIATING OUTBOUND CALL ==========');
  console.log('[Twilio][DEBUG] Timestamp:', new Date().toISOString());
  console.log('[Twilio][DEBUG] From:', params.from);
  console.log('[Twilio][DEBUG] To:', params.to);
  console.log('[Twilio][DEBUG] TwiML length:', params.twiml?.length || 0);
  
  if (!client) {
    console.error('[Twilio][DEBUG] ERROR: Twilio client not configured!');
    console.error('[Twilio][DEBUG] TWILIO_ACCOUNT_SID set:', !!process.env.TWILIO_ACCOUNT_SID);
    console.error('[Twilio][DEBUG] TWILIO_AUTH_TOKEN set:', !!process.env.TWILIO_AUTH_TOKEN);
    throw new Error('Twilio client not configured. Please set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN environment variables.');
  }
  
  const statusCallbackUrl = `https://${process.env.REPLIT_DOMAINS?.split(',')[0]}/api/twilio/call-status`;
  console.log('[Twilio][DEBUG] Status callback URL:', statusCallbackUrl);
  console.log('[Twilio][DEBUG] REPLIT_DOMAINS:', process.env.REPLIT_DOMAINS);
  
  try {
    console.log('[Twilio][DEBUG] Calling Twilio API...');
    
    const callParams = {
      from: params.from,
      to: params.to,
      twiml: params.twiml,
      timeout: 60, // Ring for 60 seconds before giving up
      statusCallback: statusCallbackUrl,
      statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
      statusCallbackMethod: 'POST' as const
    };
    
    console.log('[Twilio][DEBUG] Call params (excluding twiml):', JSON.stringify({
      ...callParams,
      twiml: `[${params.twiml?.length || 0} chars]`
    }, null, 2));
    
    const call = await client.calls.create(callParams);
    
    console.log('[Twilio][DEBUG] ========== CALL CREATED SUCCESSFULLY ==========');
    console.log('[Twilio][DEBUG] Call SID:', call.sid);
    console.log('[Twilio][DEBUG] Call status:', call.status);
    console.log('[Twilio][DEBUG] Call direction:', call.direction);
    console.log('[Twilio][DEBUG] API call took:', Date.now() - startTime, 'ms');
    
    return {
      callSid: call.sid,
      success: true,
      message: 'Call initiated successfully'
    };
  } catch (error: any) {
    console.error('[Twilio][DEBUG] ========== CALL CREATION FAILED ==========');
    console.error('[Twilio][DEBUG] Error message:', error.message);
    console.error('[Twilio][DEBUG] Error code:', error.code);
    console.error('[Twilio][DEBUG] Error status:', error.status);
    console.error('[Twilio][DEBUG] Error moreInfo:', error.moreInfo);
    console.error('[Twilio][DEBUG] Full error:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    console.error('[Twilio][DEBUG] API call took:', Date.now() - startTime, 'ms');
    throw error;
  }
}

/**
 * Checks if Twilio credentials are configured
 */
export function isTwilioConfigured(): boolean {
  return !!(accountSid && authToken);
}

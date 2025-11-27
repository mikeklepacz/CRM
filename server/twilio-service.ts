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
  const VoiceResponse = twilio.twiml.VoiceResponse;
  const response = new VoiceResponse();
  
  // Use Fly.io WebSocket URL (Replit's proxy doesn't support inbound WebSocket from Twilio)
  const wsUrl = FLY_VOICE_PROXY_URL;
  
  console.log(`[Twilio] Generating TwiML with WebSocket URL: ${wsUrl}`);
  
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
  
  return response.toString();
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
  if (!client) {
    throw new Error('Twilio client not configured. Please set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN environment variables.');
  }
  
  try {
    
    const call = await client.calls.create({
      from: params.from,
      to: params.to,
      twiml: params.twiml,
      timeout: 60, // Ring for 60 seconds before giving up
      statusCallback: `https://${process.env.REPLIT_DOMAINS?.split(',')[0]}/api/twilio/call-status`,
      statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
      statusCallbackMethod: 'POST'
    });
    
    return {
      callSid: call.sid,
      success: true,
      message: 'Call initiated successfully'
    };
  } catch (error: any) {
    console.error('[Twilio] Error initiating call:', error.message);
    throw error;
  }
}

/**
 * Checks if Twilio credentials are configured
 */
export function isTwilioConfigured(): boolean {
  return !!(accountSid && authToken);
}

import { WebSocketServer, WebSocket as WSClient } from 'ws';
import { Server as HTTPServer } from 'http';
import { storage } from './storage.js';
import { audioConverter } from './audio-converter.js';
import { eventGateway } from './services/events/gateway.js';
import alawmulaw from 'alawmulaw';
import wavefile from 'wavefile';
const { WaveFile } = wavefile;

// Helper to mask sensitive data in debug output
function maskPhone(phone: string | undefined): string {
  if (!phone) return 'N/A';
  return phone.length > 4 ? `***${phone.slice(-4)}` : '****';
}

function maskSid(sid: string | undefined): string {
  if (!sid) return 'N/A';
  return sid.length > 8 ? `${sid.slice(0, 4)}...${sid.slice(-4)}` : sid;
}

// Helper to emit debug events to browser for real-time debugging
// Note: Only emits to users with admin role via SSE (scoped by tenant in production)
function emitDebug(stage: string, message: string, details: Record<string, any> = {}, level: 'info' | 'warn' | 'error' = 'info') {
  // Mask sensitive fields before emitting
  const sanitizedDetails = { ...details };
  if (sanitizedDetails.toNumber) sanitizedDetails.toNumber = maskPhone(sanitizedDetails.toNumber);
  if (sanitizedDetails.phoneNumber) sanitizedDetails.phoneNumber = maskPhone(sanitizedDetails.phoneNumber);
  if (sanitizedDetails.callSid) sanitizedDetails.callSid = maskSid(sanitizedDetails.callSid);
  if (sanitizedDetails.streamSid) sanitizedDetails.streamSid = maskSid(sanitizedDetails.streamSid);
  
  console.log(`[VoiceProxy Debug] ${stage}: ${message}`, sanitizedDetails);
  eventGateway.emit('call:debug', {
    stage,
    message,
    details: sanitizedDetails,
    level,
    timestamp: new Date().toISOString(),
  });
}

const SAMPLE_RATE_TWILIO = 8000; // Twilio uses 8kHz mulaw
const SAMPLE_RATE_ELEVENLABS = 16000; // ElevenLabs uses 16kHz PCM
const FRAME_SIZE_MS = 20;
const JITTER_BUFFER_MS = 50;

interface TwilioMediaMessage {
  event: string;
  streamSid?: string;
  media?: {
    payload: string;
    timestamp: string;
    chunk: string;
  };
  start?: {
    streamSid: string;
    accountSid: string;
    callSid: string;
    customParameters?: Record<string, string>;
  };
}

interface SessionState {
  streamSid: string;
  callSid: string;
  agentId: string;
  phoneNumberId: string;
  conversationId: string | null;
  twilioWs: WSClient;
  elevenLabsWs: WSClient | null;
  inputBuffer: Int16Array[];
  outputBuffer: Int16Array[];
  backgroundAudioBuffer: Int16Array | null;
  backgroundAudioPosition: number;
  volumeScalar: number;
  isActive: boolean;
  clientData?: Record<string, any>;
  // Latency tracking
  latencyMetrics: {
    twilioReceiveTimestamps: Map<string, number>; // chunk -> timestamp
    elevenLabsReceiveTimestamps: Map<number, number>; // sequence -> timestamp
    totalFramesProcessed: number;
    avgTwilioToElevenLabsMs: number;
    avgElevenLabsToTwilioMs: number;
    avgResamplingMs: number;
    avgMixingMs: number;
  };
}

class VoiceProxyServer {
  private sessions: Map<string, SessionState> = new Map();
  private wss: WebSocketServer | null = null;
  private connectionAttempts: number = 0; // Added to track connection attempts

  initialize(httpServer: HTTPServer): void {
    this.wss = new WebSocketServer({
      server: httpServer,
      path: '/media-stream'
    });


    this.wss.on('error', (error) => {
      console.error('[VoiceProxy] WebSocket server error:', error);
    });

    this.wss.on('connection', (ws: WSClient, req) => {
      this.connectionAttempts++;
      emitDebug('websocket', `New WebSocket connection #${this.connectionAttempts}`, { path: req.url });

      ws.on('message', async (data: Buffer) => {
        try {
          const message: TwilioMediaMessage = JSON.parse(data.toString());
          if (message.event === 'start') {
            emitDebug('twilio', `Stream START event received`, { 
              callSid: message.start?.callSid,
              streamSid: message.start?.streamSid,
              hasCustomParams: !!message.start?.customParameters,
            });
          }
          await this.handleTwilioMessage(ws, message);
        } catch (error: any) {
          emitDebug('twilio', `Error handling Twilio message`, { error: error?.message }, 'error');
        }
      });

      ws.on('close', () => {
        emitDebug('websocket', `Twilio WebSocket closed`);
        const session = this.findSessionByTwilioWs(ws);
        if (session) {
          this.endSession(session.streamSid);
        }
      });

      ws.on('error', (error: any) => {
        emitDebug('websocket', `Twilio WebSocket error`, { error: error?.message }, 'error');
      });
    });
  }

  private async handleTwilioMessage(ws: WSClient, message: TwilioMediaMessage): Promise<void> {
    switch (message.event) {
      case 'start':
        await this.handleStreamStart(ws, message);
        break;
      case 'media':
        await this.handleMediaFrame(message);
        break;
      case 'stop':
        await this.handleStreamStop(message);
        break;
    }
  }

  // Helper to retry session lookup with short delays (handles race condition with database commit)
  private async getCallSessionWithRetry(callSid: string, maxRetries: number = 5, delayMs: number = 100): Promise<any> {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const session = await storage.getCallSessionByCallSid(callSid);
      if (session) {
        if (attempt > 0) {
          console.log(`[VoiceProxy] Found call session on attempt ${attempt + 1} for callSid ${callSid}`);
        }
        return session;
      }
      if (attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
    console.warn(`[VoiceProxy] Call session not found after ${maxRetries} attempts for callSid ${callSid}`);
    return null;
  }

  private async handleStreamStart(ws: WSClient, message: TwilioMediaMessage): Promise<void> {
    if (!message.start) return;

    const { streamSid, callSid, customParameters } = message.start;

    // Extract all TwiML parameters
    const agentId = customParameters?.agentId;
    const phoneNumberId = customParameters?.phoneNumberId;
    const ivrBehavior = customParameters?.ivrBehavior || 'flag_and_end';
    const dynamicVariables = customParameters?.dynamicVariables
      ? JSON.parse(customParameters.dynamicVariables)
      : {};
    const clientData = customParameters?.clientData
      ? JSON.parse(customParameters.clientData)
      : {};

    // Retrieve basePrompt from call session storeSnapshot (not from TwiML due to 4000 char limit)
    // Use retry logic to handle race condition where session might not be committed yet
    const callSession = await this.getCallSessionWithRetry(callSid);
    const basePrompt = (callSession as any)?.storeSnapshot?.combinedPrompt || '';


    // Create session in database
    await storage.createVoiceProxySession({
      streamSid,
      callSid,
      agentId,
      status: 'active',
    });

    // Load background audio settings
    const settings = await storage.getBackgroundAudioSettings();
    let backgroundBuffer: Int16Array | null = null;
    let volumeScalar = 0.1; // Default -20dB

    if (settings?.filePath) {
      try {
        const audioData = await audioConverter.loadAudioFile(settings.filePath);
        const wav = new WaveFile(audioData);

        // Convert to Int16Array
        const samples = wav.getSamples(false, Int16Array);
        backgroundBuffer = samples instanceof Int16Array ? samples : new Int16Array(samples);

        // Calculate volume scalar from dB
        volumeScalar = Math.pow(10, settings.volumeDb / 20);
      } catch (error) {
        console.error('[VoiceProxy] Error loading background audio:', error);
      }
    }

    // Connect to ElevenLabs with all parameters (including IVR behavior via basePrompt)
    emitDebug('elevenlabs', 'Connecting to ElevenLabs...', { agentId, phoneNumberId });
    const { ws: elevenLabsWs, conversationId } = await this.connectToElevenLabs({
      agentId: agentId || '',
      phoneNumberId: phoneNumberId || '',
      dynamicVariables,
      clientData,
      basePrompt, // This already includes IVR instructions appended by CallDispatcher
    });

    // If ElevenLabs connection failed, end the call
    if (!elevenLabsWs) {
      emitDebug('elevenlabs', 'CRITICAL: Failed to connect to ElevenLabs', {
        streamSid,
        callSid,
        agentId,
        phoneNumberId,
        hasBasePrompt: !!basePrompt,
        basePromptLength: basePrompt?.length || 0,
      }, 'error');
      await storage.createVoiceProxySession({
        streamSid,
        callSid,
        agentId,
        status: 'failed',
      });
      ws.close();
      return;
    }
    
    emitDebug('elevenlabs', 'Successfully connected to ElevenLabs', { conversationId });

    const session: SessionState = {
      streamSid,
      callSid,
      agentId: agentId || '',
      phoneNumberId: phoneNumberId || '',
      conversationId,
      twilioWs: ws,
      elevenLabsWs,
      inputBuffer: [],
      outputBuffer: [],
      backgroundAudioBuffer: backgroundBuffer,
      backgroundAudioPosition: 0,
      volumeScalar,
      isActive: true,
      clientData,
      latencyMetrics: {
        twilioReceiveTimestamps: new Map(),
        elevenLabsReceiveTimestamps: new Map(),
        totalFramesProcessed: 0,
        avgTwilioToElevenLabsMs: 0,
        avgElevenLabsToTwilioMs: 0,
        avgResamplingMs: 0,
        avgMixingMs: 0,
      },
    };

    this.sessions.set(streamSid, session);

    // Update call session with conversation ID from ElevenLabs
    // This is critical for webhook correlation regardless of call type (campaign or manual)
    if (conversationId) {
      try {
        const callSession = await storage.getCallSessionByCallSid(callSid);
        if (callSession) {
          await storage.updateCallSession(callSession.id, {
            conversationId,
          });
        }
      } catch (error) {
        console.error('[VoiceProxy] Error updating call session:', error);
      }
    }

    // Set up ElevenLabs message handler
    if (elevenLabsWs) {
      elevenLabsWs.on('message', (data: Buffer) => {
        this.handleElevenLabsMessage(session, data);
      });

      elevenLabsWs.on('close', () => {
        session.isActive = false;
      });
    }

    // Start background audio mixing loop
    this.startMixingLoop(session);
  }

  private async connectToElevenLabs(params: {
    agentId: string;
    phoneNumberId: string;
    dynamicVariables?: Record<string, string>;
    clientData?: Record<string, any>;
    basePrompt?: string;
  }): Promise<{ ws: WSClient | null; conversationId: string | null }> {
    try {
      emitDebug('elevenlabs', 'Attempting ElevenLabs API connection', {
        agentId: params.agentId,
        phoneNumberId: params.phoneNumberId,
        hasBasePrompt: !!params.basePrompt,
        hasDynamicVars: !!params.dynamicVariables,
        hasClientData: !!params.clientData,
      });
      
      // Fetch API key from database (consistent with rest of codebase)
      const elevenLabsConfig = await storage.getElevenLabsConfig();
      if (!elevenLabsConfig?.apiKey) {
        emitDebug('elevenlabs', 'ElevenLabs API key not configured in settings', {}, 'error');
        return { ws: null, conversationId: null };
      }
      const apiKey = elevenLabsConfig.apiKey;
      emitDebug('elevenlabs', 'ElevenLabs API key found', { keyPrefix: apiKey.substring(0, 8) + '...' });

      // Build request payload with all parameters
      const payload: any = {
        agent_id: params.agentId,
      };

      // Add phone number ID if provided (required for outbound calls)
      if (params.phoneNumberId) {
        payload.agent_phone_number_id = params.phoneNumberId;
      }

      // Add dynamic variables for personalization
      if (params.dynamicVariables && Object.keys(params.dynamicVariables).length > 0) {
        payload.dynamic_variables = params.dynamicVariables;
      }

      // Add client data for tracking
      if (params.clientData) {
        payload.conversation_initiation_client_data = params.clientData;
      }

      // Add prompt override if provided (includes IVR instructions)
      if (params.basePrompt) {
        payload.conversation_config_override = {
          agent: {
            prompt: {
              prompt: params.basePrompt
            }
          }
        };
      }


      // Get signed URL for private agent with parameters
      const response = await fetch(
        `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${params.agentId}`,
        {
          method: 'POST',
          headers: {
            'xi-api-key': apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        }
      );

      // Check for HTTP errors
      if (!response.ok) {
        const errorText = await response.text();
        emitDebug('elevenlabs', `ElevenLabs API error (${response.status})`, { error: errorText }, 'error');
        return { ws: null, conversationId: null };
      }

      const data = await response.json();
      const { signed_url, conversation_id } = data;

      // Validate that we got the required data
      if (!signed_url) {
        emitDebug('elevenlabs', 'No signed_url in ElevenLabs response', { data }, 'error');
        return { ws: null, conversationId: null };
      }

      emitDebug('elevenlabs', 'Got signed URL, connecting WebSocket...', { conversationId: conversation_id });
      const ws = new WSClient(signed_url);

      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          console.error('[VoiceProxy] ElevenLabs WebSocket connection timeout (10s)');
          reject(new Error('WebSocket connection timeout'));
        }, 10000); // 10 second timeout

        ws.on('open', () => {
          clearTimeout(timeout);
          console.log('[VoiceProxy] ElevenLabs WebSocket connected successfully');
          resolve({ ws, conversationId: conversation_id });
        });

        ws.on('error', (error) => {
          clearTimeout(timeout);
          console.error('[VoiceProxy] ElevenLabs WebSocket error:', error);
          reject(error);
        });
      });
    } catch (error) {
      console.error('[VoiceProxy] Error connecting to ElevenLabs:', error);
      return { ws: null, conversationId: null };
    }
  }

  private async handleMediaFrame(message: TwilioMediaMessage): Promise<void> {
    if (!message.streamSid || !message.media) return;

    const session = this.sessions.get(message.streamSid);
    if (!session || !session.isActive) return;

    const twilioReceiveTime = Date.now();
    const chunkId = message.media.chunk;
    
    // Track when we received this from Twilio
    session.latencyMetrics.twilioReceiveTimestamps.set(chunkId, twilioReceiveTime);

    // Decode mulaw to PCM16
    const decodeStart = Date.now();
    const mulawData = Buffer.from(message.media.payload, 'base64');
    const pcm8k = alawmulaw.mulaw.decode(mulawData);

    // Resample from 8kHz to 16kHz (simple linear interpolation)
    const resampleStart = Date.now();
    const pcm16k = this.resample8to16(pcm8k);
    const resampleTime = Date.now() - resampleStart;
    
    // Update average resampling time
    const metrics = session.latencyMetrics;
    metrics.avgResamplingMs = (metrics.avgResamplingMs * metrics.totalFramesProcessed + resampleTime) / (metrics.totalFramesProcessed + 1);

    // Add to input buffer
    session.inputBuffer.push(pcm16k);

    // Send to ElevenLabs if connected
    if (session.elevenLabsWs?.readyState === WSClient.OPEN) {
      const sendStart = Date.now();
      const base64Audio = Buffer.from(pcm16k.buffer).toString('base64');
      session.elevenLabsWs.send(JSON.stringify({
        user_audio_chunk: base64Audio,
      }));
      
      const totalLatency = Date.now() - twilioReceiveTime;
      metrics.avgTwilioToElevenLabsMs = (metrics.avgTwilioToElevenLabsMs * metrics.totalFramesProcessed + totalLatency) / (metrics.totalFramesProcessed + 1);
    }
    
    metrics.totalFramesProcessed++;
    
    // Log every 100 frames
    if (metrics.totalFramesProcessed % 100 === 0) {
      console.log(`[VoiceProxy][Latency] Session ${session.streamSid}:`, {
        avgTwilioToElevenLabs: `${metrics.avgTwilioToElevenLabsMs.toFixed(2)}ms`,
        avgResampling: `${metrics.avgResamplingMs.toFixed(2)}ms`,
        avgMixing: `${metrics.avgMixingMs.toFixed(2)}ms`,
        totalFrames: metrics.totalFramesProcessed,
      });
    }
  }

  private handleElevenLabsMessage(session: SessionState, data: Buffer): void {
    try {
      const message = JSON.parse(data.toString());

      // Handle agent response with audio output
      if (message.type === 'agent_response' && message.agent_response) {
        const response = message.agent_response.response;
        if (response && response.output) {
          for (const output of response.output) {
            if (output.audio && output.audio.audio_base64) {
              // Decode base64 audio from ElevenLabs
              const audioData = Buffer.from(output.audio.audio_base64, 'base64');
              const pcm16k = new Int16Array(audioData.buffer, audioData.byteOffset, audioData.byteLength / 2);

              // Add to output buffer
              session.outputBuffer.push(pcm16k);
            }
          }
        }
      }

      // Handle agent response delta (streaming audio chunks)
      if (message.type === 'agent_response_delta' && message.agent_response_delta) {
        const delta = message.agent_response_delta;
        if (delta.audio && delta.audio.audio_base64) {
          // Decode base64 audio from ElevenLabs
          const audioData = Buffer.from(delta.audio.audio_base64, 'base64');
          const pcm16k = new Int16Array(audioData.buffer, audioData.byteOffset, audioData.byteLength / 2);

          // Add to output buffer
          session.outputBuffer.push(pcm16k);
        }
      }

      // Handle interruptions
      if (message.type === 'interruption') {
        // Clear output buffer on interruption
        session.outputBuffer = [];
      }

    } catch (error) {
      console.error('[VoiceProxy] Error handling ElevenLabs message:', error);
    }
  }

  private startMixingLoop(session: SessionState): void {
    const intervalMs = FRAME_SIZE_MS;
    const samplesPerFrame = Math.floor((SAMPLE_RATE_TWILIO * intervalMs) / 1000);

    const mixInterval = setInterval(() => {
      if (!session.isActive || session.twilioWs.readyState !== WSClient.OPEN) {
        clearInterval(mixInterval);
        return;
      }

      const mixStartTime = Date.now();

      // Get ElevenLabs output frame (16kHz)
      let outputFrame16k: Int16Array | null = null;
      if (session.outputBuffer.length > 0) {
        const frame = session.outputBuffer.shift();
        if (frame) {
          outputFrame16k = frame;
        }
      }

      // Mix with background audio if available
      let mixed16k: Int16Array;
      if (outputFrame16k) {
        mixed16k = outputFrame16k;
      } else {
        // Create silence frame
        mixed16k = new Int16Array(samplesPerFrame * 2); // 16kHz is 2x 8kHz
      }

      const bgMixStart = Date.now();
      // Add background audio
      if (session.backgroundAudioBuffer && session.backgroundAudioBuffer.length > 0) {
        for (let i = 0; i < mixed16k.length; i++) {
          const bgSample = session.backgroundAudioBuffer[session.backgroundAudioPosition];
          const bgScaled = Math.floor(bgSample * session.volumeScalar);

          // Mix: foreground + background (with clipping protection)
          mixed16k[i] = Math.max(-32768, Math.min(32767, mixed16k[i] + bgScaled));

          // Advance background position (loop)
          session.backgroundAudioPosition++;
          if (session.backgroundAudioPosition >= session.backgroundAudioBuffer.length) {
            session.backgroundAudioPosition = 0;
          }
        }
      }
      const bgMixTime = Date.now() - bgMixStart;

      // Resample 16kHz to 8kHz
      const resampleStart = Date.now();
      const mixed8k = this.resample16to8(mixed16k);

      // Encode to mulaw
      const mulawData = alawmulaw.mulaw.encode(mixed8k);

      // Send to Twilio
      const payload = Buffer.from(mulawData).toString('base64');
      session.twilioWs.send(JSON.stringify({
        event: 'media',
        streamSid: session.streamSid,
        media: {
          payload,
        },
      }));
      
      const totalMixTime = Date.now() - mixStartTime;
      const metrics = session.latencyMetrics;
      metrics.avgMixingMs = (metrics.avgMixingMs * metrics.totalFramesProcessed + totalMixTime) / (metrics.totalFramesProcessed + 1);
    }, intervalMs);
  }

  private resample8to16(input: Int16Array): Int16Array {
    // Simple linear interpolation: each sample becomes 2 samples
    const output = new Int16Array(input.length * 2);
    for (let i = 0; i < input.length - 1; i++) {
      output[i * 2] = input[i];
      output[i * 2 + 1] = Math.floor((input[i] + input[i + 1]) / 2);
    }
    output[output.length - 2] = input[input.length - 1];
    output[output.length - 1] = input[input.length - 1];
    return output;
  }

  private resample16to8(input: Int16Array): Int16Array {
    // Downsample: take every other sample
    const output = new Int16Array(Math.floor(input.length / 2));
    for (let i = 0; i < output.length; i++) {
      output[i] = input[i * 2];
    }
    return output;
  }

  private async handleStreamStop(message: TwilioMediaMessage): Promise<void> {
    if (!message.streamSid) return;
    await this.endSession(message.streamSid);
  }

  private async endSession(streamSid: string): Promise<void> {
    const session = this.sessions.get(streamSid);
    if (!session) return;


    session.isActive = false;

    // Close ElevenLabs connection
    if (session.elevenLabsWs) {
      session.elevenLabsWs.close();
    }

    // Update session status in database
    await storage.endVoiceProxySession(streamSid);

    this.sessions.delete(streamSid);
  }

  private findSessionByTwilioWs(ws: WSClient): SessionState | undefined {
    for (const session of Array.from(this.sessions.values())) {
      if (session.twilioWs === ws) {
        return session;
      }
    }
    return undefined;
  }

  getActiveSessionCount(): number {
    return this.sessions.size;
  }
}

export const voiceProxyServer = new VoiceProxyServer();
import { WebSocketServer, WebSocket as WSClient } from 'ws';
import { Server as HTTPServer } from 'http';
import { storage } from './storage.js';
import { audioConverter } from './audio-converter.js';
import alawmulaw from 'alawmulaw';
import WaveFile from 'wavefile';

const SAMPLE_RATE_TWILIO = 8000; // Twilio uses 8kHz mulaw
const SAMPLE_RATE_ELEVENLABS = 16000; // ElevenLabs uses 16kHz PCM
const FRAME_SIZE_MS = 20;
const JITTER_BUFFER_MS = 50;
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || '';

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
  twilioWs: WSClient;
  elevenLabsWs: WSClient | null;
  inputBuffer: Int16Array[];
  outputBuffer: Int16Array[];
  backgroundAudioBuffer: Int16Array | null;
  backgroundAudioPosition: number;
  volumeScalar: number;
  isActive: boolean;
}

class VoiceProxyServer {
  private sessions: Map<string, SessionState> = new Map();
  private wss: WebSocketServer | null = null;

  initialize(httpServer: HTTPServer): void {
    this.wss = new WebSocketServer({ 
      server: httpServer,
      path: '/media-stream'
    });

    console.log('[VoiceProxy] WebSocket server initialized on /media-stream');

    this.wss.on('connection', (ws: WSClient) => {
      console.log('[VoiceProxy] New Twilio connection');

      ws.on('message', async (data: Buffer) => {
        try {
          const message: TwilioMediaMessage = JSON.parse(data.toString());
          await this.handleTwilioMessage(ws, message);
        } catch (error) {
          console.error('[VoiceProxy] Error handling message:', error);
        }
      });

      ws.on('close', () => {
        console.log('[VoiceProxy] Twilio connection closed');
        const session = this.findSessionByTwilioWs(ws);
        if (session) {
          this.endSession(session.streamSid);
        }
      });

      ws.on('error', (error) => {
        console.error('[VoiceProxy] Twilio WebSocket error:', error);
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

  private async handleStreamStart(ws: WSClient, message: TwilioMediaMessage): Promise<void> {
    if (!message.start) return;

    const { streamSid, callSid, customParameters } = message.start;
    const agentId = customParameters?.agent_id || '';

    console.log(`[VoiceProxy] Stream started: ${streamSid}, agent: ${agentId}`);

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
        
        console.log(`[VoiceProxy] Loaded background audio: ${settings.fileName}, volume: ${settings.volumeDb}dB`);
      } catch (error) {
        console.error('[VoiceProxy] Error loading background audio:', error);
      }
    }

    // Connect to ElevenLabs
    const elevenLabsWs = await this.connectToElevenLabs(agentId);

    const session: SessionState = {
      streamSid,
      callSid,
      agentId,
      twilioWs: ws,
      elevenLabsWs,
      inputBuffer: [],
      outputBuffer: [],
      backgroundAudioBuffer: backgroundBuffer,
      backgroundAudioPosition: 0,
      volumeScalar,
      isActive: true,
    };

    this.sessions.set(streamSid, session);

    // Set up ElevenLabs message handler
    if (elevenLabsWs) {
      elevenLabsWs.on('message', (data: Buffer) => {
        this.handleElevenLabsMessage(session, data);
      });

      elevenLabsWs.on('close', () => {
        console.log(`[VoiceProxy] ElevenLabs connection closed for ${streamSid}`);
        session.isActive = false;
      });
    }

    // Start background audio mixing loop
    this.startMixingLoop(session);
  }

  private async connectToElevenLabs(agentId: string): Promise<WSClient | null> {
    try {
      if (!ELEVENLABS_API_KEY) {
        console.error('[VoiceProxy] ElevenLabs API key not configured');
        return null;
      }

      // Get signed URL for private agent
      const response = await fetch(
        `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${agentId}`,
        {
          headers: {
            'xi-api-key': ELEVENLABS_API_KEY,
          },
        }
      );

      const { signed_url } = await response.json();
      const ws = new WSClient(signed_url);

      return new Promise((resolve, reject) => {
        ws.on('open', () => {
          console.log(`[VoiceProxy] Connected to ElevenLabs for agent ${agentId}`);
          resolve(ws);
        });

        ws.on('error', (error) => {
          console.error('[VoiceProxy] ElevenLabs connection error:', error);
          reject(error);
        });
      });
    } catch (error) {
      console.error('[VoiceProxy] Error connecting to ElevenLabs:', error);
      return null;
    }
  }

  private async handleMediaFrame(message: TwilioMediaMessage): Promise<void> {
    if (!message.streamSid || !message.media) return;

    const session = this.sessions.get(message.streamSid);
    if (!session || !session.isActive) return;

    // Decode mulaw to PCM16
    const mulawData = Buffer.from(message.media.payload, 'base64');
    const pcm8k = alawmulaw.mulaw.decode(mulawData);

    // Resample from 8kHz to 16kHz (simple linear interpolation)
    const pcm16k = this.resample8to16(pcm8k);

    // Add to input buffer
    session.inputBuffer.push(pcm16k);

    // Send to ElevenLabs if connected
    if (session.elevenLabsWs?.readyState === WSClient.OPEN) {
      const base64Audio = Buffer.from(pcm16k.buffer).toString('base64');
      session.elevenLabsWs.send(JSON.stringify({
        user_audio_chunk: base64Audio,
      }));
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

      // Log unknown message types for debugging
      if (message.type && !['agent_response', 'agent_response_delta', 'interruption', 'ping'].includes(message.type)) {
        console.log(`[VoiceProxy] Unknown message type: ${message.type}`);
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

      // Resample 16kHz to 8kHz
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

    console.log(`[VoiceProxy] Ending session: ${streamSid}`);

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
    for (const session of this.sessions.values()) {
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

import Fastify from 'fastify';
import websocket from '@fastify/websocket';
import WebSocket from 'ws';
import alawmulaw from 'alawmulaw';
import wavefile from 'wavefile';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { WaveFile } = wavefile;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration from environment
const PORT = process.env.PORT || 8080;
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const BACKGROUND_AUDIO_URL = process.env.BACKGROUND_AUDIO_URL;
const BACKGROUND_VOLUME_DB = parseFloat(process.env.BACKGROUND_VOLUME_DB || '-25');

// Audio constants
const SAMPLE_RATE_TWILIO = 8000;
const SAMPLE_RATE_ELEVENLABS = 16000;
const FRAME_SIZE_MS = 20;

// Session state
const sessions = new Map();

// Background audio cache
let backgroundAudioBuffer = null;
let backgroundVolumeScalar = Math.pow(10, BACKGROUND_VOLUME_DB / 20);

// Load background audio on startup
async function loadBackgroundAudio() {
  // Try bundled file first, then URL
  const bundledPath = path.join(__dirname, 'background.wav');
  
  try {
    // Check if bundled file exists
    if (fs.existsSync(bundledPath)) {
      console.log('[VoiceProxy] Loading bundled background audio');
      const buffer = fs.readFileSync(bundledPath);
      const wav = new WaveFile(buffer);
      
      const samples = wav.getSamples(false, Int16Array);
      backgroundAudioBuffer = samples instanceof Int16Array ? samples : new Int16Array(samples);
      
      console.log('[VoiceProxy] Background audio loaded:', backgroundAudioBuffer.length, 'samples');
      return;
    }
    
    // Fallback to URL if configured
    if (BACKGROUND_AUDIO_URL) {
      console.log('[VoiceProxy] Loading background audio from URL:', BACKGROUND_AUDIO_URL);
      const response = await fetch(BACKGROUND_AUDIO_URL);
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.statusText}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const wav = new WaveFile(buffer);
      
      const samples = wav.getSamples(false, Int16Array);
      backgroundAudioBuffer = samples instanceof Int16Array ? samples : new Int16Array(samples);
      
      console.log('[VoiceProxy] Background audio loaded from URL:', backgroundAudioBuffer.length, 'samples');
      return;
    }
    
    console.log('[VoiceProxy] No background audio configured');
  } catch (error) {
    console.error('[VoiceProxy] Error loading background audio:', error);
  }
}

// Resample functions
function resample8to16(input) {
  const output = new Int16Array(input.length * 2);
  for (let i = 0; i < input.length - 1; i++) {
    output[i * 2] = input[i];
    output[i * 2 + 1] = Math.floor((input[i] + input[i + 1]) / 2);
  }
  output[output.length - 2] = input[input.length - 1];
  output[output.length - 1] = input[input.length - 1];
  return output;
}

function resample16to8(input) {
  const output = new Int16Array(Math.floor(input.length / 2));
  for (let i = 0; i < output.length; i++) {
    output[i] = input[i * 2];
  }
  return output;
}

// Connect to ElevenLabs
async function connectToElevenLabs(params) {
  const { agentId, phoneNumberId, dynamicVariables, clientData, basePrompt } = params;

  if (!ELEVENLABS_API_KEY) {
    console.error('[VoiceProxy] ELEVENLABS_API_KEY not configured');
    return { ws: null, conversationId: null };
  }

  try {
    console.log('[VoiceProxy] Connecting to ElevenLabs agent:', agentId);

    const payload = { agent_id: agentId };

    if (phoneNumberId) {
      payload.agent_phone_number_id = phoneNumberId;
    }

    if (dynamicVariables && Object.keys(dynamicVariables).length > 0) {
      payload.dynamic_variables = dynamicVariables;
    }

    if (clientData) {
      payload.conversation_initiation_client_data = clientData;
    }

    if (basePrompt) {
      payload.conversation_config_override = {
        agent: {
          prompt: { prompt: basePrompt }
        }
      };
    }

    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${agentId}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[VoiceProxy] ElevenLabs API error:', response.status, errorText);
      return { ws: null, conversationId: null };
    }

    const data = await response.json();
    const { signed_url, conversation_id } = data;

    if (!signed_url) {
      console.error('[VoiceProxy] No signed_url in response');
      return { ws: null, conversationId: null };
    }

    console.log('[VoiceProxy] Got signed URL, connecting WebSocket...');
    const ws = new WebSocket(signed_url);

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('WebSocket connection timeout'));
      }, 10000);

      ws.on('open', () => {
        clearTimeout(timeout);
        console.log('[VoiceProxy] ElevenLabs WebSocket connected');
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

// Handle ElevenLabs messages
function handleElevenLabsMessage(session, data) {
  try {
    const message = JSON.parse(data.toString());

    if (message.type === 'audio' && message.audio) {
      const audioBase64 = message.audio.chunk || message.audio.audio_base_64;
      if (audioBase64) {
        const audioData = Buffer.from(audioBase64, 'base64');
        const pcm16k = new Int16Array(audioData.buffer, audioData.byteOffset, audioData.byteLength / 2);
        session.outputBuffer.push(pcm16k);
      }
    }

    if (message.type === 'interruption') {
      session.outputBuffer = [];
    }

    if (message.type === 'ping' && message.ping_event?.event_id) {
      session.elevenLabsWs.send(JSON.stringify({
        type: 'pong',
        event_id: message.ping_event.event_id
      }));
    }

  } catch (error) {
    console.error('[VoiceProxy] Error handling ElevenLabs message:', error);
  }
}

// Start audio mixing loop
function startMixingLoop(session) {
  const intervalMs = FRAME_SIZE_MS;
  const samplesPerFrame = Math.floor((SAMPLE_RATE_TWILIO * intervalMs) / 1000);

  const mixInterval = setInterval(() => {
    if (!session.isActive) {
      clearInterval(mixInterval);
      return;
    }

    let outputFrame16k = null;
    if (session.outputBuffer.length > 0) {
      outputFrame16k = session.outputBuffer.shift();
    }

    let mixed16k;
    if (outputFrame16k) {
      mixed16k = outputFrame16k;
    } else {
      mixed16k = new Int16Array(samplesPerFrame * 2);
    }

    // Add background audio
    if (backgroundAudioBuffer && backgroundAudioBuffer.length > 0) {
      for (let i = 0; i < mixed16k.length; i++) {
        const bgSample = backgroundAudioBuffer[session.backgroundAudioPosition];
        const bgScaled = Math.floor(bgSample * backgroundVolumeScalar);

        mixed16k[i] = Math.max(-32768, Math.min(32767, mixed16k[i] + bgScaled));

        session.backgroundAudioPosition++;
        if (session.backgroundAudioPosition >= backgroundAudioBuffer.length) {
          session.backgroundAudioPosition = 0;
        }
      }
    }

    // Resample and encode
    const mixed8k = resample16to8(mixed16k);
    const mulawData = alawmulaw.mulaw.encode(mixed8k);
    const payload = Buffer.from(mulawData).toString('base64');

    try {
      session.twilioWs.send(JSON.stringify({
        event: 'media',
        streamSid: session.streamSid,
        media: { payload }
      }));
    } catch (error) {
      console.error('[VoiceProxy] Error sending to Twilio:', error);
      session.isActive = false;
    }
  }, intervalMs);

  session.mixInterval = mixInterval;
}

// Create Fastify server
const fastify = Fastify({ logger: true });

// Register WebSocket plugin
await fastify.register(websocket);

// Health check endpoint
fastify.get('/health', async (request, reply) => {
  return { status: 'ok', sessions: sessions.size };
});

// TwiML endpoint for Replit to redirect calls here
fastify.all('/twiml', async (request, reply) => {
  const host = request.headers.host;
  const params = request.query;
  
  // Build parameter XML
  let parameterXml = '';
  for (const [key, value] of Object.entries(params)) {
    parameterXml += `<Parameter name="${key}" value="${encodeURIComponent(String(value))}" />`;
  }

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="wss://${host}/media-stream">
      ${parameterXml}
    </Stream>
  </Connect>
</Response>`;

  reply.type('text/xml').send(twiml);
});

// WebSocket endpoint for Twilio media streams
fastify.register(async function (fastify) {
  fastify.get('/media-stream', { websocket: true }, (ws, req) => {
    console.log('[VoiceProxy] Twilio WebSocket connected');

    let session = null;

    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());

        switch (message.event) {
          case 'start':
            console.log('[VoiceProxy] Stream started:', message.start?.streamSid);
            
            const { streamSid, callSid, customParameters } = message.start || {};
            
            const agentId = customParameters?.agentId;
            const phoneNumberId = customParameters?.phoneNumberId;
            const dynamicVariables = customParameters?.dynamicVariables 
              ? JSON.parse(customParameters.dynamicVariables) 
              : {};
            const clientData = customParameters?.clientData
              ? JSON.parse(customParameters.clientData)
              : {};
            const basePrompt = customParameters?.basePrompt 
              ? decodeURIComponent(customParameters.basePrompt)
              : '';

            // Connect to ElevenLabs
            const { ws: elevenLabsWs, conversationId } = await connectToElevenLabs({
              agentId,
              phoneNumberId,
              dynamicVariables,
              clientData,
              basePrompt,
            });

            if (!elevenLabsWs) {
              console.error('[VoiceProxy] Failed to connect to ElevenLabs');
              ws.close();
              return;
            }

            session = {
              streamSid,
              callSid,
              agentId,
              conversationId,
              twilioWs: ws,
              elevenLabsWs,
              outputBuffer: [],
              backgroundAudioPosition: 0,
              isActive: true,
            };

            sessions.set(streamSid, session);

            // Handle ElevenLabs messages
            elevenLabsWs.on('message', (data) => {
              handleElevenLabsMessage(session, data);
            });

            elevenLabsWs.on('close', () => {
              console.log('[VoiceProxy] ElevenLabs disconnected');
              session.isActive = false;
            });

            elevenLabsWs.on('error', (error) => {
              console.error('[VoiceProxy] ElevenLabs error:', error);
            });

            // Start mixing loop
            startMixingLoop(session);

            // Notify Replit CRM about the connection (optional callback)
            if (customParameters?.callbackUrl) {
              try {
                await fetch(customParameters.callbackUrl, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ 
                    event: 'connected',
                    streamSid, 
                    callSid,
                    conversationId 
                  }),
                });
              } catch (error) {
                console.error('[VoiceProxy] Callback error:', error);
              }
            }
            break;

          case 'media':
            if (!session || !session.isActive) return;

            // Decode mulaw to PCM16
            const mulawData = Buffer.from(message.media.payload, 'base64');
            const pcm8k = alawmulaw.mulaw.decode(mulawData);
            const pcm16k = resample8to16(pcm8k);

            // Send to ElevenLabs
            if (session.elevenLabsWs?.readyState === WebSocket.OPEN) {
              const base64Audio = Buffer.from(pcm16k.buffer).toString('base64');
              session.elevenLabsWs.send(JSON.stringify({
                user_audio_chunk: base64Audio,
              }));
            }
            break;

          case 'stop':
            console.log('[VoiceProxy] Stream stopped:', message.streamSid);
            if (session) {
              session.isActive = false;
              if (session.mixInterval) {
                clearInterval(session.mixInterval);
              }
              if (session.elevenLabsWs) {
                session.elevenLabsWs.close();
              }
              sessions.delete(session.streamSid);
            }
            break;
        }
      } catch (error) {
        console.error('[VoiceProxy] Error handling message:', error);
      }
    });

    ws.on('close', () => {
      console.log('[VoiceProxy] Twilio WebSocket closed');
      if (session) {
        session.isActive = false;
        if (session.mixInterval) {
          clearInterval(session.mixInterval);
        }
        if (session.elevenLabsWs) {
          session.elevenLabsWs.close();
        }
        sessions.delete(session.streamSid);
      }
    });

    ws.on('error', (error) => {
      console.error('[VoiceProxy] Twilio WebSocket error:', error);
    });
  });
});

// Start server
async function start() {
  try {
    // Load background audio first
    await loadBackgroundAudio();
    
    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`[VoiceProxy] Server running on port ${PORT}`);
    console.log(`[VoiceProxy] Background audio: ${backgroundAudioBuffer ? 'loaded' : 'not configured'}`);
    console.log(`[VoiceProxy] Background volume: ${BACKGROUND_VOLUME_DB}dB`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

start();

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
const FLY_PROXY_SECRET = process.env.FLY_PROXY_SECRET || 'hemp-voice-proxy-secret-2024';
const REPLIT_CRM_URL = process.env.REPLIT_CRM_URL; // e.g., https://your-app.replit.app

// Audio constants
const SAMPLE_RATE_TWILIO = 8000;
const SAMPLE_RATE_ELEVENLABS = 16000;
const FRAME_SIZE_MS = 20;

// Session state
const sessions = new Map();

// Background audio state (dynamically configurable)
let backgroundAudioBuffer = null;
let backgroundVolumeDb = parseFloat(process.env.BACKGROUND_VOLUME_DB || '-25');
let backgroundVolumeScalar = Math.pow(10, backgroundVolumeDb / 20);
let audioSourceUrl = null;

// Update volume setting
function updateVolume(volumeDb) {
  backgroundVolumeDb = volumeDb;
  backgroundVolumeScalar = Math.pow(10, volumeDb / 20);
  console.log(`[VoiceProxy] Volume updated to ${volumeDb}dB (scalar: ${backgroundVolumeScalar.toFixed(4)})`);
}

// Load background audio from URL (Replit CRM)
async function loadBackgroundAudioFromUrl(url) {
  try {
    console.log('[VoiceProxy] Loading background audio from URL:', url);
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${FLY_PROXY_SECRET}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const wav = new WaveFile(buffer);
    
    const samples = wav.getSamples(false, Int16Array);
    backgroundAudioBuffer = samples instanceof Int16Array ? samples : new Int16Array(samples);
    audioSourceUrl = url;
    
    console.log('[VoiceProxy] Background audio loaded from URL:', backgroundAudioBuffer.length, 'samples');
    return true;
  } catch (error) {
    console.error('[VoiceProxy] Error loading background audio from URL:', error);
    return false;
  }
}

// Load background audio on startup
async function loadBackgroundAudio() {
  // Try Replit CRM URL first if configured
  if (REPLIT_CRM_URL) {
    const url = `${REPLIT_CRM_URL}/api/voice-proxy/background-audio/public`;
    const success = await loadBackgroundAudioFromUrl(url);
    if (success) return;
  }
  
  // Fallback to bundled file
  const bundledPath = path.join(__dirname, 'background.wav');
  
  try {
    if (fs.existsSync(bundledPath)) {
      console.log('[VoiceProxy] Loading bundled background audio (fallback)');
      const buffer = fs.readFileSync(bundledPath);
      const wav = new WaveFile(buffer);
      
      const samples = wav.getSamples(false, Int16Array);
      backgroundAudioBuffer = samples instanceof Int16Array ? samples : new Int16Array(samples);
      audioSourceUrl = 'bundled';
      
      console.log('[VoiceProxy] Background audio loaded:', backgroundAudioBuffer.length, 'samples');
      return;
    }
    
    console.log('[VoiceProxy] No background audio configured');
  } catch (error) {
    console.error('[VoiceProxy] Error loading background audio:', error);
  }
}

// Fetch current settings from Replit CRM
async function syncSettingsFromReplit() {
  if (!REPLIT_CRM_URL) return;
  
  try {
    const response = await fetch(`${REPLIT_CRM_URL}/api/voice-proxy/background-audio/settings-public`, {
      headers: {
        'Authorization': `Bearer ${FLY_PROXY_SECRET}`
      }
    });
    
    if (response.ok) {
      const settings = await response.json();
      if (settings.volumeDb !== undefined) {
        updateVolume(settings.volumeDb);
      }
    }
  } catch (error) {
    console.error('[VoiceProxy] Error syncing settings:', error);
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
  const connectStart = Date.now();
  const { agentId, phoneNumberId, dynamicVariables, clientData, basePrompt } = params;

  console.log('[VoiceProxy][DEBUG] ========== CONNECTING TO ELEVENLABS ==========');
  console.log('[VoiceProxy][DEBUG] Timestamp:', new Date().toISOString());
  console.log('[VoiceProxy][DEBUG] Agent ID:', agentId);
  console.log('[VoiceProxy][DEBUG] Phone Number ID:', phoneNumberId);
  console.log('[VoiceProxy][DEBUG] Has dynamic variables:', !!dynamicVariables);
  console.log('[VoiceProxy][DEBUG] Has client data:', !!clientData);
  console.log('[VoiceProxy][DEBUG] Has base prompt:', !!basePrompt);

  if (!ELEVENLABS_API_KEY) {
    console.error('[VoiceProxy][DEBUG] *** ELEVENLABS_API_KEY NOT CONFIGURED ***');
    return { ws: null, conversationId: null };
  }
  console.log('[VoiceProxy][DEBUG] API key configured: yes (length:', ELEVENLABS_API_KEY.length, ')');

  try {
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

    console.log('[VoiceProxy][DEBUG] Payload keys:', Object.keys(payload));
    console.log('[VoiceProxy][DEBUG] Calling ElevenLabs get-signed-url API...');
    
    const apiStart = Date.now();
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
    console.log(`[VoiceProxy][DEBUG] API response in ${Date.now() - apiStart}ms`);
    console.log('[VoiceProxy][DEBUG] Response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[VoiceProxy][DEBUG] *** ELEVENLABS API ERROR ***');
      console.error('[VoiceProxy][DEBUG] Status:', response.status);
      console.error('[VoiceProxy][DEBUG] Response:', errorText);
      return { ws: null, conversationId: null };
    }

    const data = await response.json();
    console.log('[VoiceProxy][DEBUG] API response data keys:', Object.keys(data));
    
    const { signed_url, conversation_id } = data;

    if (!signed_url) {
      console.error('[VoiceProxy][DEBUG] *** NO SIGNED_URL IN RESPONSE ***');
      console.error('[VoiceProxy][DEBUG] Full response:', JSON.stringify(data, null, 2));
      return { ws: null, conversationId: null };
    }

    console.log('[VoiceProxy][DEBUG] Got signed URL (length:', signed_url.length, ')');
    console.log('[VoiceProxy][DEBUG] Conversation ID:', conversation_id);
    console.log('[VoiceProxy][DEBUG] Connecting ElevenLabs WebSocket...');
    
    const ws = new WebSocket(signed_url);

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        console.error('[VoiceProxy][DEBUG] *** ELEVENLABS WEBSOCKET TIMEOUT (10s) ***');
        reject(new Error('WebSocket connection timeout'));
      }, 10000);

      ws.on('open', () => {
        clearTimeout(timeout);
        console.log('[VoiceProxy][DEBUG] ========== ELEVENLABS WEBSOCKET CONNECTED ==========');
        console.log(`[VoiceProxy][DEBUG] Total connection time: ${Date.now() - connectStart}ms`);
        resolve({ ws, conversationId: conversation_id });
      });

      ws.on('error', (error) => {
        clearTimeout(timeout);
        console.error('[VoiceProxy][DEBUG] *** ELEVENLABS WEBSOCKET ERROR ***');
        console.error('[VoiceProxy][DEBUG] Error:', error);
        reject(error);
      });
    });
  } catch (error) {
    console.error('[VoiceProxy][DEBUG] *** ELEVENLABS CONNECTION EXCEPTION ***');
    console.error('[VoiceProxy][DEBUG] Error:', error);
    console.error('[VoiceProxy][DEBUG] Stack:', error.stack);
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

// Log ALL incoming requests at the lowest level
fastify.addHook('onRequest', async (request, reply) => {
  const isUpgrade = request.headers.upgrade?.toLowerCase() === 'websocket';
  console.log(`[VoiceProxy][DEBUG] === INCOMING REQUEST ===`);
  console.log(`[VoiceProxy][DEBUG] Timestamp: ${new Date().toISOString()}`);
  console.log(`[VoiceProxy][DEBUG] Method: ${request.method}`);
  console.log(`[VoiceProxy][DEBUG] URL: ${request.url}`);
  console.log(`[VoiceProxy][DEBUG] Is WebSocket Upgrade: ${isUpgrade}`);
  if (isUpgrade) {
    console.log(`[VoiceProxy][DEBUG] *** WEBSOCKET UPGRADE REQUEST DETECTED ***`);
    console.log(`[VoiceProxy][DEBUG] Headers:`, JSON.stringify(request.headers, null, 2));
  }
});

// Register WebSocket plugin
await fastify.register(websocket);

// Health check endpoint
fastify.get('/health', async (request, reply) => {
  return { 
    status: 'ok', 
    sessions: sessions.size,
    audioLoaded: !!backgroundAudioBuffer,
    audioSource: audioSourceUrl,
    volumeDb: backgroundVolumeDb,
  };
});

// Config update endpoint (called by Replit when settings change)
fastify.post('/config', async (request, reply) => {
  // Verify auth
  const authHeader = request.headers.authorization;
  if (!authHeader || authHeader !== `Bearer ${FLY_PROXY_SECRET}`) {
    return reply.status(401).send({ error: 'Unauthorized' });
  }
  
  const { action, volumeDb, audioUrl } = request.body || {};
  
  const result = { success: true, actions: [] };
  
  // Update volume
  if (volumeDb !== undefined) {
    updateVolume(volumeDb);
    result.actions.push(`Volume set to ${volumeDb}dB`);
  }
  
  // Reload audio from URL
  if (action === 'reload-audio' || audioUrl) {
    const url = audioUrl || (REPLIT_CRM_URL ? `${REPLIT_CRM_URL}/api/voice-proxy/background-audio/public` : null);
    if (url) {
      const success = await loadBackgroundAudioFromUrl(url);
      result.actions.push(success ? 'Audio reloaded' : 'Audio reload failed');
      result.audioReloadSuccess = success;
    } else {
      result.actions.push('No audio URL available');
    }
  }
  
  // Sync all settings from Replit
  if (action === 'sync') {
    await syncSettingsFromReplit();
    result.actions.push('Settings synced');
  }
  
  console.log('[VoiceProxy] Config updated:', result);
  return result;
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

// Debug: List active sessions
fastify.get('/sessions', async (request, reply) => {
  const sessionList = [];
  for (const [streamSid, session] of sessions.entries()) {
    sessionList.push({
      streamSid,
      callSid: session.callSid,
      agentId: session.agentId,
      conversationId: session.conversationId,
      isActive: session.isActive,
      backgroundAudioPosition: session.backgroundAudioPosition,
      outputBufferSize: session.outputBuffer?.length || 0,
      elevenLabsConnected: session.elevenLabsWs?.readyState === WebSocket.OPEN,
    });
  }
  return { 
    activeSessions: sessions.size,
    sessions: sessionList,
    backgroundAudioLoaded: !!backgroundAudioBuffer,
    volumeDb: backgroundVolumeDb,
  };
});

// Simple WebSocket test endpoint - for debugging connectivity
fastify.register(async function (fastify) {
  fastify.get('/ws-test', { websocket: true }, (connection, req) => {
    const ws = connection.socket; // In @fastify/websocket, connection.socket is the actual WebSocket
    console.log('[VoiceProxy][DEBUG] ========== WS-TEST CONNECTION ==========');
    console.log('[VoiceProxy][DEBUG] Timestamp:', new Date().toISOString());
    console.log('[VoiceProxy][DEBUG] Headers:', JSON.stringify(req.headers, null, 2));
    
    ws.send(JSON.stringify({ 
      event: 'connected', 
      message: 'WebSocket test endpoint working!',
      timestamp: new Date().toISOString()
    }));
    
    ws.on('message', (data) => {
      console.log('[VoiceProxy][DEBUG] WS-TEST received:', data.toString());
      ws.send(JSON.stringify({ 
        event: 'echo', 
        data: data.toString(),
        timestamp: new Date().toISOString()
      }));
    });
    
    ws.on('close', (code, reason) => {
      console.log('[VoiceProxy][DEBUG] WS-TEST closed. Code:', code, 'Reason:', reason?.toString());
    });
    
    ws.on('error', (error) => {
      console.error('[VoiceProxy][DEBUG] WS-TEST error:', error);
    });
  });
});

// WebSocket endpoint for Twilio media streams
fastify.register(async function (fastify) {
  fastify.get('/media-stream', { websocket: true }, (connection, req) => {
    const ws = connection.socket; // In @fastify/websocket, connection.socket is the actual WebSocket
    const connectTime = Date.now();
    console.log('[VoiceProxy][DEBUG] ========== TWILIO WEBSOCKET CONNECTED ==========');
    console.log('[VoiceProxy][DEBUG] Connection time:', new Date().toISOString());
    console.log('[VoiceProxy][DEBUG] Request headers:', JSON.stringify(req.headers, null, 2));
    console.log('[VoiceProxy][DEBUG] Request URL:', req.url);

    let session = null;
    let messageCount = 0;
    let firstMediaReceived = false;

    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        messageCount++;

        // Log every message type for debugging
        if (message.event !== 'media') {
          console.log(`[VoiceProxy][DEBUG] Message #${messageCount} event: ${message.event}`);
        }

        switch (message.event) {
          case 'start':
            console.log('[VoiceProxy][DEBUG] ========== STREAM START EVENT ==========');
            console.log('[VoiceProxy][DEBUG] Stream started:', message.start?.streamSid);
            console.log('[VoiceProxy][DEBUG] Full start message:', JSON.stringify(message.start, null, 2));
            
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
            let elevenLabsMessageCount = 0;
            elevenLabsWs.on('message', (data) => {
              elevenLabsMessageCount++;
              if (elevenLabsMessageCount <= 5 || elevenLabsMessageCount % 100 === 0) {
                try {
                  const msg = JSON.parse(data.toString());
                  console.log(`[VoiceProxy][DEBUG] ElevenLabs message #${elevenLabsMessageCount} type: ${msg.type}`);
                } catch (e) {}
              }
              handleElevenLabsMessage(session, data);
            });

            elevenLabsWs.on('close', (code, reason) => {
              console.log('[VoiceProxy][DEBUG] ========== ELEVENLABS DISCONNECTED ==========');
              console.log('[VoiceProxy][DEBUG] Timestamp:', new Date().toISOString());
              console.log('[VoiceProxy][DEBUG] Correlation: streamSid=' + session.streamSid + ', callSid=' + session.callSid + ', conversationId=' + session.conversationId);
              console.log('[VoiceProxy][DEBUG] Close code:', code);
              console.log('[VoiceProxy][DEBUG] Close reason:', reason?.toString() || 'none');
              console.log('[VoiceProxy][DEBUG] Messages received:', elevenLabsMessageCount);
              console.log('[VoiceProxy][DEBUG] Connection duration:', Date.now() - connectTime, 'ms');
              session.isActive = false;
            });

            elevenLabsWs.on('error', (error) => {
              console.error('[VoiceProxy][DEBUG] *** ELEVENLABS WEBSOCKET ERROR ***');
              console.error('[VoiceProxy][DEBUG] Timestamp:', new Date().toISOString());
              console.error('[VoiceProxy][DEBUG] Correlation: streamSid=' + session?.streamSid + ', callSid=' + session?.callSid + ', conversationId=' + session?.conversationId);
              console.error('[VoiceProxy][DEBUG] Error:', error);
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

            // Log first media frame
            if (!firstMediaReceived) {
              firstMediaReceived = true;
              console.log('[VoiceProxy][DEBUG] ========== FIRST MEDIA FRAME RECEIVED ==========');
              console.log('[VoiceProxy][DEBUG] Time since connect:', Date.now() - connectTime, 'ms');
              console.log('[VoiceProxy][DEBUG] Payload length:', message.media?.payload?.length);
            }

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
            } else if (messageCount % 50 === 0) {
              console.log('[VoiceProxy][DEBUG] ElevenLabs WS not open, state:', session.elevenLabsWs?.readyState);
            }
            break;

          case 'stop':
            console.log('[VoiceProxy][DEBUG] ========== STREAM STOP EVENT ==========');
            console.log('[VoiceProxy][DEBUG] Stream SID:', message.streamSid);
            console.log('[VoiceProxy][DEBUG] Time since connect:', Date.now() - connectTime, 'ms');
            console.log('[VoiceProxy][DEBUG] Total messages processed:', messageCount);
            console.log('[VoiceProxy][DEBUG] First media received:', firstMediaReceived);
            if (session) {
              console.log('[VoiceProxy][DEBUG] Session was active:', session.isActive);
              console.log('[VoiceProxy][DEBUG] Conversation ID:', session.conversationId);
              session.isActive = false;
              if (session.mixInterval) {
                clearInterval(session.mixInterval);
              }
              if (session.elevenLabsWs) {
                console.log('[VoiceProxy][DEBUG] Closing ElevenLabs WebSocket');
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

    ws.on('close', (code, reason) => {
      console.log('[VoiceProxy][DEBUG] ========== TWILIO WEBSOCKET CLOSED ==========');
      console.log('[VoiceProxy][DEBUG] Timestamp:', new Date().toISOString());
      console.log('[VoiceProxy][DEBUG] Correlation: streamSid=' + (session?.streamSid || 'N/A') + ', callSid=' + (session?.callSid || 'N/A') + ', conversationId=' + (session?.conversationId || 'N/A'));
      console.log('[VoiceProxy][DEBUG] Close code:', code);
      console.log('[VoiceProxy][DEBUG] Close reason:', reason?.toString() || 'none');
      console.log('[VoiceProxy][DEBUG] Total messages received:', messageCount);
      console.log('[VoiceProxy][DEBUG] First media received:', firstMediaReceived);
      console.log('[VoiceProxy][DEBUG] Session existed:', !!session);
      console.log('[VoiceProxy][DEBUG] Connection duration:', Date.now() - connectTime, 'ms');
      
      if (session) {
        console.log('[VoiceProxy][DEBUG] Cleaning up session:', session.streamSid);
        console.log('[VoiceProxy][DEBUG] Session was active:', session.isActive);
        session.isActive = false;
        if (session.mixInterval) {
          clearInterval(session.mixInterval);
        }
        if (session.elevenLabsWs) {
          console.log('[VoiceProxy][DEBUG] Closing ElevenLabs WebSocket from Twilio close handler');
          session.elevenLabsWs.close();
        }
        sessions.delete(session.streamSid);
      }
    });

    ws.on('error', (error) => {
      console.error('[VoiceProxy][DEBUG] *** TWILIO WEBSOCKET ERROR ***');
      console.error('[VoiceProxy][DEBUG] Timestamp:', new Date().toISOString());
      console.error('[VoiceProxy][DEBUG] Correlation: streamSid=' + (session?.streamSid || 'N/A') + ', callSid=' + (session?.callSid || 'N/A'));
      console.error('[VoiceProxy][DEBUG] Error:', error);
    });
  });
});

// Start server
async function start() {
  try {
    // Load background audio first
    await loadBackgroundAudio();
    
    // Sync settings from Replit if available
    await syncSettingsFromReplit();
    
    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`[VoiceProxy] Server running on port ${PORT}`);
    console.log(`[VoiceProxy] Background audio: ${backgroundAudioBuffer ? 'loaded' : 'not configured'}`);
    console.log(`[VoiceProxy] Background volume: ${backgroundVolumeDb}dB`);
    console.log(`[VoiceProxy] Audio source: ${audioSourceUrl || 'none'}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

start();

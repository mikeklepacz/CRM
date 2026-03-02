import { WebSocket as WSClient } from 'ws';
import { storage } from '../storage.js';
import { audioConverter } from '../audio-converter.js';
import wavefile from 'wavefile';
import { connectToElevenLabs } from './elevenlabs';
import { emitDebug } from './debug';
import type { SessionState, TwilioMediaMessage } from './types';

const { WaveFile } = wavefile;

export async function getCallSessionWithRetry(callSid: string, maxRetries: number = 5, delayMs: number = 100): Promise<any> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const session = await storage.getCallSessionByCallSidOnly(callSid);
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

export async function handleStreamStartCore(params: {
  ws: WSClient;
  message: TwilioMediaMessage;
  sessions: Map<string, SessionState>;
  onElevenLabsMessage: (session: SessionState, data: Buffer) => void;
  onStartMixingLoop: (session: SessionState) => void;
}): Promise<void> {
  const { ws, message, sessions, onElevenLabsMessage, onStartMixingLoop } = params;
  if (!message.start) return;

  const { streamSid, callSid, customParameters } = message.start;

  const agentId = customParameters?.agentId;
  const phoneNumberId = customParameters?.phoneNumberId;
  const dynamicVariables = customParameters?.dynamicVariables
    ? JSON.parse(customParameters.dynamicVariables)
    : {};
  const clientData = customParameters?.clientData
    ? JSON.parse(customParameters.clientData)
    : {};

  const callSession = await getCallSessionWithRetry(callSid);
  const basePrompt = (callSession as any)?.storeSnapshot?.combinedPrompt || '';

  await (storage as any).createVoiceProxySession({
    streamSid,
    callSid,
    agentId,
    status: 'active',
  });

  const settings = await storage.getBackgroundAudioSettings();
  let backgroundBuffer: Int16Array | null = null;
  let volumeScalar = 0.1;

  if (settings?.filePath) {
    try {
      const audioData = await audioConverter.loadAudioFile(settings.filePath);
      const wav = new WaveFile(audioData);

      const samples = wav.getSamples(false, Int16Array);
      backgroundBuffer = samples instanceof Int16Array ? samples : new Int16Array(samples);

      volumeScalar = Math.pow(10, settings.volumeDb / 20);
    } catch (error) {
      console.error('[VoiceProxy] Error loading background audio:', error);
    }
  }

  emitDebug('elevenlabs', 'Connecting to ElevenLabs...', { agentId, phoneNumberId });
  const { ws: elevenLabsWs, conversationId } = await connectToElevenLabs({
    agentId: agentId || '',
    phoneNumberId: phoneNumberId || '',
    dynamicVariables,
    clientData,
    basePrompt,
  });

  if (!elevenLabsWs) {
    emitDebug('elevenlabs', 'CRITICAL: Failed to connect to ElevenLabs', {
      streamSid,
      callSid,
      agentId,
      phoneNumberId,
      hasBasePrompt: !!basePrompt,
      basePromptLength: basePrompt?.length || 0,
    }, 'error');
    await (storage as any).createVoiceProxySession({
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

  sessions.set(streamSid, session);

  if (conversationId) {
    try {
      const callSession = await storage.getCallSessionByCallSidOnly(callSid);
      if (callSession) {
        await storage.updateCallSession(callSession.id, callSession.tenantId, {
          conversationId,
        });
      }
    } catch (error) {
      console.error('[VoiceProxy] Error updating call session:', error);
    }
  }

  if (elevenLabsWs) {
    elevenLabsWs.on('message', (data: Buffer) => {
      onElevenLabsMessage(session, data);
    });

    elevenLabsWs.on('close', () => {
      session.isActive = false;
    });
  }

  onStartMixingLoop(session);
}

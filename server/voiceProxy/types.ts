import { WebSocket as WSClient } from 'ws';

export const SAMPLE_RATE_TWILIO = 8000;
export const SAMPLE_RATE_ELEVENLABS = 16000;
export const FRAME_SIZE_MS = 20;
export const JITTER_BUFFER_MS = 50;

export interface TwilioMediaMessage {
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

export interface SessionState {
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
  latencyMetrics: {
    twilioReceiveTimestamps: Map<string, number>;
    elevenLabsReceiveTimestamps: Map<number, number>;
    totalFramesProcessed: number;
    avgTwilioToElevenLabsMs: number;
    avgElevenLabsToTwilioMs: number;
    avgResamplingMs: number;
    avgMixingMs: number;
  };
}

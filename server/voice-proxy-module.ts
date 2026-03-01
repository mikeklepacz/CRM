import { WebSocketServer, WebSocket as WSClient } from 'ws';
import { Server as HTTPServer } from 'http';
import { storage } from './storage.js';
import { eventGateway } from './services/events/gateway.js';
import alawmulaw from 'alawmulaw';
import { emitDebug } from './voiceProxy/debug';
import { handleStreamStartCore } from './voiceProxy/streamStart';
import { FRAME_SIZE_MS, SAMPLE_RATE_TWILIO, type SessionState, type TwilioMediaMessage } from './voiceProxy/types';

class VoiceProxyServer {
  private sessions: Map<string, SessionState> = new Map();
  private wss: WebSocketServer | null = null;
  private connectionAttempts: number = 0;

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

  private async handleStreamStart(ws: WSClient, message: TwilioMediaMessage): Promise<void> {
    await handleStreamStartCore({
      ws,
      message,
      sessions: this.sessions,
      onElevenLabsMessage: (session, data) => this.handleElevenLabsMessage(session, data),
      onStartMixingLoop: (session) => this.startMixingLoop(session),
    });
  }

  private async handleMediaFrame(message: TwilioMediaMessage): Promise<void> {
    if (!message.streamSid || !message.media) return;

    const session = this.sessions.get(message.streamSid);
    if (!session || !session.isActive) return;

    const twilioReceiveTime = Date.now();
    const chunkId = message.media.chunk;

    session.latencyMetrics.twilioReceiveTimestamps.set(chunkId, twilioReceiveTime);

    const mulawData = Buffer.from(message.media.payload, 'base64');
    const pcm8k = alawmulaw.mulaw.decode(mulawData);

    const resampleStart = Date.now();
    const pcm16k = this.resample8to16(pcm8k);
    const resampleTime = Date.now() - resampleStart;

    const metrics = session.latencyMetrics;
    metrics.avgResamplingMs = (metrics.avgResamplingMs * metrics.totalFramesProcessed + resampleTime) / (metrics.totalFramesProcessed + 1);

    session.inputBuffer.push(pcm16k);

    if (session.elevenLabsWs?.readyState === WSClient.OPEN) {
      const base64Audio = Buffer.from(pcm16k.buffer).toString('base64');
      session.elevenLabsWs.send(JSON.stringify({
        user_audio_chunk: base64Audio,
      }));

      const totalLatency = Date.now() - twilioReceiveTime;
      metrics.avgTwilioToElevenLabsMs = (metrics.avgTwilioToElevenLabsMs * metrics.totalFramesProcessed + totalLatency) / (metrics.totalFramesProcessed + 1);
    }

    metrics.totalFramesProcessed++;

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

      if (message.type === 'agent_response' && message.agent_response) {
        const response = message.agent_response.response;
        if (response && response.output) {
          for (const output of response.output) {
            if (output.audio && output.audio.audio_base64) {
              const audioData = Buffer.from(output.audio.audio_base64, 'base64');
              const pcm16k = new Int16Array(audioData.buffer, audioData.byteOffset, audioData.byteLength / 2);

              session.outputBuffer.push(pcm16k);
            }
          }
        }
      }

      if (message.type === 'agent_response_delta' && message.agent_response_delta) {
        const delta = message.agent_response_delta;
        if (delta.audio && delta.audio.audio_base64) {
          const audioData = Buffer.from(delta.audio.audio_base64, 'base64');
          const pcm16k = new Int16Array(audioData.buffer, audioData.byteOffset, audioData.byteLength / 2);

          session.outputBuffer.push(pcm16k);
        }
      }

      if (message.type === 'interruption') {
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

      let outputFrame16k: Int16Array | null = null;
      if (session.outputBuffer.length > 0) {
        const frame = session.outputBuffer.shift();
        if (frame) {
          outputFrame16k = frame;
        }
      }

      let mixed16k: Int16Array;
      if (outputFrame16k) {
        mixed16k = outputFrame16k;
      } else {
        mixed16k = new Int16Array(samplesPerFrame * 2);
      }

      if (session.backgroundAudioBuffer && session.backgroundAudioBuffer.length > 0) {
        for (let i = 0; i < mixed16k.length; i++) {
          const bgSample = session.backgroundAudioBuffer[session.backgroundAudioPosition];
          const bgScaled = Math.floor(bgSample * session.volumeScalar);

          mixed16k[i] = Math.max(-32768, Math.min(32767, mixed16k[i] + bgScaled));

          session.backgroundAudioPosition++;
          if (session.backgroundAudioPosition >= session.backgroundAudioBuffer.length) {
            session.backgroundAudioPosition = 0;
          }
        }
      }

      const mixed8k = this.resample16to8(mixed16k);
      const mulawData = alawmulaw.mulaw.encode(mixed8k);

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

    if (session.elevenLabsWs) {
      session.elevenLabsWs.close();
    }

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

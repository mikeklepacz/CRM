import { WebSocket as WSClient } from 'ws';
import { storage } from '../storage.js';
import { emitDebug } from './debug';

export async function connectToElevenLabs(params: {
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

    const elevenLabsConfig = await (storage as any).getElevenLabsConfig();
    if (!elevenLabsConfig?.apiKey) {
      emitDebug('elevenlabs', 'ElevenLabs API key not configured in settings', {}, 'error');
      return { ws: null, conversationId: null };
    }
    const apiKey = elevenLabsConfig.apiKey;
    emitDebug('elevenlabs', 'ElevenLabs API key found', { keyPrefix: apiKey.substring(0, 8) + '...' });

    const payload: any = {
      agent_id: params.agentId,
    };

    if (params.phoneNumberId) {
      payload.agent_phone_number_id = params.phoneNumberId;
    }

    if (params.dynamicVariables && Object.keys(params.dynamicVariables).length > 0) {
      payload.dynamic_variables = params.dynamicVariables;
    }

    if (params.clientData) {
      payload.conversation_initiation_client_data = params.clientData;
    }

    payload.conversation_config_override = {
      agent: {
        ...(params.basePrompt && {
          prompt: {
            prompt: params.basePrompt
          }
        })
      },
      tts: {
        output_format: 'pcm_16000'
      }
    };

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

    if (!response.ok) {
      const errorText = await response.text();
      emitDebug('elevenlabs', `ElevenLabs API error (${response.status})`, { error: errorText }, 'error');
      return { ws: null, conversationId: null };
    }

    const data = await response.json();
    const { signed_url, conversation_id } = data;

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
      }, 10000);

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

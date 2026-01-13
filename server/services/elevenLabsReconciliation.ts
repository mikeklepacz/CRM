import axios from 'axios';
import { storage } from '../storage';
import { analyzeTranscript } from './aiTranscriptAnalysis';
import { analyzeCallTranscript } from '../openai-reflection';

interface ElevenLabsConversation {
  conversation_id: string;
  agent_id: string;
  status: string;
  start_time: number;
  end_time?: number;
  metadata?: Record<string, any>;
}

interface ElevenLabsTranscriptTurn {
  role: 'agent' | 'user';
  message: string;
  time_in_call_secs?: number;
}

interface ReconciliationResult {
  processed: number;
  matched: number;
  analysisTriggered: number;
  errors: string[];
}

async function fetchElevenLabsConversations(
  apiKey: string,
  agentId?: string,
  limit: number = 100
): Promise<ElevenLabsConversation[]> {
  try {
    const params: Record<string, any> = { limit };
    if (agentId) {
      params.agent_id = agentId;
    }
    
    const response = await axios.get('https://api.elevenlabs.io/v1/convai/conversations', {
      headers: { 'xi-api-key': apiKey },
      params,
    });
    
    return response.data?.conversations || [];
  } catch (error: any) {
    console.error('[Reconciliation] Error fetching ElevenLabs conversations:', error.message);
    return [];
  }
}

async function fetchConversationDetails(
  apiKey: string,
  conversationId: string
): Promise<{ transcript?: ElevenLabsTranscriptTurn[]; metadata?: Record<string, any> } | null> {
  try {
    const response = await axios.get(
      `https://api.elevenlabs.io/v1/convai/conversations/${conversationId}`,
      { headers: { 'xi-api-key': apiKey } }
    );
    
    return {
      transcript: response.data?.transcript || [],
      metadata: response.data?.metadata || {},
    };
  } catch (error: any) {
    console.error(`[Reconciliation] Error fetching conversation ${conversationId}:`, error.message);
    return null;
  }
}

export async function reconcileOrphanedCallSessions(tenantId: string): Promise<ReconciliationResult> {
  const result: ReconciliationResult = {
    processed: 0,
    matched: 0,
    analysisTriggered: 0,
    errors: [],
  };
  
  console.log(`[Reconciliation] Starting reconciliation for tenant ${tenantId}`);
  
  try {
    const config = await storage.getElevenLabsConfig(tenantId);
    if (!config?.apiKey) {
      result.errors.push('ElevenLabs API key not configured');
      return result;
    }
    
    const orphanedSessions = await storage.getOrphanedCallSessions(tenantId);
    console.log(`[Reconciliation] Found ${orphanedSessions.length} orphaned sessions`);
    
    if (orphanedSessions.length === 0) {
      return result;
    }
    
    const agentIds = [...new Set(orphanedSessions.map(s => s.agentId).filter(Boolean))];
    console.log(`[Reconciliation] Unique agent IDs:`, agentIds);
    
    const allConversations: ElevenLabsConversation[] = [];
    for (const agentId of agentIds) {
      const conversations = await fetchElevenLabsConversations(config.apiKey, agentId, 100);
      allConversations.push(...conversations);
    }
    
    console.log(`[Reconciliation] Fetched ${allConversations.length} conversations from ElevenLabs`);
    
    const matchedConversationIds = new Set<string>();
    
    for (const session of orphanedSessions) {
      result.processed++;
      
      if (!session.agentId || !session.startedAt) {
        continue;
      }
      
      const sessionStartTime = new Date(session.startedAt).getTime();
      const TWO_MINUTES_MS = 2 * 60 * 1000;
      
      const matchingConversations = allConversations.filter(conv => {
        if (conv.agent_id !== session.agentId) return false;
        if (matchedConversationIds.has(conv.conversation_id)) return false;
        
        const convStartTime = conv.start_time * 1000;
        const timeDiff = Math.abs(sessionStartTime - convStartTime);
        return timeDiff <= TWO_MINUTES_MS;
      });
      
      matchingConversations.sort((a, b) => {
        const diffA = Math.abs(new Date(session.startedAt!).getTime() - a.start_time * 1000);
        const diffB = Math.abs(new Date(session.startedAt!).getTime() - b.start_time * 1000);
        return diffA - diffB;
      });
      
      const match = matchingConversations[0];
      
      if (match) {
        console.log(`[Reconciliation] Matched session ${session.id} to conversation ${match.conversation_id}`);
        matchedConversationIds.add(match.conversation_id);
        result.matched++;
        
        try {
          await storage.updateCallSession(session.id, tenantId, {
            conversationId: match.conversation_id,
          });
          
          const details = await fetchConversationDetails(config.apiKey, match.conversation_id);
          if (details?.transcript && details.transcript.length > 0) {
            for (const turn of details.transcript) {
              await storage.createCallTranscript({
                conversationId: match.conversation_id,
                role: turn.role,
                message: turn.message,
                timeInCallSecs: turn.time_in_call_secs || 0,
              });
            }
            console.log(`[Reconciliation] Stored ${details.transcript.length} transcript turns`);
          }
          
          analyzeCallTranscript(match.conversation_id, tenantId).catch(err => {
            console.error(`[Reconciliation] AI reflection error:`, err.message);
          });
          
          analyzeTranscript(session.id, tenantId).catch(err => {
            console.error(`[Reconciliation] Qualification analysis error:`, err.message);
          });
          
          result.analysisTriggered++;
          
        } catch (updateError: any) {
          result.errors.push(`Failed to update session ${session.id}: ${updateError.message}`);
        }
      } else {
        console.log(`[Reconciliation] No match found for session ${session.id} (agent: ${session.agentId}, started: ${session.startedAt})`);
      }
    }
    
  } catch (error: any) {
    result.errors.push(`Reconciliation error: ${error.message}`);
  }
  
  console.log(`[Reconciliation] Complete:`, result);
  return result;
}

let reconciliationInterval: NodeJS.Timeout | null = null;

export function startReconciliationWorker(intervalMs: number = 10 * 60 * 1000): void {
  if (reconciliationInterval) {
    console.log('[Reconciliation] Worker already running');
    return;
  }
  
  console.log(`[Reconciliation] Starting background worker (interval: ${intervalMs / 1000}s)`);
  
  reconciliationInterval = setInterval(async () => {
    try {
      const tenants = await storage.getAllTenants();
      
      for (const tenant of tenants) {
        if (tenant.status !== 'active') continue;
        
        try {
          await reconcileOrphanedCallSessions(tenant.id);
        } catch (tenantError: any) {
          console.error(`[Reconciliation] Error for tenant ${tenant.id}:`, tenantError.message);
        }
      }
    } catch (error: any) {
      console.error('[Reconciliation] Worker error:', error.message);
    }
  }, intervalMs);
}

export function stopReconciliationWorker(): void {
  if (reconciliationInterval) {
    clearInterval(reconciliationInterval);
    reconciliationInterval = null;
    console.log('[Reconciliation] Worker stopped');
  }
}

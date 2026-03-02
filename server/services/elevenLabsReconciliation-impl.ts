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
  agentId: string,
  startTimeUnix?: number,
  endTimeUnix?: number
): Promise<ElevenLabsConversation[]> {
  try {
    const allConversations: ElevenLabsConversation[] = [];
    let cursor: string | undefined;
    const pageSize = 100;
    let pages = 0;
    const maxPages = 10;
    
    do {
      const params: Record<string, any> = { 
        limit: pageSize,
        agent_id: agentId,
      };
      if (cursor) params.cursor = cursor;
      
      const response = await axios.get('https://api.elevenlabs.io/v1/convai/conversations', {
        headers: { 'xi-api-key': apiKey },
        params,
      });
      
      const conversations: ElevenLabsConversation[] = response.data?.conversations || [];
      
      for (const conv of conversations) {
        if (startTimeUnix && conv.start_time < startTimeUnix) continue;
        if (endTimeUnix && conv.start_time > endTimeUnix) continue;
        allConversations.push(conv);
      }
      
      cursor = response.data?.next_cursor;
      pages++;
      
      if (conversations.length > 0) {
        const oldestInPage = Math.min(...conversations.map(c => c.start_time));
        if (startTimeUnix && oldestInPage < startTimeUnix) {
          break;
        }
      }
      
    } while (cursor && pages < maxPages);
    
    return allConversations;
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
    
    const timestamps = orphanedSessions
      .filter(s => s.startedAt)
      .map(s => new Date(s.startedAt!).getTime());
    
    const earliestSession = Math.min(...timestamps);
    const latestSession = Math.max(...timestamps);
    
    const startTimeUnix = Math.floor((earliestSession - 5 * 60 * 1000) / 1000);
    const endTimeUnix = Math.floor((latestSession + 5 * 60 * 1000) / 1000);
    
    const agentIds = [...new Set(orphanedSessions.map(s => s.agentId).filter(Boolean))] as string[];
    console.log(`[Reconciliation] Unique agent IDs:`, agentIds);
    console.log(`[Reconciliation] Time range: ${new Date(startTimeUnix * 1000).toISOString()} - ${new Date(endTimeUnix * 1000).toISOString()}`);
    
    const conversationsByAgent = new Map<string, ElevenLabsConversation[]>();
    for (const agentId of agentIds) {
      const conversations = await fetchElevenLabsConversations(
        config.apiKey, 
        agentId, 
        startTimeUnix, 
        endTimeUnix
      );
      conversationsByAgent.set(agentId, conversations);
      console.log(`[Reconciliation] Agent ${agentId}: fetched ${conversations.length} conversations`);
    }
    
    const matchedConversationIds = new Set<string>();
    
    for (const session of orphanedSessions) {
      result.processed++;
      
      if (!session.agentId || !session.startedAt) {
        continue;
      }
      
      const agentConversations = conversationsByAgent.get(session.agentId) || [];
      const sessionStartTime = new Date(session.startedAt).getTime();
      const TWO_MINUTES_MS = 2 * 60 * 1000;
      
      const matchingConversations = agentConversations.filter(conv => {
        if (matchedConversationIds.has(conv.conversation_id)) return false;
        
        const convStartTime = conv.start_time * 1000;
        const timeDiff = Math.abs(sessionStartTime - convStartTime);
        return timeDiff <= TWO_MINUTES_MS;
      });
      
      matchingConversations.sort((a, b) => {
        const diffA = Math.abs(sessionStartTime - a.start_time * 1000);
        const diffB = Math.abs(sessionStartTime - b.start_time * 1000);
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
          
          const existingTranscripts = await storage.getCallTranscripts(match.conversation_id);
          
          if (existingTranscripts.length === 0) {
            const details = await fetchConversationDetails(config.apiKey, match.conversation_id);
            if (details?.transcript && details.transcript.length > 0) {
              const transcriptsToInsert = details.transcript.map(turn => ({
                tenantId,
                conversationId: match.conversation_id,
                role: turn.role as 'agent' | 'user',
                message: turn.message,
                timeInCallSecs: turn.time_in_call_secs || 0,
              }));
              
              await storage.bulkCreateCallTranscripts(transcriptsToInsert);
              console.log(`[Reconciliation] Stored ${transcriptsToInsert.length} transcript turns (bulk)`);
            }
          } else {
            console.log(`[Reconciliation] Transcripts already exist for ${match.conversation_id}, skipping`);
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

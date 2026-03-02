import type {
  Client,
  CallHistory,
  InsertCallHistory,
  ElevenLabsPhoneNumber,
  InsertElevenLabsPhoneNumber,
  ElevenLabsAgent,
  InsertElevenLabsAgent,
  CallSession,
  InsertCallSession,
  CallTranscript,
  InsertCallTranscript,
  CallEvent,
  InsertCallEvent,
  CallCampaign,
  InsertCallCampaign,
  CallCampaignTarget,
  InsertCallCampaignTarget,
  NonDuplicate,
  BackgroundAudioSettings,
  InsertBackgroundAudioSettings,
  VoiceProxySession,
  InsertVoiceProxySession,
} from "./shared-types";

export interface CallManagerStorageContract {
  // Call History operations
  createCallHistory(callData: InsertCallHistory): Promise<CallHistory>;
  getUserCallHistory(userId: string, tenantId: string): Promise<CallHistory[]>;
  getAllCallHistory(tenantId: string, agentId?: string): Promise<CallHistory[]>;

  // ElevenLabs settings operations
  // projectId is optional - if provided, looks for project-specific config first, then falls back to tenant-wide (projectId=null)
  getElevenLabsConfig(tenantId: string, projectId?: string | null): Promise<{ apiKey: string; twilioNumber?: string; webhookSecret?: string; phoneNumberId?: string; useDirectElevenLabs?: boolean; projectId?: string | null } | undefined>;
  updateElevenLabsConfig(tenantId: string, config: { apiKey?: string; twilioNumber?: string; webhookSecret?: string; phoneNumberId?: string }, projectId?: string | null): Promise<void>;
  updateElevenLabsConfigDirectMode(tenantId: string, useDirectElevenLabs: boolean, projectId?: string | null): Promise<void>;

  // ElevenLabs Phone Numbers operations
  getAllElevenLabsPhoneNumbers(tenantId: string): Promise<ElevenLabsPhoneNumber[]>;
  getElevenLabsPhoneNumbers(tenantId: string): Promise<ElevenLabsPhoneNumber[]>;
  getElevenLabsPhoneNumber(phoneNumberId: string, tenantId: string): Promise<ElevenLabsPhoneNumber | undefined>;
  upsertElevenLabsPhoneNumber(phoneData: InsertElevenLabsPhoneNumber): Promise<ElevenLabsPhoneNumber>;
  deleteElevenLabsPhoneNumber(phoneNumberId: string, tenantId: string): Promise<void>;

  getAllElevenLabsAgents(tenantId: string, projectId?: string): Promise<ElevenLabsAgent[]>;
  getElevenLabsAgents(tenantId: string): Promise<ElevenLabsAgent[]>;
  getElevenLabsAgent(id: string, tenantId: string): Promise<ElevenLabsAgent | undefined>;
  getDefaultElevenLabsAgent(tenantId: string): Promise<ElevenLabsAgent | undefined>;
  createElevenLabsAgent(agent: InsertElevenLabsAgent): Promise<ElevenLabsAgent>;
  updateElevenLabsAgent(id: string, tenantId: string, updates: Partial<InsertElevenLabsAgent>): Promise<ElevenLabsAgent>;
  deleteElevenLabsAgent(id: string, tenantId: string): Promise<void>;
  setDefaultElevenLabsAgent(id: string, tenantId: string): Promise<void>;

  // Voice AI Call Sessions operations
  createCallSession(session: InsertCallSession): Promise<CallSession>;
  getCallSession(id: string, tenantId: string): Promise<CallSession | undefined>;
  getCallSessionByConversationId(conversationId: string, tenantId: string): Promise<CallSession | undefined>;
  getCallSessionByCallSid(callSid: string, tenantId: string): Promise<CallSession | undefined>;
  getCallSessionByCallSidOnly(callSid: string): Promise<CallSession | undefined>; // For external webhooks without tenant context
  getOrphanedCallSessions(tenantId: string): Promise<CallSession[]>; // Sessions completed but missing conversation_id or analysis
  getCallSessions(tenantId: string, filters?: { clientId?: string; initiatedByUserId?: string; status?: string; qualificationLeadId?: string }): Promise<CallSession[]>;
  updateCallSession(id: string, tenantId: string, updates: Partial<InsertCallSession>): Promise<CallSession>;
  updateCallSessionByConversationId(conversationId: string, tenantId: string, updates: Partial<InsertCallSession>): Promise<CallSession>;
  deleteCallSession(id: string, tenantId: string): Promise<void>;

  // Call Transcripts operations
  createCallTranscript(transcript: InsertCallTranscript): Promise<CallTranscript>;
  getCallTranscripts(conversationId: string): Promise<CallTranscript[]>;
  bulkCreateCallTranscripts(transcripts: InsertCallTranscript[]): Promise<void>;
  deleteCallTranscripts(conversationId: string): Promise<void>;

  // AI Insights helper operations
  getCallsWithTranscripts(filters: { startDate?: string; endDate?: string; agentId?: string; limit?: number; onlyUnanalyzed?: boolean; conversationIds?: string[] }): Promise<Array<{
    session: CallSession;
    transcripts: CallTranscript[];
    client: Client;
  }>>;
  markCallsAsAnalyzed(conversationIds: string[]): Promise<void>;

  // Call Events operations
  createCallEvent(event: InsertCallEvent): Promise<CallEvent>;
  getCallEvents(conversationId: string): Promise<CallEvent[]>;

  // Call Campaigns operations
  createCallCampaign(campaign: InsertCallCampaign): Promise<CallCampaign>;
  getCallCampaign(id: string, tenantId: string): Promise<CallCampaign | undefined>;
  getCallCampaigns(tenantId: string, filters?: { createdByUserId?: string; status?: string }): Promise<CallCampaign[]>;
  updateCallCampaign(id: string, tenantId: string, updates: Partial<InsertCallCampaign>): Promise<CallCampaign>;

  // Call Campaign Targets operations
  createCallCampaignTarget(target: InsertCallCampaignTarget): Promise<CallCampaignTarget>;
  getCallCampaignTarget(id: string, tenantId: string): Promise<CallCampaignTarget | undefined>;
  getCallCampaignTargets(campaignId: string, tenantId: string): Promise<CallCampaignTarget[]>;
  getCallTargetsBySession(conversationId: string, tenantId: string): Promise<CallCampaignTarget[]>;
  getCallTargetsReadyForCalling(): Promise<CallCampaignTarget[]>;
  updateCallCampaignTarget(id: string, tenantId: string, updates: Partial<InsertCallCampaignTarget>): Promise<CallCampaignTarget>;
  incrementCampaignCalls(campaignId: string, tenantId: string, type: 'successful' | 'failed'): Promise<void>;

  // Nuke call test data (for testing)
  nukeAllCallData(): Promise<{ sessionsDeleted: number; historyDeleted: number; transcriptsDeleted: number; eventsDeleted: number; targetsDeleted: number; campaignsDeleted: number }>;

  // Non-duplicate operations
  markAsNotDuplicate(link1: string, link2: string, userId: string, tenantId: string): Promise<NonDuplicate>;
  isMarkedAsNotDuplicate(link1: string, link2: string): Promise<boolean>;
  getAllNonDuplicates(): Promise<NonDuplicate[]>;
  removeNonDuplicateMark(link1: string, link2: string): Promise<void>;

  // Stale target cleanup
  getStaleInProgressTargets(beforeDate: Date): Promise<any[]>;
  
  // Stale call session cleanup
  getStaleInitiatedSessions(beforeDate: Date): Promise<CallSession[]>;
  markStaleSessionsAsFailed(beforeDate: Date): Promise<number>;

  // Background Audio Settings operations
  getBackgroundAudioSettings(): Promise<BackgroundAudioSettings | undefined>;
  updateBackgroundAudioSettings(settings: InsertBackgroundAudioSettings): Promise<BackgroundAudioSettings>;

  // Voice Proxy Session operations
  createVoiceProxySession(session: InsertVoiceProxySession): Promise<VoiceProxySession>;
  getVoiceProxySession(streamSid: string): Promise<VoiceProxySession | undefined>;
  getActiveVoiceProxySessions(): Promise<VoiceProxySession[]>;
  updateVoiceProxySession(id: string, updates: Partial<InsertVoiceProxySession>): Promise<VoiceProxySession>;
  endVoiceProxySession(streamSid: string): Promise<void>;

}

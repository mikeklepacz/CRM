import type { StorageRuntimeContract } from "../storage.runtime-contract";

import {
  getAiInsightByIdStorage,
  getAiInsightsHistoryStorage,
  saveAiInsightStorage,
} from "../storage-modules/aiInsightStorage";

import {
  createCallCampaignStorage,
  createCallCampaignTargetStorage,
  getCallCampaignStorage,
  getCallCampaignTargetStorage,
  getCallCampaignTargetsStorage,
  getCallCampaignsStorage,
  getCallTargetsBySessionStorage,
  getCallTargetsReadyForCallingStorage,
  incrementCampaignCallsStorage,
  updateCallCampaignStorage,
  updateCallCampaignTargetStorage,
} from "../storage-modules/callCampaignStorage";

import {
  nukeAllAnalysisStorage,
  nukeAllCallDataStorage,
} from "../storage-modules/callDataMaintenanceStorage";

import {
  createCallEventStorage,
  getCallEventsStorage,
} from "../storage-modules/callEventStorage";

import {
  getCallsWithTranscriptsStorage,
} from "../storage-modules/callInsightHelperStorage";

import {
  createCallSessionStorage,
  deleteCallSessionStorage,
  getCallSessionByCallSidOnlyStorage,
  getCallSessionByCallSidStorage,
  getCallSessionByConversationIdStorage,
  getCallSessionStorage,
  getCallSessionsStorage,
  getOrphanedCallSessionsStorage,
  markCallsAsAnalyzedStorage,
  updateCallSessionByConversationIdStorage,
  updateCallSessionStorage,
} from "../storage-modules/callSessionStorage";

import {
  bulkCreateCallTranscriptsStorage,
  createCallTranscriptStorage,
  deleteCallTranscriptsStorage,
  getCallTranscriptsStorage,
} from "../storage-modules/callTranscriptStorage";

import {
  createElevenLabsAgentStorage,
  deleteElevenLabsAgentStorage,
  deleteElevenLabsPhoneNumberStorage,
  getAllElevenLabsAgentsStorage,
  getAllElevenLabsPhoneNumbersStorage,
  getDefaultElevenLabsAgentStorage,
  getElevenLabsAgentStorage,
  getElevenLabsAgentsStorage,
  getElevenLabsConfigStorage,
  getElevenLabsPhoneNumberStorage,
  getElevenLabsPhoneNumbersStorage,
  setDefaultElevenLabsAgentStorage,
  updateElevenLabsAgentStorage,
  updateElevenLabsConfigDirectModeStorage,
  updateElevenLabsConfigStorage,
  upsertElevenLabsPhoneNumberStorage,
} from "../storage-modules/elevenLabsStorage";

export const elevenLabsCallAiMethods: Partial<StorageRuntimeContract> = {
  // ElevenLabs settings operations
  // If projectId provided, looks for project-specific config first, then falls back to tenant-wide (projectId=null)
  async getElevenLabsConfig(tenantId, projectId?) {
      return await getElevenLabsConfigStorage(tenantId, projectId);
  },

  async updateElevenLabsConfig(tenantId, configData, projectId?) {
      await updateElevenLabsConfigStorage(tenantId, configData, projectId);
  },

  async updateElevenLabsConfigDirectMode(tenantId, useDirectElevenLabs, projectId?) {
      await updateElevenLabsConfigDirectModeStorage(tenantId, useDirectElevenLabs, projectId);
  },

  // ElevenLabs Phone Numbers operations
  async getAllElevenLabsPhoneNumbers(tenantId) {
      return await getAllElevenLabsPhoneNumbersStorage(tenantId);
  },

  async getElevenLabsPhoneNumbers(tenantId) {
      return await getElevenLabsPhoneNumbersStorage(tenantId);
  },

  async getElevenLabsPhoneNumber(phoneNumberId, tenantId) {
      return await getElevenLabsPhoneNumberStorage(phoneNumberId, tenantId);
  },

  async upsertElevenLabsPhoneNumber(phoneData) {
      return await upsertElevenLabsPhoneNumberStorage(phoneData);
  },

  async deleteElevenLabsPhoneNumber(phoneNumberId, tenantId) {
      await deleteElevenLabsPhoneNumberStorage(phoneNumberId, tenantId);
  },

  async getAllElevenLabsAgents(tenantId, projectId?) {
      return await getAllElevenLabsAgentsStorage(tenantId, projectId);
  },

  async getElevenLabsAgents(tenantId) {
      return await getElevenLabsAgentsStorage(tenantId);
  },

  async getElevenLabsAgent(id, tenantId) {
      return await getElevenLabsAgentStorage(id, tenantId);
  },

  async getDefaultElevenLabsAgent(tenantId) {
      return await getDefaultElevenLabsAgentStorage(tenantId);
  },

  async createElevenLabsAgent(agent) {
      return await createElevenLabsAgentStorage(agent);
  },

  async updateElevenLabsAgent(id, tenantId, updates) {
      return await updateElevenLabsAgentStorage(id, tenantId, updates);
  },

  async deleteElevenLabsAgent(id, tenantId) {
      await deleteElevenLabsAgentStorage(id, tenantId);
  },

  async setDefaultElevenLabsAgent(id, tenantId) {
      await setDefaultElevenLabsAgentStorage(id, tenantId);
  },

  // Voice AI Call Sessions operations
  async createCallSession(session) {
      return await createCallSessionStorage(session);
  },

  async getCallSession(id, tenantId) {
      return await getCallSessionStorage(id, tenantId);
  },

  async getCallSessionByConversationId(conversationId, tenantId) {
      return await getCallSessionByConversationIdStorage(conversationId, tenantId);
  },

  async getCallSessionByCallSid(callSid, tenantId) {
      return await getCallSessionByCallSidStorage(callSid, tenantId);
  },

  // For external webhooks (Twilio/ElevenLabs) that don't have tenant context
  // CallSids are globally unique from Twilio, so this is safe
  async getCallSessionByCallSidOnly(callSid) {
      return await getCallSessionByCallSidOnlyStorage(callSid);
  },

  // Find orphaned call sessions - completed/in-progress but missing conversation_id or ai_analysis
  // Used by reconciliation service to match with ElevenLabs conversations
  async getOrphanedCallSessions(tenantId) {
      return await getOrphanedCallSessionsStorage(tenantId);
  },

  async getCallSessions(tenantId, filters?) {
      return await getCallSessionsStorage(tenantId, filters);
  },

  async updateCallSession(id, tenantId, updates) {
      return await updateCallSessionStorage(id, tenantId, updates);
  },

  async updateCallSessionByConversationId(conversationId, tenantId, updates) {
      return await updateCallSessionByConversationIdStorage(conversationId, tenantId, updates);
  },

  async deleteCallSession(id, tenantId) {
      await deleteCallSessionStorage(id, tenantId);
  },

  // Call Transcripts operations
  async createCallTranscript(transcript) {
      return await createCallTranscriptStorage(transcript);
  },

  async getCallTranscripts(conversationId) {
      return await getCallTranscriptsStorage(conversationId);
  },

  async bulkCreateCallTranscripts(transcripts) {
      await bulkCreateCallTranscriptsStorage(transcripts);
  },

  async deleteCallTranscripts(conversationId) {
      await deleteCallTranscriptsStorage(conversationId);
  },

  // AI Insights helper operations
  async getCallsWithTranscripts(filters) {
      return await getCallsWithTranscriptsStorage(filters);
  },

  async markCallsAsAnalyzed(conversationIds) {
      await markCallsAsAnalyzedStorage(conversationIds);
  },

  async nukeAllAnalysis() {
      return await nukeAllAnalysisStorage();
  },

  async nukeAllCallData() {
      return await nukeAllCallDataStorage();
  },

  // Call Events operations
  async createCallEvent(event) {
      return await createCallEventStorage(event);
  },

  async getCallEvents(conversationId) {
      return await getCallEventsStorage(conversationId);
  },

  // Call Campaigns operations
  async createCallCampaign(campaign) {
      return await createCallCampaignStorage(campaign);
  },

  async getCallCampaign(id, tenantId) {
      return await getCallCampaignStorage(id, tenantId);
  },

  async getCallCampaigns(tenantId, filters?) {
      return await getCallCampaignsStorage(tenantId, filters);
  },

  async updateCallCampaign(id, tenantId, updates) {
      return await updateCallCampaignStorage(id, tenantId, updates);
  },

  // Call Campaign Targets operations
  async createCallCampaignTarget(target) {
      return await createCallCampaignTargetStorage(target);
  },

  async getCallCampaignTarget(id, tenantId) {
      return await getCallCampaignTargetStorage(id, tenantId);
  },

  async getCallCampaignTargets(campaignId, tenantId) {
      return await getCallCampaignTargetsStorage(campaignId, tenantId);
  },

  async getCallTargetsBySession(conversationId, tenantId) {
      return await getCallTargetsBySessionStorage(conversationId, tenantId);
  },

  async getCallTargetsReadyForCalling() {
      return await getCallTargetsReadyForCallingStorage();
  },

  async updateCallCampaignTarget(id, tenantId, updates) {
      return await updateCallCampaignTargetStorage(id, tenantId, updates);
  },

  async incrementCampaignCalls(campaignId, tenantId, type) {
      await incrementCampaignCallsStorage(campaignId, tenantId, type);
  },

  // AI Insights operations
  async saveAiInsight(insight, objections, patterns, recommendations) {
      return await saveAiInsightStorage(insight, objections, patterns, recommendations);
  },

  async getAiInsightById(id) {
      return await getAiInsightByIdStorage(id);
  },

  async getAiInsightsHistory(filters?) {
      return await getAiInsightsHistoryStorage(filters);
  }
};

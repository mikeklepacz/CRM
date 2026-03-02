import type { StorageRuntimeContract } from "../storage.runtime-contract";

import {
  createAnalysisJobStorage,
  getAnalysisJobStorage,
  getAnalysisJobsStorage,
  getRunningAnalysisJobStorage,
  updateAnalysisJobStorage,
} from "../storage-modules/analysisJobStorage";

import {
  createAssistantFileStorage,
  deleteAssistantFileByAssistantIdStorage,
  getAllAssistantsStorage,
  getAssistantByIdStorage,
  getAssistantBySlugStorage,
  getAssistantFileByIdStorage,
  getAssistantFilesStorage,
  updateAssistantStorage,
} from "../storage-modules/assistantManagementStorage";

import {
  getBackgroundAudioSettingsStorage,
  updateBackgroundAudioSettingsStorage,
} from "../storage-modules/backgroundAudioStorage";

import {
  createKbFileStorage,
  createKbFileVersionStorage,
  createKbProposalStorage,
  deleteAllKbProposalsStorage,
  deleteKbFileStorage,
  deleteKbProposalStorage,
  getAllKbFilesStorage,
  getKbFileByElevenLabsDocIdStorage,
  getKbFileByFilenameStorage,
  getKbFileByIdStorage,
  getKbFileVersionStorage,
  getKbFileVersionsStorage,
  getKbProposalByIdStorage,
  getKbProposalsStorage,
  updateKbFileStorage,
  updateKbProposalStorage,
} from "../storage-modules/kbManagementStorage";

import {
  getAllNonDuplicatesStorage,
  getStaleInProgressTargetsStorage,
  getStaleInitiatedSessionsStorage,
  isMarkedAsNotDuplicateStorage,
  markAsNotDuplicateStorage,
  markStaleSessionsAsFailedStorage,
  removeNonDuplicateMarkStorage,
} from "../storage-modules/nonDuplicateStorage";

import {
  createVoiceProxySessionStorage,
  endVoiceProxySessionStorage,
  getActiveVoiceProxySessionsStorage,
  getVoiceProxySessionStorage,
  updateVoiceProxySessionStorage,
} from "../storage-modules/voiceProxySessionStorage";

export const kbAssistantVoiceMethods: Partial<StorageRuntimeContract> = {
  // KB Management operations
  async getAllKbFiles(tenantId, projectId?) {
      return await getAllKbFilesStorage(tenantId, projectId);
  },

  async getKbFileById(id, tenantId) {
      return await getKbFileByIdStorage(id, tenantId);
  },

  async getKbFileByFilename(filename, tenantId) {
      return await getKbFileByFilenameStorage(filename, tenantId);
  },

  async getKbFileByElevenLabsDocId(docId, tenantId) {
      return await getKbFileByElevenLabsDocIdStorage(docId, tenantId);
  },

  async createKbFile(file) {
      return await createKbFileStorage(file);
  },

  async updateKbFile(id, tenantId, updates) {
      return await updateKbFileStorage(id, tenantId, updates);
  },

  async deleteKbFile(id, tenantId) {
      return await deleteKbFileStorage(id, tenantId);
  },

  async createKbFileVersion(version) {
      return await createKbFileVersionStorage(version);
  },

  async getKbFileVersions(fileId, tenantId) {
      return await getKbFileVersionsStorage(fileId, tenantId);
  },

  async getKbFileVersion(id, tenantId) {
      return await getKbFileVersionStorage(id, tenantId);
  },

  async createKbProposal(proposal) {
      return await createKbProposalStorage(proposal);
  },

  async getKbProposals(tenantId, filters?) {
      return await getKbProposalsStorage(tenantId, filters);
  },

  async getKbProposalById(id, tenantId) {
      return await getKbProposalByIdStorage(id, tenantId);
  },

  async updateKbProposal(id, tenantId, updates) {
      return await updateKbProposalStorage(id, tenantId, updates);
  },

  async deleteKbProposal(id, tenantId) {
      return await deleteKbProposalStorage(id, tenantId);
  },

  async deleteAllKbProposals(tenantId) {
      return await deleteAllKbProposalsStorage(tenantId);
  },

  // Analysis Jobs operations
  async createAnalysisJob(job) {
      return await createAnalysisJobStorage(job);
  },

  async getAnalysisJob(id) {
      return await getAnalysisJobStorage(id);
  },

  async getRunningAnalysisJob() {
      return await getRunningAnalysisJobStorage();
  },

  async getAnalysisJobs(filters?) {
      return await getAnalysisJobsStorage(filters);
  },

  async updateAnalysisJob(id, updates) {
      return await updateAnalysisJobStorage(id, updates);
  },

  // OpenAI Assistant Management operations
  async getAllAssistants(tenantId?) {
      return await getAllAssistantsStorage(tenantId);
  },

  async getAssistantById(id) {
      return await getAssistantByIdStorage(id);
  },

  async getAssistantBySlug(slug, tenantId?) {
      return await getAssistantBySlugStorage(slug, tenantId);
  },

  async updateAssistant(id, updates) {
      return await updateAssistantStorage(id, updates);
  },

  async getAssistantFiles(assistantId) {
      return await getAssistantFilesStorage(assistantId);
  },

  async getAssistantFileById(id) {
      return await getAssistantFileByIdStorage(id);
  },

  async createAssistantFile(file) {
      return await createAssistantFileStorage(file);
  },

  async deleteAssistantFileByAssistantId(fileId, assistantId) {
      return await deleteAssistantFileByAssistantIdStorage(fileId, assistantId);
  },

  // Non-duplicate operations
  async markAsNotDuplicate(link1, link2, userId, tenantId) {
      return await markAsNotDuplicateStorage(link1, link2, userId, tenantId);
  },

  async isMarkedAsNotDuplicate(link1, link2) {
      return await isMarkedAsNotDuplicateStorage(link1, link2);
  },

  async getAllNonDuplicates() {
      return await getAllNonDuplicatesStorage();
  },

  async removeNonDuplicateMark(link1, link2) {
      await removeNonDuplicateMarkStorage(link1, link2);
  },

  async getStaleInProgressTargets(beforeDate) {
      return await getStaleInProgressTargetsStorage(beforeDate);
  },

  async getStaleInitiatedSessions(beforeDate) {
      return await getStaleInitiatedSessionsStorage(beforeDate);
  },

  async markStaleSessionsAsFailed(beforeDate) {
      return await markStaleSessionsAsFailedStorage(beforeDate);
  },

  // Background Audio Settings operations
  async getBackgroundAudioSettings() {
      return await getBackgroundAudioSettingsStorage();
  },

  async updateBackgroundAudioSettings(settings) {
      return await updateBackgroundAudioSettingsStorage(settings);
  },

  // Voice Proxy Session operations
  async createVoiceProxySession(session) {
      return await createVoiceProxySessionStorage(session);
  },

  async getVoiceProxySession(streamSid) {
      return await getVoiceProxySessionStorage(streamSid);
  },

  async getActiveVoiceProxySessions() {
      return await getActiveVoiceProxySessionsStorage();
  },

  async updateVoiceProxySession(id, updates) {
      return await updateVoiceProxySessionStorage(id, updates);
  },

  async endVoiceProxySession(streamSid) {
      await endVoiceProxySessionStorage(streamSid);
  }
};

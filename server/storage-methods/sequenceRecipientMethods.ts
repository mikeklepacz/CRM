import type { StorageRuntimeContract } from "../storage.runtime-contract";

import {
  getEhubSettingsStorage,
  updateEhubSettingsStorage,
} from "../storage-modules/ehubSettingsStorage";

import {
  createSequenceStorage,
  deleteSequenceStorage,
  getAdminUserForSequencesStorage,
  getOrCreateManualFollowUpsSequenceStorage,
  getSequenceStorage,
  incrementSequenceSentCountStorage,
  listSequencesStorage,
  syncSequenceRecipientCountsStorage,
  updateSequenceStatsStorage,
  updateSequenceStorage,
} from "../storage-modules/sequenceCoreStorage";

import {
  delayRecipientStorage,
  removeRecipientStorage,
  sendRecipientNowStorage,
  skipRecipientStepStorage,
} from "../storage-modules/sequenceRecipientActionsStorage";

import {
  addRecipientsStorage,
  getActiveRecipientsWithThreadsStorage,
  getAllPendingRecipientsStorage,
  getNextRecipientsToSendStorage,
  getRecipientStorage,
  getRecipientsStorage,
} from "../storage-modules/sequenceRecipientCoreStorage";

import {
  getPausedRecipientsCountStorage,
  getPausedRecipientsStorage,
} from "../storage-modules/sequenceRecipientPausedStorage";

import {
  getIndividualSendsQueueStorage,
  getQueueViewStorage,
} from "../storage-modules/sequenceRecipientQueueViewStorage";

import {
  findRecipientByEmailStorage,
  pauseRecipientStorage,
  resumeRecipientStorage,
  updateRecipientStatusStorage,
} from "../storage-modules/sequenceRecipientStateStorage";

import {
  getDailyScheduledCountStorage,
  getQueueTailStorage,
} from "../storage-modules/sequenceRecipientTimingStorage";

export const sequenceRecipientMethods: Partial<StorageRuntimeContract> = {
  // E-Hub Settings operations
  async getEhubSettings(tenantId) {
      return await getEhubSettingsStorage(tenantId);
  },

  async updateEhubSettings(tenantId, updates) {
      return await updateEhubSettingsStorage(tenantId, updates);
  },

  // E-Hub Sequence operations
  async createSequence(sequence) {
      return await createSequenceStorage(sequence);
  },

  async getSequence(id, tenantId) {
      return await getSequenceStorage(id, tenantId);
  },

  async listSequences(tenantId, filters?) {
      return await listSequencesStorage(tenantId, filters);
  },

  async updateSequence(id, tenantId, updates) {
      return await updateSequenceStorage(id, tenantId, updates);
  },

  async deleteSequence(id, tenantId) {
      return await deleteSequenceStorage(id, tenantId);
  },

  async getOrCreateManualFollowUpsSequence(tenantId) {
      return await getOrCreateManualFollowUpsSequenceStorage(tenantId);
  },

  async getAdminUserForSequences() {
      return await getAdminUserForSequencesStorage();
  },

  async updateSequenceStats(id, tenantId, stats) {
      return await updateSequenceStatsStorage(id, tenantId, stats);
  },

  async incrementSequenceSentCount(id, tenantId) {
      await incrementSequenceSentCountStorage(id, tenantId);
  },

  async syncSequenceRecipientCounts(tenantId) {
      return await syncSequenceRecipientCountsStorage(tenantId);
  },

  // E-Hub Sequence Recipients operations
  async addRecipients(recipients) {
      return await addRecipientsStorage(recipients);
  },

  async getRecipients(sequenceId, filters?) {
      return await getRecipientsStorage(sequenceId, filters);
  },

  async getRecipient(id) {
      return await getRecipientStorage(id);
  },

  async getNextRecipientsToSend(limit) {
      return await getNextRecipientsToSendStorage(limit);
  },

  async getAllPendingRecipients() {
      return await getAllPendingRecipientsStorage();
  },

  async getActiveRecipientsWithThreads() {
      return await getActiveRecipientsWithThreadsStorage();
  },

  async getQueueView() {
      return await getQueueViewStorage();
  },

  async getIndividualSendsQueue(options) {
      return await getIndividualSendsQueueStorage(options);
  },

  async getPausedRecipients(tenantId?) {
      return await getPausedRecipientsStorage(tenantId);
  },

  async updateRecipientStatus(id, updates) {
      return await updateRecipientStatusStorage(id, updates);
  },

  async findRecipientByEmail(sequenceId, email) {
      return await findRecipientByEmailStorage(sequenceId, email);
  },

  async pauseRecipient(id, tenantId?) {
      return await pauseRecipientStorage(id, tenantId);
  },

  async resumeRecipient(id, tenantId?) {
      return await resumeRecipientStorage(id, tenantId);
  },

  async getPausedRecipientsCount(tenantId?) {
      return await getPausedRecipientsCountStorage(tenantId);
  },

  async getQueueTail(options?) {
      return await getQueueTailStorage(options);
  },

  async getDailyScheduledCount(options?) {
      return await getDailyScheduledCountStorage(options);
  },

  async removeRecipient(id, tenantId?) {
      return await removeRecipientStorage(id, tenantId);
  },

  async sendRecipientNow(id, tenantId?) {
      return await sendRecipientNowStorage(id, tenantId);
  },

  async delayRecipient(id, hours, tenantId?) {
      return await delayRecipientStorage(id, hours, tenantId);
  },

  async skipRecipientStep(id, tenantId?) {
      return await skipRecipientStepStorage(id, tenantId);
  }
};

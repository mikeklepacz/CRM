import type { StorageRuntimeContract } from "../storage.runtime-contract";

import {
  getAdminTenantIdStorage,
  getAdminUserStorage,
  getRecipientByIdStorage,
  getSequenceByIdStorage,
  insertRecipientMessageStorage,
  updateRecipientStorage,
} from "../storage-modules/emailSenderStorage";

import {
  claimScheduledSendStorage,
  clearScheduledAtForPendingSendsStorage,
  deleteAllPendingScheduledSendsStorage,
  deleteRecipientScheduledSendsStorage,
  getLastScheduledSendForUserStorage,
  getNextScheduledSendsStorage,
  getScheduledSendsByRecipientStorage,
  getScheduledSendsQueueStorage,
  getUpcomingScheduledSendsStorage,
  insertScheduledSendsStorage,
  updateScheduledSendStorage,
} from "../storage-modules/sequenceScheduledSendStorage";

import {
  appendSequenceStrategyMessagesStorage,
  createRecipientMessageStorage,
  createSequenceStepStorage,
  deleteRecipientMessagesStorage,
  deleteSequenceStepStorage,
  getRecipientMessagesStorage,
  getSequenceStepsStorage,
  replaceSequenceStepsStorage,
  updateSequenceStepStorage,
} from "../storage-modules/sequenceStepsStorage";

import {
  createTestEmailSendStorage,
  getTestDataNukeCountsStorage,
  getTestEmailSendByIdStorage,
  getTestEmailSendByThreadIdStorage,
  listTestEmailSendsForUserStorage,
  logTestDataNukeStorage,
  nukeTestDataStorage,
  updateTestEmailSendStatusStorage,
} from "../storage-modules/testDataOpsStorage";

export const sequenceSchedulingSenderMethods: Partial<StorageRuntimeContract> = {
  // E-Hub Sequence Scheduled Sends operations
  async insertScheduledSends(sends) {
      return await insertScheduledSendsStorage(sends);
  },

  async getNextScheduledSends(limit) {
      return await getNextScheduledSendsStorage(limit);
  },

  async getUpcomingScheduledSends(limit) {
      return await getUpcomingScheduledSendsStorage(limit);
  },

  async getLastScheduledSendForUser(userId) {
      return await getLastScheduledSendForUserStorage(userId);
  },

  async clearScheduledAtForPendingSends(imminentThreshold) {
      return await clearScheduledAtForPendingSendsStorage(imminentThreshold);
  },

  async deleteRecipientScheduledSends(recipientId) {
      return await deleteRecipientScheduledSendsStorage(recipientId);
  },

  async deleteAllPendingScheduledSends(sequenceId?) {
      return await deleteAllPendingScheduledSendsStorage(sequenceId);
  },

  async updateScheduledSend(id, updates) {
      return await updateScheduledSendStorage(id, updates);
  },

  async claimScheduledSend(id) {
      return await claimScheduledSendStorage(id);
  },

  async getScheduledSendsByRecipient(recipientId) {
      return await getScheduledSendsByRecipientStorage(recipientId);
  },

  async getScheduledSendsQueue(options) {
      return await getScheduledSendsQueueStorage(options);
  },

  // E-Hub Sequence Steps operations
  async createSequenceStep(step) {
      return await createSequenceStepStorage(step);
  },

  async getSequenceSteps(sequenceId) {
      return await getSequenceStepsStorage(sequenceId);
  },

  async updateSequenceStep(id, updates) {
      return await updateSequenceStepStorage(id, updates);
  },

  async deleteSequenceStep(id) {
      return await deleteSequenceStepStorage(id);
  },

  async replaceSequenceSteps(sequenceId, stepDelays, tenantId) {
      return await replaceSequenceStepsStorage(sequenceId, stepDelays, tenantId);
  },

  // E-Hub Sequence Recipient Messages operations
  async createRecipientMessage(message) {
      return await createRecipientMessageStorage(message);
  },

  async getRecipientMessages(recipientId) {
      return await getRecipientMessagesStorage(recipientId);
  },

  async deleteRecipientMessages(recipientId) {
      await deleteRecipientMessagesStorage(recipientId);
  },

  // E-Hub Strategy Chat operations
  async appendSequenceStrategyMessages(sequenceId, messages, threadId?) {
      return await appendSequenceStrategyMessagesStorage(sequenceId, messages, threadId);
  },

  // Test Email Sends operations
  async createTestEmailSend(testSend) {
      return await createTestEmailSendStorage(testSend);
  },

  async updateTestEmailSendStatus(id, updates) {
      return await updateTestEmailSendStatusStorage(id, updates);
  },

  async getTestEmailSendByThreadId(threadId) {
      return await getTestEmailSendByThreadIdStorage(threadId);
  },

  async getTestEmailSendById(id) {
      return await getTestEmailSendByIdStorage(id);
  },

  async listTestEmailSendsForUser(userId) {
      return await listTestEmailSendsForUserStorage(userId);
  },

  // Test Data Nuke operations
  async getTestDataNukeCounts(emailPattern?) {
      return await getTestDataNukeCountsStorage(emailPattern);
  },

  async nukeTestData(userId, tenantId, emailPattern?) {
      return await nukeTestDataStorage(userId, tenantId, emailPattern);
  },

  async logTestDataNuke(log) {
      return await logTestDataNukeStorage(log);
  },

  // Matrix2 Email Sender: Get recipient by ID (used in email sending)
  async getRecipientById(recipientId) {
      return await getRecipientByIdStorage(recipientId);
  },

  // Get sequence by ID (used in email sending)
  async getSequenceById(sequenceId) {
      return await getSequenceByIdStorage(sequenceId);
  },

  // Get admin user (used in email sending)
  async getAdminUser() {
      return await getAdminUserStorage();
  },

  // Get admin user's default tenantId (for background services)
  async getAdminTenantId() {
      return await getAdminTenantIdStorage();
  },

  // Update recipient after email sent (used in email sender)
  async updateRecipient(recipientId, updates) {
      return await updateRecipientStorage(recipientId, updates);
  },

  // Insert recipient message record (used in email sender)
  async insertRecipientMessage(message) {
      return await insertRecipientMessageStorage(message);
  }
};

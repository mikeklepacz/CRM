import type { StorageRuntimeContract } from "../storage.runtime-contract";

import {
  createEmailAccountStorage,
  createEmailImageStorage,
  deleteEmailAccountStorage,
  deleteEmailImageStorage,
  getActiveEmailAccountsStorage,
  getAvailableEmailAccountStorage,
  getEmailAccountByEmailStorage,
  getEmailAccountStorage,
  incrementEmailAccountDailySendCountStorage,
  listEmailAccountsStorage,
  listEmailImagesStorage,
  updateEmailAccountStorage,
} from "../storage-modules/emailOpsStorage";

import {
  createQualificationCampaignStorage,
  createQualificationLeadStorage,
  createQualificationLeadsStorage,
  deleteQualificationCampaignStorage,
  deleteQualificationLeadStorage,
  deleteQualificationLeadsStorage,
  findQualificationLeadBySourceIdStorage,
  getActiveQualificationCampaignStorage,
  getQualificationCampaignStorage,
  getQualificationLeadStatsStorage,
  getQualificationLeadStorage,
  listQualificationCampaignsStorage,
  listQualificationLeadsStorage,
  updateQualificationCampaignStorage,
  updateQualificationLeadStorage,
} from "../storage-modules/qualificationStorage";

import {
  createIgnoredHolidayStorage,
  createNoSendDateStorage,
  deleteIgnoredHolidayStorage,
  deleteNoSendDateStorage,
  getIgnoredHolidayByHolidayIdStorage,
  getIgnoredHolidaysStorage,
  getNoSendDateStorage,
  getNoSendDatesStorage,
} from "../storage-modules/schedulingStorage";

import {
  getCallSessionWithContextStorage,
  updateAnalysisResultsStorage,
} from "../storage-modules/transcriptAnalysisStorage";

export const schedulingQualificationEmailMethods: Partial<StorageRuntimeContract> = {
  // No-Send Dates operations
  async getNoSendDates() {
      return await getNoSendDatesStorage();
  },

  async getNoSendDate(id) {
      return await getNoSendDateStorage(id);
  },

  async createNoSendDate(data) {
      return await createNoSendDateStorage(data);
  },

  async deleteNoSendDate(id) {
      await deleteNoSendDateStorage(id);
  },

  // Ignored Holidays operations (tenant-aware)
  async getIgnoredHolidays(tenantId) {
      return await getIgnoredHolidaysStorage(tenantId);
  },

  async getIgnoredHolidayByHolidayId(tenantId, holidayId) {
      return await getIgnoredHolidayByHolidayIdStorage(tenantId, holidayId);
  },

  async createIgnoredHoliday(data) {
      return await createIgnoredHolidayStorage(data);
  },

  async deleteIgnoredHoliday(tenantId, holidayId) {
      await deleteIgnoredHolidayStorage(tenantId, holidayId);
  },

  // Qualification Campaign operations
  async listQualificationCampaigns(tenantId) {
      return await listQualificationCampaignsStorage(tenantId);
  },

  async getActiveQualificationCampaign(tenantId) {
      return await getActiveQualificationCampaignStorage(tenantId);
  },

  async getQualificationCampaign(id, tenantId) {
      return await getQualificationCampaignStorage(id, tenantId);
  },

  async createQualificationCampaign(data) {
      return await createQualificationCampaignStorage(data);
  },

  async updateQualificationCampaign(id, tenantId, updates) {
      return await updateQualificationCampaignStorage(id, tenantId, updates);
  },

  async deleteQualificationCampaign(id, tenantId) {
      return await deleteQualificationCampaignStorage(id, tenantId);
  },

  // Qualification Lead operations
  async listQualificationLeads(tenantId, filters?) {
      return await listQualificationLeadsStorage(tenantId, filters);
  },

  async getQualificationLead(id, tenantId) {
      return await getQualificationLeadStorage(id, tenantId);
  },

  async findQualificationLeadBySourceId(tenantId, sourceId) {
      return await findQualificationLeadBySourceIdStorage(tenantId, sourceId);
  },

  async createQualificationLead(data) {
      return await createQualificationLeadStorage(data);
  },

  async createQualificationLeads(leads) {
      return await createQualificationLeadsStorage(leads);
  },

  async updateQualificationLead(id, tenantId, updates) {
      return await updateQualificationLeadStorage(id, tenantId, updates);
  },

  async deleteQualificationLead(id, tenantId) {
      return await deleteQualificationLeadStorage(id, tenantId);
  },

  async deleteQualificationLeads(ids, tenantId) {
      return await deleteQualificationLeadsStorage(ids, tenantId);
  },

  async getQualificationLeadStats(tenantId, campaignId?, projectId?) {
      return await getQualificationLeadStatsStorage(tenantId, campaignId, projectId);
  },

  // Email Accounts Pool operations
  async listEmailAccounts(tenantId) {
      return await listEmailAccountsStorage(tenantId);
  },

  async getEmailAccount(id, tenantId) {
      return await getEmailAccountStorage(id, tenantId);
  },

  async getEmailAccountByEmail(tenantId, email) {
      return await getEmailAccountByEmailStorage(tenantId, email);
  },

  async createEmailAccount(data) {
      return await createEmailAccountStorage(data);
  },

  async updateEmailAccount(id, tenantId, updates) {
      return await updateEmailAccountStorage(id, tenantId, updates);
  },

  async deleteEmailAccount(id, tenantId) {
      return await deleteEmailAccountStorage(id, tenantId);
  },

  async incrementEmailAccountDailySendCount(id, tenantId) {
      return await incrementEmailAccountDailySendCountStorage(id, tenantId);
  },

  async getAvailableEmailAccount(tenantId, maxDailyLimit) {
      return await getAvailableEmailAccountStorage(tenantId, maxDailyLimit);
  },

  async getActiveEmailAccounts(tenantId) {
      return await getActiveEmailAccountsStorage(tenantId);
  },

  // AI Transcript Analysis operations
  async getCallSessionWithContext(id, tenantId) {
      return await getCallSessionWithContextStorage(id, tenantId);
  },

  async updateAnalysisResults(sessionId, leadId, tenantId, sessionUpdates, leadUpdates) {
      await updateAnalysisResultsStorage(sessionId, leadId, tenantId, sessionUpdates, leadUpdates);
  },

  // Email Image Library operations
  async listEmailImages(tenantId) {
      return await listEmailImagesStorage(tenantId);
  },

  async createEmailImage(data) {
      return await createEmailImageStorage(data);
  },

  async deleteEmailImage(id, tenantId) {
      return await deleteEmailImageStorage(id, tenantId);
  }
};

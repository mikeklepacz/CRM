import type { StorageRuntimeContract } from "../storage.runtime-contract";

import {
  createCallHistoryStorage,
  getAllCallHistoryStorage,
  getUserCallHistoryStorage,
} from "../storage-modules/callHistoryStorage";

import {
  createDriveFolderStorage,
  deleteDriveFolderStorage,
  getAllDriveFoldersStorage,
  getDriveFolderByNameStorage,
  getDriveFolderStorage,
  updateDriveFolderStorage,
} from "../storage-modules/driveFolderStorage";

import {
  getFollowUpClientsStorage,
} from "../storage-modules/followUpStorage";

import {
  deleteSavedExclusionStorage,
  deleteSearchHistoryStorage,
} from "../storage-modules/mapSearchMaintenanceStorage";

import {
  checkImportedPlacesStorage,
  createSavedExclusionStorage,
  getAllSavedExclusionsStorage,
  getAllSearchHistoryStorage,
  getSavedExclusionsByTypeStorage,
  recordImportedPlaceStorage,
  recordSearchStorage,
  updateUserActiveExclusionsStorage,
} from "../storage-modules/mapSearchStorage";

import {
  createStatusStorage,
  deleteStatusStorage,
  getActiveStatusesStorage,
  getAllStatusesStorage,
  getStatusStorage,
  reorderStatusesStorage,
  updateStatusStorage,
} from "../storage-modules/statusStorage";

import {
  createTicketReplyStorage,
  createTicketStorage,
  getAllTicketsStorage,
  getTicketRepliesStorage,
  getTicketStorage,
  getUnreadAdminCountStorage,
  getUserTicketsStorage,
  markTicketReadByAdminStorage,
  markTicketReadByUserStorage,
  updateTicketStorage,
} from "../storage-modules/ticketStorage";

export const mapStatusTicketFollowupMethods: Partial<StorageRuntimeContract> = {
  // Imported Places operations - for duplicate detection in Map Search
  async checkImportedPlaces(placeIds) {
      return await checkImportedPlacesStorage(placeIds);
  },

  async recordImportedPlace(placeId, tenantId) {
      await recordImportedPlaceStorage(placeId, tenantId);
  },

  // Search History operations - for Map Search
  async getAllSearchHistory(tenantId, projectId?) {
      return await getAllSearchHistoryStorage(tenantId, projectId);
  },

  async recordSearch(tenantId, businessType, city, state, country, excludedKeywords = [], excludedTypes = [], category?, projectId?) {
      return await recordSearchStorage(tenantId, businessType, city, state, country, excludedKeywords, excludedTypes, category, projectId);
  },

  async deleteSearchHistory(id, tenantId) {
      await deleteSearchHistoryStorage(id, tenantId);
  },

  // Saved Exclusions operations
  // When projectId is provided: return project-specific exclusions AND global (null projectId) exclusions
  // When projectId is not provided: return all tenant exclusions
  async getAllSavedExclusions(tenantId, projectId?) {
      return await getAllSavedExclusionsStorage(tenantId, projectId);
  },

  async getSavedExclusionsByType(tenantId, projectId, type) {
      return await getSavedExclusionsByTypeStorage(tenantId, projectId, type);
  },

  async createSavedExclusion(exclusion) {
      return await createSavedExclusionStorage(exclusion);
  },

  async deleteSavedExclusion(id) {
      await deleteSavedExclusionStorage(id);
  },

  async updateUserActiveExclusions(userId, tenantId, activeKeywords, activeTypes) {
      return await updateUserActiveExclusionsStorage(userId, tenantId, activeKeywords, activeTypes);
  },

  // Status operations
  async getAllStatuses(tenantId) {
      return await getAllStatusesStorage(tenantId);
  },

  async getActiveStatuses(tenantId) {
      return await getActiveStatusesStorage(tenantId);
  },

  async getStatus(id) {
      return await getStatusStorage(id);
  },

  async createStatus(status) {
      return await createStatusStorage(status);
  },

  async updateStatus(id, updates) {
      return await updateStatusStorage(id, updates);
  },

  async deleteStatus(id) {
      await deleteStatusStorage(id);
  },

  async reorderStatuses(updates) {
      await reorderStatusesStorage(updates);
  },

  // Ticket operations
  async getAllTickets() {
      return await getAllTicketsStorage();
  },

  async getUserTickets(userId) {
      return await getUserTicketsStorage(userId);
  },

  async getTicket(id) {
      return await getTicketStorage(id);
  },

  async createTicket(ticket) {
      return await createTicketStorage(ticket);
  },

  async updateTicket(id, updates) {
      return await updateTicketStorage(id, updates);
  },

  async getUnreadAdminCount() {
      return await getUnreadAdminCountStorage();
  },

  async markTicketReadByAdmin(id) {
      return await markTicketReadByAdminStorage(id);
  },

  async markTicketReadByUser(id) {
      return await markTicketReadByUserStorage(id);
  },

  // Ticket Reply operations
  async getTicketReplies(ticketId) {
      return await getTicketRepliesStorage(ticketId);
  },

  async createTicketReply(reply) {
      return await createTicketReplyStorage(reply);
  },

  // Call History operations
  async createCallHistory(callData) {
      return await createCallHistoryStorage(callData);
  },

  async getUserCallHistory(userId, tenantId) {
      return await getUserCallHistoryStorage(userId, tenantId);
  },

  async getAllCallHistory(tenantId, agentId?) {
      return await getAllCallHistoryStorage(tenantId, agentId);
  },

  // Drive Folder operations
  async getAllDriveFolders() {
      return await getAllDriveFoldersStorage();
  },

  async getDriveFolder(id) {
      return await getDriveFolderStorage(id);
  },

  async getDriveFolderByName(name) {
      return await getDriveFolderByNameStorage(name);
  },

  async createDriveFolder(folder) {
      return await createDriveFolderStorage(folder);
  },

  async updateDriveFolder(id, updates) {
      return await updateDriveFolderStorage(id, updates);
  },

  async deleteDriveFolder(id) {
      await deleteDriveFolderStorage(id);
  },

  async getFollowUpClients(userId, userRole) {
      return await getFollowUpClientsStorage(userId, userRole);
  }
};

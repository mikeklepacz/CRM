import type { StorageRuntimeContract } from "../storage.runtime-contract";

import {
  claimClientStorage,
  createClientStorage,
  findClientByUniqueKeyStorage,
  getAllClientsStorage,
  getClientByUniqueIdentifierStorage,
  getClientStorage,
  getClientsByAgentStorage,
  getFilteredClientsStorage,
  unclaimClientStorage,
  updateClientStorage,
  updateLastContactDateStorage,
} from "../storage-modules/clientStorage";

import {
  getDashboardCardsByRoleStorage,
  getDashboardStatsStorage,
} from "../storage-modules/dashboardStorage";

import {
  createCsvUploadStorage,
  createGoogleSheetConnectionStorage,
  disconnectGoogleSheetStorage,
  getAllActiveGoogleSheetsStorage,
  getGoogleSheetByIdStorage,
  getGoogleSheetByPurposeStorage,
  getRecentCsvUploadsStorage,
  updateGoogleSheetLastSyncStorage,
} from "../storage-modules/importSyncStorage";

import {
  createCommissionStorage,
  createNoteStorage,
  createOrderStorage,
  deleteCommissionsByOrderStorage,
  deleteOrderStorage,
  getAllOrdersStorage,
  getClientNotesStorage,
  getCommissionsByAgentStorage,
  getCommissionsByOrderStorage,
  getOrderByIdStorage,
  getOrdersByClientStorage,
  updateOrderStorage,
} from "../storage-modules/salesStorage";

import {
  deleteSystemIntegrationStorage,
  getSystemIntegrationStorage,
  updateSystemIntegrationStorage,
} from "../storage-modules/systemIntegrationStorage";

import {
  getUserStorage,
} from "../storage-modules/userAccountStorage";

import {
  getAllUserIntegrationsStorage,
  getUserIntegrationStorage,
  getUserIntegrationsWithGmailByTenantStorage,
  updateUserIntegrationStorage,
} from "../storage-modules/userIntegrationStorage";

import {
  getLastCategoryStorage,
  getSelectedCategoryStorage,
  getUserPreferencesStorage,
  saveUserPreferencesStorage,
  setLastCategoryStorage,
  setSelectedCategoryStorage,
} from "../storage-modules/userPreferenceStorage";

export const integrationSalesImportMethods: Partial<StorageRuntimeContract> = {
  // System integrations operations
  async getSystemIntegration(provider) {
      return await getSystemIntegrationStorage(provider);
  },

  async updateSystemIntegration(provider, updates) {
      return await updateSystemIntegrationStorage(provider, updates);
  },

  async deleteSystemIntegration(provider) {
      await deleteSystemIntegrationStorage(provider);
  },

  // User integrations operations
  async getUserIntegration(userId) {
      return await getUserIntegrationStorage(userId);
  },

  async getAllUserIntegrations() {
      return await getAllUserIntegrationsStorage();
  },

  async getUserIntegrationsWithGmailByTenant(tenantId) {
      return await getUserIntegrationsWithGmailByTenantStorage(tenantId);
  },

  async updateUserIntegration(userId, updates, tenantId?) {
      return await updateUserIntegrationStorage(userId, updates, tenantId);
  },

  // User preferences operations
  async getUserPreferences(userId, tenantId) {
      return await getUserPreferencesStorage(userId, tenantId);
  },

  async saveUserPreferences(userId, tenantId, preferences) {
      return await saveUserPreferencesStorage(userId, tenantId, preferences as any);
  },

  async getLastCategory(userId, tenantId) {
      return await getLastCategoryStorage(userId, tenantId);
  },

  async setLastCategory(userId, tenantId, category) {
      return await setLastCategoryStorage(userId, tenantId, category);
  },

  async getSelectedCategory(userId, tenantId) {
      return await getSelectedCategoryStorage(userId, tenantId);
  },

  async setSelectedCategory(userId, tenantId, category) {
      return await setSelectedCategoryStorage(userId, tenantId, category);
  },

  // Client operations
  async getAllClients(tenantId) {
      return await getAllClientsStorage(tenantId);
  },

  async getClientsByAgent(agentId, tenantId) {
      return await getClientsByAgentStorage(agentId, tenantId);
  },

  async getFilteredClients(tenantId, filters) {
      return await getFilteredClientsStorage(tenantId, filters);
  },

  async getClient(id, tenantId) {
      return await getClientStorage(id, tenantId);
  },

  async createClient(client) {
      return await createClientStorage(client);
  },

  async updateClient(id, tenantId, updates) {
      return await updateClientStorage(id, tenantId, updates);
  },

  async claimClient(clientId, agentId) {
      return await claimClientStorage(clientId, agentId);
  },

  async unclaimClient(clientId) {
      return await unclaimClientStorage(clientId);
  },

  async findClientByUniqueKey(key, value) {
      return await findClientByUniqueKeyStorage(key, value);
  },

  async updateLastContactDate(clientId, contactDate?) {
      return await updateLastContactDateStorage(clientId, contactDate);
  },

  // Notes operations
  async getClientNotes(clientId, tenantId) {
      return await getClientNotesStorage(clientId, tenantId);
  },

  async createNote(note) {
      return await createNoteStorage(note);
  },

  // Order operations
  async createOrder(order) {
      return await createOrderStorage(order);
  },

  async getOrderById(id, tenantId) {
      return await getOrderByIdStorage(id, tenantId);
  },

  async updateOrder(id, tenantId, updates) {
      return await updateOrderStorage(id, tenantId, updates);
  },

  async getAllOrders(tenantId) {
      return await getAllOrdersStorage(tenantId);
  },

  async deleteOrder(id, tenantId) {
      await deleteOrderStorage(id, tenantId);
  },

  // Commission operations
  async createCommission(commission) {
      return await createCommissionStorage(commission);
  },

  async getCommissionsByAgent(agentId, tenantId) {
      return await getCommissionsByAgentStorage(agentId, tenantId);
  },

  async getCommissionsByOrder(orderId, tenantId) {
      return await getCommissionsByOrderStorage(orderId, tenantId);
  },

  async deleteCommissionsByOrder(orderId, tenantId) {
      await deleteCommissionsByOrderStorage(orderId, tenantId);
  },

  // CSV Upload operations
  async createCsvUpload(upload) {
      return await createCsvUploadStorage(upload);
  },

  async getRecentCsvUploads(limit = 10) {
      return await getRecentCsvUploadsStorage(limit);
  },

  // Google Sheets operations
  async getAllActiveGoogleSheets(tenantId) {
      return await getAllActiveGoogleSheetsStorage(tenantId);
  },

  async getGoogleSheetById(id, tenantId) {
      return await getGoogleSheetByIdStorage(id, tenantId);
  },

  async getGoogleSheetByPurpose(purpose, tenantId) {
      return await getGoogleSheetByPurposeStorage(purpose, tenantId);
  },

  async createGoogleSheetConnection(connection) {
      return await createGoogleSheetConnectionStorage(connection);
  },

  async disconnectGoogleSheet(id) {
      await disconnectGoogleSheetStorage(id);
  },

  async updateGoogleSheetLastSync(id) {
      await updateGoogleSheetLastSyncStorage(id);
  },

  async getClientByUniqueIdentifier(uniqueId) {
      return await getClientByUniqueIdentifierStorage(uniqueId);
  },

  // Dashboard operations
  async getDashboardCardsByRole(role) {
      return await getDashboardCardsByRoleStorage(role);
  },

  async getDashboardStats(userId, role) {
      return await getDashboardStatsStorage(userId, role);
  },

  // Helper methods
  async getUserById(id) {
      return await getUserStorage(id);
  },

  async getOrdersByClient(clientId, tenantId) {
      return await getOrdersByClientStorage(clientId, tenantId);
  }
};

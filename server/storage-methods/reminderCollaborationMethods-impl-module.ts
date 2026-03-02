import type { StorageRuntimeContract } from "../storage.runtime-contract";

import {
  createCategoryStorage,
  deleteCategoryStorage,
  getActiveCategoriesStorage,
  getAllCategoriesStorage,
  getCategoryByNameStorage,
  getCategoryStorage,
  getOrCreateCategoryByNameStorage,
  updateCategoryStorage,
} from "../storage-modules/categoryStorage";

import {
  clearChatHistoryStorage,
  createConversationStorage,
  createProjectStorage,
  deleteConversationStorage,
  deleteProjectStorage,
  getChatHistoryStorage,
  getConversationMessagesStorage,
  getConversationStorage,
  getConversationsStorage,
  getProjectsStorage,
  moveConversationToProjectStorage,
  saveChatMessageStorage,
  updateConversationStorage,
  updateProjectStorage,
} from "../storage-modules/collaborationStorage";

import {
  createKnowledgeBaseFileStorage,
  deleteKnowledgeBaseFileStorage,
  getAllKnowledgeBaseFilesStorage,
  getKnowledgeBaseFileStorage,
  getOpenaiSettingsStorage,
  saveOpenaiSettingsStorage,
  updateKnowledgeBaseFileStatusStorage,
  updateKnowledgeBaseFileStorage,
} from "../storage-modules/openaiKnowledgeStorage";

import {
  createReminderStorage,
  deleteNotificationStorage,
  deleteReminderStorage,
  getNotificationByIdStorage,
  getNotificationsByUserStorage,
  getReminderByIdStorage,
  getRemindersByClientStorage,
  getRemindersByUserStorage,
  markNotificationAsReadStorage,
  markNotificationAsResolvedStorage,
  updateReminderStorage,
} from "../storage-modules/reminderNotificationStorage";

import {
  getAllTemplateTagsStorage,
} from "../storage-modules/templateTagStorage";

import {
  addUserTagStorage,
  createTemplateStorage,
  deleteTemplateStorage,
  getTemplateStorage,
  getUserTagsStorage,
  getUserTemplatesStorage,
  removeUserTagByIdStorage,
  removeUserTagStorage,
  updateTemplateStorage,
} from "../storage-modules/templateUserTagStorage";

import {
  getWidgetLayoutStorage,
  saveWidgetLayoutStorage,
} from "../storage-modules/widgetLayoutStorage";

export const reminderCollaborationMethods: Partial<StorageRuntimeContract> = {
  // Reminder operations
  async getRemindersByUser(userId, tenantId) {
      return await getRemindersByUserStorage(userId, tenantId);
  },

  async getRemindersByClient(clientId, tenantId) {
      return await getRemindersByClientStorage(clientId, tenantId);
  },

  async getReminderById(id, tenantId) {
      return await getReminderByIdStorage(id, tenantId);
  },

  async createReminder(reminder) {
      return await createReminderStorage(reminder);
  },

  async updateReminder(id, tenantId, updates) {
      return await updateReminderStorage(id, tenantId, updates);
  },

  async deleteReminder(id, tenantId) {
      await deleteReminderStorage(id, tenantId);
  },

  // Notification operations
  async getNotificationsByUser(userId, tenantId) {
      return await getNotificationsByUserStorage(userId, tenantId);
  },

  async getNotificationById(id, tenantId) {
      return await getNotificationByIdStorage(id, tenantId);
  },

  async markNotificationAsRead(id, tenantId) {
      return await markNotificationAsReadStorage(id, tenantId);
  },

  async markNotificationAsResolved(id, tenantId) {
      return await markNotificationAsResolvedStorage(id, tenantId);
  },

  async deleteNotification(id, tenantId) {
      await deleteNotificationStorage(id, tenantId);
  },

  // Widget layout operations
  async getWidgetLayout(userId, dashboardType) {
      return await getWidgetLayoutStorage(userId, dashboardType);
  },

  async saveWidgetLayout(layout) {
      return await saveWidgetLayoutStorage(layout);
  },

  // OpenAI operations
  async getOpenaiSettings(tenantId) {
      return await getOpenaiSettingsStorage(tenantId);
  },

  async saveOpenaiSettings(tenantId, settings) {
      return await saveOpenaiSettingsStorage(tenantId, settings);
  },

  // Knowledge base operations (OpenAI Sales Assistant)
  async getAllKnowledgeBaseFiles(tenantId) {
      return await getAllKnowledgeBaseFilesStorage(tenantId);
  },

  async getKnowledgeBaseFile(id, tenantId) {
      return await getKnowledgeBaseFileStorage(id, tenantId);
  },

  async createKnowledgeBaseFile(file) {
      return await createKnowledgeBaseFileStorage(file);
  },

  async updateKnowledgeBaseFileStatus(id, tenantId, status) {
      return await updateKnowledgeBaseFileStatusStorage(id, tenantId, status);
  },

  async updateKnowledgeBaseFile(id, tenantId, updates) {
      return await updateKnowledgeBaseFileStorage(id, tenantId, updates);
  },

  async deleteKnowledgeBaseFile(id, tenantId) {
      await deleteKnowledgeBaseFileStorage(id, tenantId);
  },

  // Chat operations
  async getChatHistory(userId, tenantId, limit = 50) {
      return await getChatHistoryStorage(userId, tenantId, limit);
  },

  async saveChatMessage(message) {
      return await saveChatMessageStorage(message);
  },

  async clearChatHistory(userId, tenantId) {
      await clearChatHistoryStorage(userId, tenantId);
  },

  async getConversationMessages(conversationId, tenantId) {
      return await getConversationMessagesStorage(conversationId, tenantId);
  },

  // Project operations
  async getProjects(userId, tenantId) {
      return await getProjectsStorage(userId, tenantId);
  },

  async createProject(project) {
      return await createProjectStorage(project);
  },

  async updateProject(id, tenantId, updates) {
      return await updateProjectStorage(id, tenantId, updates);
  },

  async deleteProject(id, tenantId) {
      await deleteProjectStorage(id, tenantId);
  },

  // Conversation operations
  async getConversations(userId, tenantId) {
      return await getConversationsStorage(userId, tenantId);
  },

  async getConversation(id, tenantId) {
      return await getConversationStorage(id, tenantId);
  },

  async createConversation(conversation) {
      return await createConversationStorage(conversation);
  },

  async updateConversation(id, tenantId, updates) {
      return await updateConversationStorage(id, tenantId, updates);
  },

  async deleteConversation(id, tenantId) {
      await deleteConversationStorage(id, tenantId);
  },

  async moveConversationToProject(conversationId, tenantId, projectId) {
      return await moveConversationToProjectStorage(conversationId, tenantId, projectId);
  },

  // Template operations
  async getUserTemplates(userId, tenantId) {
      return await getUserTemplatesStorage(userId, tenantId);
  },

  async getTemplate(id, tenantId) {
      return await getTemplateStorage(id, tenantId);
  },

  async createTemplate(template) {
      return await createTemplateStorage(template);
  },

  async updateTemplate(id, tenantId, updates) {
      return await updateTemplateStorage(id, tenantId, updates);
  },

  async deleteTemplate(id, tenantId) {
      await deleteTemplateStorage(id, tenantId);
  },

  async getAllTemplateTags(tenantId) {
      return await getAllTemplateTagsStorage(tenantId);
  },

  // User Tag operations
  async getUserTags(userId) {
      return await getUserTagsStorage(userId);
  },

  async addUserTag(userId, tag, tenantId) {
      return await addUserTagStorage(userId, tag, tenantId);
  },

  async removeUserTag(userId, tag) {
      await removeUserTagStorage(userId, tag);
  },

  async removeUserTagById(userId, id) {
      await removeUserTagByIdStorage(userId, id);
  },

  // Category operations
  async getAllCategories(tenantId, projectId?) {
      return await getAllCategoriesStorage(tenantId, projectId);
  },

  async getActiveCategories(tenantId, projectId?) {
      return await getActiveCategoriesStorage(tenantId, projectId);
  },

  async getCategory(id) {
      return await getCategoryStorage(id);
  },

  async getCategoryByName(tenantId, name, projectId?) {
      return await getCategoryByNameStorage(tenantId, name, projectId);
  },

  async getOrCreateCategoryByName(tenantId, name, projectId?) {
      return await getOrCreateCategoryByNameStorage(tenantId, name, projectId);
  },

  async createCategory(category) {
      return await createCategoryStorage(category);
  },

  async updateCategory(id, updates) {
      return await updateCategoryStorage(id, updates);
  },

  async deleteCategory(id) {
      await deleteCategoryStorage(id);
  }
};

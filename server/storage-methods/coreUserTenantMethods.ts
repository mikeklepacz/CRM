import type { StorageRuntimeContract } from "../storage.runtime-contract";

import {
  generateSlugFromNameStorage,
  generateTenantInviteTokenStorage,
} from "../storage-modules/storageUtility";

import {
  acceptTenantInviteStorage,
  cancelTenantInviteStorage,
  createTenantInviteStorage,
  getTenantInviteByTokenStorage,
  listTenantInvitesStorage,
} from "../storage-modules/tenantInviteStorage";

import {
  addUserToTenantStorage,
  createTenantStorage,
  getAllTenantsStorage,
  getPlatformMetricsStorage,
  getTenantByIdOrSlugStorage,
  getTenantByIdStorage,
  getTenantSettingsStorage,
  getTenantStatsStorage,
  getUserTenantMembershipsStorage,
  getUserTenantRoleStorage,
  listTenantUsersStorage,
  listTenantsStorage,
  listUsersAcrossTenantsStorage,
  removeUserFromTenantStorage,
  updateTenantSettingsStorage,
  updateTenantStorage,
  updateUserRoleInTenantStorage,
} from "../storage-modules/tenantManagementStorage";

import {
  createPasswordUserStorage,
  createUserStorage,
  getAgentsStorage,
  getAllUsersStorage,
  getUserByEmailStorage,
  getUserByUsernameStorage,
  getUserDefaultTenantStorage,
  getUserStorage,
  updateUserRoleStorage,
  upsertUserStorage,
} from "../storage-modules/userAccountStorage";

export const coreUserTenantMethods: Partial<StorageRuntimeContract> = {
  // User operations
  async getUser(id) {
    return await getUserStorage(id);
  },

  async getUserByUsername(username) {
    return await getUserByUsernameStorage(username);
  },

  async getUserByEmail(email) {
    return await getUserByEmailStorage(email);
  },

  async getAllUsers() {
    return await getAllUsersStorage();
  },

  async createUser(userData) {
    return await createUserStorage(userData);
  },

  async createPasswordUser(userData) {
    return await createPasswordUserStorage(userData);
  },

  async upsertUser(userData) {
    return await upsertUserStorage(userData);
  },

  async updateUserRole(id, role) {
    return await updateUserRoleStorage(id, role);
  },

  async getAgents() {
    return await getAgentsStorage();
  },

  async getUserDefaultTenant(userId) {
    return await getUserDefaultTenantStorage(userId);
  },

  async listTenants() {
    return await listTenantsStorage();
  },

  async getTenantById(tenantId) {
    return await getTenantByIdStorage(tenantId);
  },

  async getTenantByIdOrSlug(idOrSlug) {
    return await getTenantByIdOrSlugStorage(idOrSlug);
  },

  async getAllTenants() {
    return await getAllTenantsStorage();
  },

  async createTenant(data) {
    const slug = data.slug || generateSlugFromNameStorage(data.name);
    return await createTenantStorage(data, slug);
  },

  async updateTenant(tenantId, updates) {
    return await updateTenantStorage(tenantId, updates);
  },

  async getTenantStats(tenantId) {
    return await getTenantStatsStorage(tenantId);
  },

  async listUsersAcrossTenants() {
    return await listUsersAcrossTenantsStorage();
  },

  async getUserTenantMemberships(userId) {
    return await getUserTenantMembershipsStorage(userId);
  },

  async getUserTenantRole(userId, tenantId) {
    return await getUserTenantRoleStorage(userId, tenantId);
  },

  async addUserToTenant(userId, tenantId, roleInTenant, isDefault?) {
    await addUserToTenantStorage(userId, tenantId, roleInTenant, isDefault);
  },

  async removeUserFromTenant(userId, tenantId) {
    await removeUserFromTenantStorage(userId, tenantId);
  },

  async getPlatformMetrics() {
    return await getPlatformMetricsStorage();
  },

  // Org Admin operations
  async listTenantUsers(tenantId) {
    return await listTenantUsersStorage(tenantId);
  },

  async updateUserRoleInTenant(userId, tenantId, newRole) {
    await updateUserRoleInTenantStorage(userId, tenantId, newRole);
  },

  async getTenantSettings(tenantId) {
    return await getTenantSettingsStorage(tenantId);
  },

  async updateTenantSettings(tenantId, settings) {
    return await updateTenantSettingsStorage(tenantId, settings);
  },

  // Tenant invite operations
  async createTenantInvite(tenantId, email, role, invitedBy, expiresAt) {
    const inviteToken = generateTenantInviteTokenStorage();
    return await createTenantInviteStorage(tenantId, email, role, inviteToken, invitedBy, expiresAt);
  },

  async listTenantInvites(tenantId) {
    return await listTenantInvitesStorage(tenantId);
  },

  async getTenantInviteByToken(token) {
    return await getTenantInviteByTokenStorage(token);
  },

  async cancelTenantInvite(inviteId, tenantId) {
    await cancelTenantInviteStorage(inviteId, tenantId);
  },

  async acceptTenantInvite(token, userId) {
    await acceptTenantInviteStorage(token, userId);
  },
};

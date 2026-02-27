import type { StorageRuntimeContract } from "../storage.runtime-contract";

import {
  createAssistantBlueprintStorage,
  deleteAssistantBlueprintStorage,
  getAssistantBlueprintByIdStorage,
  listAssistantBlueprintsStorage,
  updateAssistantBlueprintStorage,
} from "../storage-modules/assistantBlueprintStorage";

import {
  createPipelineStageStorage,
  createPipelineStorage,
  deletePipelineStageStorage,
  deletePipelineStorage,
  getPipelineByIdStorage,
  getPipelineBySlugStorage,
  getPipelineStageByIdStorage,
  listPipelineStagesStorage,
  listPipelinesStorage,
  reorderPipelineStagesStorage,
  updatePipelineStageStorage,
  updatePipelineStorage,
} from "../storage-modules/pipelineStorage";

import { generateSlugFromNameStorage } from "../storage-modules/storageUtility";

import {
  archiveTenantProjectStorage,
  createTenantProjectStorage,
  deleteTenantProjectStorage,
  getDefaultTenantProjectStorage,
  getTenantProjectByIdStorage,
  getTenantProjectBySlugStorage,
  listTenantProjectsStorage,
  restoreTenantProjectStorage,
  setDefaultTenantProjectStorage,
  updateTenantProjectStorage,
} from "../storage-modules/tenantProjectStorage";

import {
  deleteUserStorage,
  updateUserStorage,
} from "../storage-modules/userAccountStorage";

export const pipelineProjectBlueprintMethods: Partial<StorageRuntimeContract> = {
  // Pipeline operations
  async listPipelines(tenantId, projectId?) {
    return await listPipelinesStorage(tenantId, projectId);
  },

  async getPipelineById(pipelineId, tenantId) {
    return await getPipelineByIdStorage(pipelineId, tenantId);
  },

  async getPipelineBySlug(slug, tenantId) {
    return await getPipelineBySlugStorage(slug, tenantId);
  },

  async createPipeline(data) {
    return await createPipelineStorage(data);
  },

  async updatePipeline(pipelineId, tenantId, updates) {
    return await updatePipelineStorage(pipelineId, tenantId, updates);
  },

  async deletePipeline(pipelineId, tenantId) {
    await deletePipelineStorage(pipelineId, tenantId);
  },

  // Pipeline stage operations
  async listPipelineStages(pipelineId, tenantId) {
    return await listPipelineStagesStorage(pipelineId, tenantId);
  },

  async getPipelineStageById(stageId, tenantId) {
    return await getPipelineStageByIdStorage(stageId, tenantId);
  },

  async createPipelineStage(data) {
    return await createPipelineStageStorage(data);
  },

  async updatePipelineStage(stageId, tenantId, updates) {
    return await updatePipelineStageStorage(stageId, tenantId, updates);
  },

  async deletePipelineStage(stageId, tenantId) {
    await deletePipelineStageStorage(stageId, tenantId);
  },

  async reorderPipelineStages(pipelineId, tenantId, stageIds) {
    await reorderPipelineStagesStorage(pipelineId, tenantId, stageIds);
  },

  // Tenant Project operations
  async listTenantProjects(tenantId, status?) {
    return await listTenantProjectsStorage(tenantId, status);
  },

  async getTenantProjectById(projectId, tenantId) {
    return await getTenantProjectByIdStorage(projectId, tenantId);
  },

  async getTenantProjectBySlug(slug, tenantId) {
    return await getTenantProjectBySlugStorage(slug, tenantId);
  },

  async getDefaultTenantProject(tenantId) {
    return await getDefaultTenantProjectStorage(tenantId);
  },

  async createTenantProject(data) {
    const slug = data.slug || generateSlugFromNameStorage(data.name);
    return await createTenantProjectStorage(data, slug);
  },

  async updateTenantProject(projectId, tenantId, updates) {
    return await updateTenantProjectStorage(projectId, tenantId, updates);
  },

  async archiveTenantProject(projectId, tenantId, archivedBy) {
    return await archiveTenantProjectStorage(projectId, tenantId, archivedBy);
  },

  async restoreTenantProject(projectId, tenantId) {
    return await restoreTenantProjectStorage(projectId, tenantId);
  },

  async setDefaultTenantProject(projectId, tenantId) {
    return await setDefaultTenantProjectStorage(projectId, tenantId);
  },

  async deleteTenantProject(projectId, tenantId) {
    await deleteTenantProjectStorage(projectId, tenantId);
  },

  // Assistant Blueprint operations
  async listAssistantBlueprints(tenantId, blueprintType?) {
    return await listAssistantBlueprintsStorage(tenantId, blueprintType);
  },

  async getAssistantBlueprintById(blueprintId, tenantId) {
    return await getAssistantBlueprintByIdStorage(blueprintId, tenantId);
  },

  async createAssistantBlueprint(data) {
    const slug = data.slug || generateSlugFromNameStorage(data.name);
    return await createAssistantBlueprintStorage(data, slug);
  },

  async updateAssistantBlueprint(blueprintId, tenantId, updates) {
    return await updateAssistantBlueprintStorage(blueprintId, tenantId, updates);
  },

  async deleteAssistantBlueprint(blueprintId, tenantId) {
    await deleteAssistantBlueprintStorage(blueprintId, tenantId);
  },

  async updateUser(id, updates) {
    return await updateUserStorage(id, updates);
  },

  async deleteUser(id) {
    await deleteUserStorage(id);
  },
};

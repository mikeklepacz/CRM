import type {
  Project,
  Tenant,
  TenantUserInvite,
  Pipeline,
  InsertPipeline,
  PipelineStage,
  InsertPipelineStage,
  TenantProject,
  InsertTenantProject,
} from "./shared-types";

export interface OrganizationStorageContract {
  // Tenant invite operations
  createTenantInvite(tenantId: string, email: string, role: string, invitedBy: string, expiresAt: Date): Promise<TenantUserInvite>;
  listTenantInvites(tenantId: string): Promise<TenantUserInvite[]>;
  getTenantInviteByToken(token: string): Promise<TenantUserInvite | undefined>;
  cancelTenantInvite(inviteId: string, tenantId: string): Promise<void>;
  acceptTenantInvite(token: string, userId: string): Promise<void>;

  // Pipeline operations
  listPipelines(tenantId: string, projectId?: string): Promise<Pipeline[]>;
  getPipelineById(pipelineId: string, tenantId: string): Promise<Pipeline | undefined>;
  getPipelineBySlug(slug: string, tenantId: string): Promise<Pipeline | undefined>;
  createPipeline(data: InsertPipeline): Promise<Pipeline>;
  updatePipeline(pipelineId: string, tenantId: string, updates: Partial<InsertPipeline>): Promise<Pipeline>;
  deletePipeline(pipelineId: string, tenantId: string): Promise<void>;
  
  // Pipeline stage operations
  listPipelineStages(pipelineId: string, tenantId: string): Promise<PipelineStage[]>;
  getPipelineStageById(stageId: string, tenantId: string): Promise<PipelineStage | undefined>;
  createPipelineStage(data: InsertPipelineStage): Promise<PipelineStage>;
  updatePipelineStage(stageId: string, tenantId: string, updates: Partial<InsertPipelineStage>): Promise<PipelineStage>;
  deletePipelineStage(stageId: string, tenantId: string): Promise<void>;
  reorderPipelineStages(pipelineId: string, tenantId: string, stageIds: string[]): Promise<void>;

  // Tenant Project operations (business projects/campaigns/cases)
  listTenantProjects(tenantId: string, status?: string): Promise<TenantProject[]>;
  getTenantProjectById(projectId: string, tenantId: string): Promise<TenantProject | undefined>;
  getTenantProjectBySlug(slug: string, tenantId: string): Promise<TenantProject | undefined>;
  getDefaultTenantProject(tenantId: string): Promise<TenantProject | undefined>;
  createTenantProject(data: InsertTenantProject): Promise<TenantProject>;
  updateTenantProject(projectId: string, tenantId: string, updates: Partial<InsertTenantProject>): Promise<TenantProject>;
  archiveTenantProject(projectId: string, tenantId: string, archivedBy: string): Promise<TenantProject>;
  restoreTenantProject(projectId: string, tenantId: string): Promise<TenantProject>;
  setDefaultTenantProject(projectId: string, tenantId: string): Promise<TenantProject>;
  deleteTenantProject(projectId: string, tenantId: string): Promise<void>;

}

export interface TenantUser {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  roleInTenant: string;
  joinedAt: string | null;
  agentName: string | null;
  phone: string | null;
  twilioPhoneNumber: string | null;
  meetingLink: string | null;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: string;
  settings: {
    companyName?: string;
    timezone?: string;
    enabledModules?: string[];
    allowedModules?: string[];
    primaryColor?: string;
    logoUrl?: string;
  };
  createdAt: string;
}

export interface TenantStats {
  userCount: number;
  clientCount: number;
  callCount: number;
}

export interface TenantInvite {
  id: string;
  email: string;
  role: string;
  status: string;
  expiresAt: string;
  createdAt: string;
}

export interface Pipeline {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  pipelineType: string;
  description: string | null;
  aiPromptTemplate: string | null;
  aiAssistantId: string | null;
  voiceAgentId: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ElevenLabsAgent {
  id: string;
  name: string;
  agentId: string;
  isDefault: boolean;
}

export interface PipelineStage {
  id: string;
  tenantId: string;
  pipelineId: string;
  name: string;
  stageOrder: number;
  stageType: string;
  config: Record<string, any> | null;
  isTerminal: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PipelineWithStages extends Pipeline {
  stages: PipelineStage[];
}

export interface TenantProject {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  projectType: string;
  description: string | null;
  accentColor: string | null;
  status: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

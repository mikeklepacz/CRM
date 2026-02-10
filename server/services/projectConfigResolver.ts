import { storage } from '../storage';
import type { Tenant, TenantProject, EhubSettings } from '@shared/schema';

export interface ResolvedEhubConfig {
  minDelayMinutes: number;
  maxDelayMinutes: number;
  jitterPercentage: number;
  dailyEmailLimit: number;
  sendingHoursStart: number;
  sendingHoursDuration: number | null;
  sendingHoursEnd: number;
  clientWindowStartOffset: string;
  clientWindowEndHour: number;
  promptInjection: string | null;
  keywordBin: string | null;
  excludedDays: number[];
}

export interface ResolvedVoiceConfig {
  defaultVoiceAgentId: string | null;
  defaultSequenceId: string | null;
}

export interface ResolvedProjectConfig {
  tenantId: string;
  projectId: string;
  projectName: string;
  projectStatus: string;
  ehub: ResolvedEhubConfig;
  voice: ResolvedVoiceConfig;
  tenant: {
    name: string;
    timezone: string | null;
    enabledModules: string[];
    branding: {
      primaryColor: string | null;
      logoUrl: string | null;
      companyName: string | null;
    };
  };
  raw: {
    tenantSettings: Tenant['settings'];
    projectSettings: TenantProject['settings'];
  };
}

const defaultEhubConfig: ResolvedEhubConfig = {
  minDelayMinutes: 1,
  maxDelayMinutes: 3,
  jitterPercentage: 50,
  dailyEmailLimit: 200,
  sendingHoursStart: 9,
  sendingHoursDuration: null,
  sendingHoursEnd: 14,
  clientWindowStartOffset: '1.00',
  clientWindowEndHour: 14,
  promptInjection: null,
  keywordBin: null,
  excludedDays: [],
};

function mergeEhubConfig(
  tenantEhubSettings: EhubSettings | undefined,
  projectSettings: TenantProject['settings']
): ResolvedEhubConfig {
  const base: ResolvedEhubConfig = {
    minDelayMinutes: tenantEhubSettings?.minDelayMinutes ?? defaultEhubConfig.minDelayMinutes,
    maxDelayMinutes: tenantEhubSettings?.maxDelayMinutes ?? defaultEhubConfig.maxDelayMinutes,
    jitterPercentage: tenantEhubSettings?.jitterPercentage ?? defaultEhubConfig.jitterPercentage,
    dailyEmailLimit: tenantEhubSettings?.dailyEmailLimit ?? defaultEhubConfig.dailyEmailLimit,
    sendingHoursStart: tenantEhubSettings?.sendingHoursStart ?? defaultEhubConfig.sendingHoursStart,
    sendingHoursDuration: tenantEhubSettings?.sendingHoursDuration ?? defaultEhubConfig.sendingHoursDuration,
    sendingHoursEnd: tenantEhubSettings?.sendingHoursEnd ?? defaultEhubConfig.sendingHoursEnd,
    clientWindowStartOffset: tenantEhubSettings?.clientWindowStartOffset ?? defaultEhubConfig.clientWindowStartOffset,
    clientWindowEndHour: tenantEhubSettings?.clientWindowEndHour ?? defaultEhubConfig.clientWindowEndHour,
    promptInjection: tenantEhubSettings?.promptInjection ?? defaultEhubConfig.promptInjection,
    keywordBin: tenantEhubSettings?.keywordBin ?? defaultEhubConfig.keywordBin,
    excludedDays: tenantEhubSettings?.excludedDays ?? defaultEhubConfig.excludedDays,
  };

  if (projectSettings?.keywordBin) {
    if (base.keywordBin) {
      base.keywordBin = `${base.keywordBin}\n\n--- Project-Specific Keywords ---\n${projectSettings.keywordBin}`;
    } else {
      base.keywordBin = projectSettings.keywordBin;
    }
  }

  return base;
}

function mergeVoiceConfig(projectSettings: TenantProject['settings']): ResolvedVoiceConfig {
  return {
    defaultVoiceAgentId: projectSettings?.defaultVoiceAgentId ?? null,
    defaultSequenceId: projectSettings?.defaultSequenceId ?? null,
  };
}

export async function resolveProjectConfig(
  tenantId: string,
  projectId: string
): Promise<ResolvedProjectConfig | null> {
  const [tenant, project, ehubSettings] = await Promise.all([
    storage.getTenantById(tenantId),
    storage.getTenantProjectById(projectId, tenantId),
    storage.getEhubSettings(tenantId),
  ]);

  if (!tenant || !project) {
    return null;
  }

  const tenantSettings = tenant.settings || {};
  const projectSettings = project.settings || {};

  return {
    tenantId,
    projectId,
    projectName: project.name,
    projectStatus: project.status,
    ehub: mergeEhubConfig(ehubSettings, projectSettings),
    voice: mergeVoiceConfig(projectSettings),
    tenant: {
      name: tenant.name,
      timezone: tenantSettings.timezone ?? null,
      enabledModules: tenantSettings.enabledModules ?? ['clients', 'sales'],
      branding: {
        primaryColor: tenantSettings.primaryColor ?? null,
        logoUrl: tenantSettings.logoUrl ?? null,
        companyName: tenantSettings.companyName ?? null,
      },
    },
    raw: {
      tenantSettings,
      projectSettings,
    },
  };
}

export async function resolveDefaultProjectConfig(
  tenantId: string
): Promise<ResolvedProjectConfig | null> {
  const defaultProject = await storage.getDefaultTenantProject(tenantId);
  
  if (!defaultProject) {
    const projects = await storage.listTenantProjects(tenantId, 'active');
    if (projects.length === 0) {
      return null;
    }
    return resolveProjectConfig(tenantId, projects[0].id);
  }

  return resolveProjectConfig(tenantId, defaultProject.id);
}

export function composeAIPrompt(
  basePrompt: string,
  config: ResolvedProjectConfig
): string {
  const parts: string[] = [];

  parts.push(basePrompt);

  if (config.tenant.branding.companyName) {
    parts.push(`\nCompany: ${config.tenant.branding.companyName}`);
  }

  parts.push(`\nProject: ${config.projectName}`);

  if (config.ehub.keywordBin) {
    parts.push(`\n\n--- Keywords & Context ---\n${config.ehub.keywordBin}`);
  }

  if (config.ehub.promptInjection) {
    parts.push(`\n\n--- Additional Instructions ---\n${config.ehub.promptInjection}`);
  }

  return parts.join('');
}

export async function getProjectEhubKeywords(
  tenantId: string,
  projectId: string
): Promise<string | null> {
  const config = await resolveProjectConfig(tenantId, projectId);
  return config?.ehub.keywordBin ?? null;
}

export async function getProjectVoiceAgentId(
  tenantId: string,
  projectId: string
): Promise<string | null> {
  const config = await resolveProjectConfig(tenantId, projectId);
  return config?.voice.defaultVoiceAgentId ?? null;
}

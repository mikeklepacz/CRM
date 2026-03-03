import type { Express } from "express";
import { registerSuperAdminTenantsRoutes } from "../platform/superAdminTenants.routes";
import { registerSuperAdminUsersRoutes } from "../platform/superAdminUsers.routes";
import { registerSuperAdminElevenLabsConfigWebhookRoutes } from "../platform/superAdminElevenLabsConfigWebhook.routes";
import { registerSuperAdminElevenLabsAgentsRoutes } from "../platform/superAdminElevenLabsAgents.routes";
import { registerSuperAdminTenantSheetsRoutes } from "../platform/superAdminTenantSheets.routes";
import { registerSuperAdminTenantWebhooksRoutes } from "../platform/superAdminTenantWebhooks.routes";
import { registerOrgAdminCoreRoutes } from "../organization/orgAdminCore.routes";
import { registerOrgAdminPipelinesRoutes } from "../organization/orgAdminPipelines.routes";
import { registerOrgAdminProjectsRoutes } from "../organization/orgAdminProjects.routes";
import { registerOrgAdminBlueprintsRoutes } from "../organization/orgAdminBlueprints.routes";
import { registerTenantContextRoutes } from "../organization/tenantContext.routes";
import { registerQualificationRoutes } from "../qualification.routes";
import { registerOrganizationInvitesRoutes } from "../organization/invites.routes";
import { registerAdminEmailAccountsRoutes } from "../admin/emailAccounts.routes";
import { registerEmailImagesRoutes } from "../docs/emailImages.routes";
import { registerApolloCoreRoutes } from "../apollo/apolloCore.routes";
import { registerApolloLeadDiscoveryRoutes } from "../apollo/apolloLeadDiscovery.routes";
import { registerApolloPrescreenRoutes } from "../apollo/apolloPrescreen.routes";

type Deps = {
  getEffectiveTenantId: any;
  isAdmin: any;
  isAuthenticated: any;
  isAuthenticatedCustom: any;
  requireAgent: any;
  requireOrgAdmin: any;
  requireSuperAdmin: any;
  syncAgentSettingsFromElevenLabs: any;
};

export function registerGovernanceModuleRoutes(app: Express, deps: Deps): void {
  registerSuperAdminTenantsRoutes(app, { requireSuperAdmin: deps.requireSuperAdmin });
  registerSuperAdminUsersRoutes(app, { requireSuperAdmin: deps.requireSuperAdmin });
  registerSuperAdminElevenLabsConfigWebhookRoutes(app, { requireSuperAdmin: deps.requireSuperAdmin });
  registerSuperAdminElevenLabsAgentsRoutes(app, {
    requireSuperAdmin: deps.requireSuperAdmin,
    syncAgentSettingsFromElevenLabs: deps.syncAgentSettingsFromElevenLabs,
  });
  registerSuperAdminTenantSheetsRoutes(app, { requireSuperAdmin: deps.requireSuperAdmin });
  registerSuperAdminTenantWebhooksRoutes(app, { requireSuperAdmin: deps.requireSuperAdmin });

  registerOrgAdminCoreRoutes(app, { requireOrgAdmin: deps.requireOrgAdmin });
  registerOrgAdminPipelinesRoutes(app, { requireOrgAdmin: deps.requireOrgAdmin });
  registerOrgAdminProjectsRoutes(app, { requireOrgAdmin: deps.requireOrgAdmin });
  registerOrgAdminBlueprintsRoutes(app, { requireOrgAdmin: deps.requireOrgAdmin });
  registerTenantContextRoutes(app, { requireAgent: deps.requireAgent });
  registerQualificationRoutes(app, {
    requireOrgAdmin: deps.requireOrgAdmin,
    isAuthenticated: deps.isAuthenticated,
  });
  registerOrganizationInvitesRoutes(app, { isAuthenticated: deps.isAuthenticated });

  registerAdminEmailAccountsRoutes(app, {
    isAdmin: deps.isAdmin,
    isAuthenticatedCustom: deps.isAuthenticatedCustom,
    getEffectiveTenantId: deps.getEffectiveTenantId,
  });
  registerEmailImagesRoutes(app);
  registerApolloCoreRoutes(app, {
    isAdmin: deps.isAdmin,
    isAuthenticatedCustom: deps.isAuthenticatedCustom,
    getEffectiveTenantId: deps.getEffectiveTenantId,
  });
  registerApolloLeadDiscoveryRoutes(app, {
    isAdmin: deps.isAdmin,
    isAuthenticatedCustom: deps.isAuthenticatedCustom,
    getEffectiveTenantId: deps.getEffectiveTenantId,
  });
  registerApolloPrescreenRoutes(app, {
    isAdmin: deps.isAdmin,
    isAuthenticatedCustom: deps.isAuthenticatedCustom,
    getEffectiveTenantId: deps.getEffectiveTenantId,
  });
}

import type { Express } from "express";
import { registerTicketsReadRoutes } from "../docs/ticketsRead.routes";
import { registerTicketsWriteRoutes } from "../docs/ticketsWrite.routes";
import { registerSuperAdminTicketsWebhooksRoutes } from "../platform/superAdminTicketsWebhooks.routes";
import { registerAdminWebhooksRoutes } from "../admin/adminWebhooks.routes";
import { registerFollowUpRoutes } from "../followup.routes";
import { registerDriveRoutes } from "../docs/drive.routes";
import type { EngagementModuleDeps } from "./engagementModule.types";

export function registerEngagementDocsOpsRoutes(app: Express, deps: EngagementModuleDeps): void {
  registerTicketsReadRoutes(app, {
    checkAdminAccess: deps.checkAdminAccess,
    isAuthenticatedCustom: deps.isAuthenticatedCustom,
  });
  registerTicketsWriteRoutes(app, {
    checkAdminAccess: deps.checkAdminAccess,
    isAuthenticatedCustom: deps.isAuthenticatedCustom,
  });
  registerSuperAdminTicketsWebhooksRoutes(app, { isAuthenticatedCustom: deps.isAuthenticatedCustom });
  registerAdminWebhooksRoutes(app, { isAdmin: deps.isAdmin, isAuthenticatedCustom: deps.isAuthenticatedCustom });

  registerFollowUpRoutes(app, { isAuthenticatedCustom: deps.isAuthenticatedCustom });
  registerDriveRoutes(app, { isAdmin: deps.isAdmin, isAuthenticatedCustom: deps.isAuthenticatedCustom });
}

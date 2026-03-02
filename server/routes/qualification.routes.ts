import type { Express } from "express";
import { registerQualificationCampaignRoutes } from "./qualification/campaigns.routes";
import { registerQualificationLeadRoutes } from "./qualification/leads.routes";

export function registerQualificationRoutes(
  app: Express,
  deps: {
    requireOrgAdmin: any;
    isAuthenticated: any;
  }
): void {
  registerQualificationCampaignRoutes(app, { requireOrgAdmin: deps.requireOrgAdmin });
  registerQualificationLeadRoutes(app, { isAuthenticated: deps.isAuthenticated });
}

import type { Express } from "express";
import type { QualificationCampaignsDeps as Deps } from "./campaigns.types";
import { registerQualificationCampaignsListRoute } from "./qualificationCampaignsList.routes";
import { registerQualificationCampaignsGetByIdRoute } from "./qualificationCampaignsGetById.routes";
import { registerQualificationCampaignsCreateRoute } from "./qualificationCampaignsCreate.routes";
import { registerQualificationCampaignsPatchRoute } from "./qualificationCampaignsPatch.routes";
import { registerQualificationCampaignsDeleteRoute } from "./qualificationCampaignsDelete.routes";

export function registerQualificationCampaignRoutes(
  app: Express,
  deps: Deps
): void {
  registerQualificationCampaignsListRoute(app, deps);
  registerQualificationCampaignsGetByIdRoute(app, deps);
  registerQualificationCampaignsCreateRoute(app, deps);
  registerQualificationCampaignsPatchRoute(app, deps);
  registerQualificationCampaignsDeleteRoute(app, deps);
}

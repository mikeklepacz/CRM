import type { Express } from "express";
import { registerOrgAdminPipelinesCreateRoute } from "./orgAdminPipelinesCreate.routes";
import { registerOrgAdminPipelinesDeleteRoute } from "./orgAdminPipelinesDelete.routes";
import { registerOrgAdminPipelinesGetByIdRoute } from "./orgAdminPipelinesGetById.routes";
import { registerOrgAdminPipelinesListRoute } from "./orgAdminPipelinesList.routes";
import { registerOrgAdminPipelinesPatchRoute } from "./orgAdminPipelinesPatch.routes";
import { registerOrgAdminPipelineStagesCreateRoute } from "./orgAdminPipelineStagesCreate.routes";
import { registerOrgAdminPipelineStagesDeleteRoute } from "./orgAdminPipelineStagesDelete.routes";
import { registerOrgAdminPipelineStagesPatchRoute } from "./orgAdminPipelineStagesPatch.routes";
import { registerOrgAdminPipelineStagesReorderRoute } from "./orgAdminPipelineStagesReorder.routes";
import type { OrgAdminPipelinesRouteDeps } from "./orgAdminPipelines.types";

export function registerOrgAdminPipelinesRoutes(
  app: Express,
  deps: OrgAdminPipelinesRouteDeps
): void {
  registerOrgAdminPipelinesListRoute(app, deps);
  registerOrgAdminPipelinesGetByIdRoute(app, deps);
  registerOrgAdminPipelinesCreateRoute(app, deps);
  registerOrgAdminPipelinesPatchRoute(app, deps);
  registerOrgAdminPipelinesDeleteRoute(app, deps);
  registerOrgAdminPipelineStagesCreateRoute(app, deps);
  registerOrgAdminPipelineStagesPatchRoute(app, deps);
  registerOrgAdminPipelineStagesDeleteRoute(app, deps);
  registerOrgAdminPipelineStagesReorderRoute(app, deps);
}

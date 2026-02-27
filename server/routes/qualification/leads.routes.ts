import type { Express } from "express";
import type { QualificationLeadsDeps as Deps } from "./leads.types";
import { registerQualificationLeadsListRoute } from "./qualificationLeadsList.routes";
import { registerQualificationLeadsStatsRoute } from "./qualificationLeadsStats.routes";
import { registerQualificationLeadsGetByIdRoute } from "./qualificationLeadsGetById.routes";
import { registerQualificationLeadsCreateRoute } from "./qualificationLeadsCreate.routes";
import { registerQualificationLeadsBulkCreateRoute } from "./qualificationLeadsBulkCreate.routes";
import { registerQualificationLeadsPatchRoute } from "./qualificationLeadsPatch.routes";
import { registerQualificationLeadsDeleteRoute } from "./qualificationLeadsDelete.routes";
import { registerQualificationLeadsBulkDeleteRoute } from "./qualificationLeadsBulkDelete.routes";

export function registerQualificationLeadRoutes(
  app: Express,
  deps: Deps
): void {
  registerQualificationLeadsListRoute(app, deps);
  registerQualificationLeadsStatsRoute(app, deps);
  registerQualificationLeadsGetByIdRoute(app, deps);
  registerQualificationLeadsCreateRoute(app, deps);
  registerQualificationLeadsBulkCreateRoute(app, deps);
  registerQualificationLeadsPatchRoute(app, deps);
  registerQualificationLeadsDeleteRoute(app, deps);
  registerQualificationLeadsBulkDeleteRoute(app, deps);
}

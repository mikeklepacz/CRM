import type { Express } from "express";
import type { ApolloPrescreenDeps as Deps } from "./apolloPrescreen.types";
import { registerApolloCheckEnrichmentRoute } from "./apolloCheckEnrichment.routes";
import { registerApolloNotFoundCompaniesRoute } from "./apolloNotFoundCompanies.routes";
import { registerApolloPrescreenedCompaniesRoute } from "./apolloPrescreenedCompanies.routes";
import { registerApolloBulkPrescreenRoute } from "./apolloBulkPrescreen.routes";
import { registerApolloCandidatesRoutes } from "./apolloCandidates.routes";

export function registerApolloPrescreenRoutes(
  app: Express,
  deps: Deps
): void {
  registerApolloCheckEnrichmentRoute(app, deps);
  registerApolloNotFoundCompaniesRoute(app, deps);
  registerApolloPrescreenedCompaniesRoute(app, deps);
  registerApolloBulkPrescreenRoute(app, deps);
  registerApolloCandidatesRoutes(app, deps);
}

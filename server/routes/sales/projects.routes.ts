import type { Express } from "express";
import type { SalesProjectsDeps as Deps } from "./projects.types";
import { registerProjectsListRoute } from "./projectsList.routes";
import { registerProjectsCreateRoute } from "./projectsCreate.routes";
import { registerProjectsPatchRoute } from "./projectsPatch.routes";
import { registerProjectsDeleteRoute } from "./projectsDelete.routes";

export function registerSalesProjectsRoutes(app: Express, deps: Deps): void {
  registerProjectsListRoute(app, deps);
  registerProjectsCreateRoute(app, deps);
  registerProjectsPatchRoute(app, deps);
  registerProjectsDeleteRoute(app, deps);
}

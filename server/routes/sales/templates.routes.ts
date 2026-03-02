import type { Express } from "express";
import type { SalesTemplatesDeps as Deps } from "./templates.types";
import { registerTemplatesListRoute } from "./templatesList.routes";
import { registerTemplatesCreateRoute } from "./templatesCreate.routes";
import { registerTemplatesPatchRoute } from "./templatesPatch.routes";
import { registerTemplatesDeleteRoute } from "./templatesDelete.routes";
import { registerTemplatesTagsRoute } from "./templatesTags.routes";

export function registerSalesTemplatesRoutes(app: Express, deps: Deps): void {
  registerTemplatesListRoute(app, deps);
  registerTemplatesCreateRoute(app, deps);
  registerTemplatesPatchRoute(app, deps);
  registerTemplatesDeleteRoute(app, deps);
  registerTemplatesTagsRoute(app, deps);
}

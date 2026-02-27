import type { Express } from "express";
import type { AssistantsDeps as Deps } from "./assistants.types";
import { registerAssistantsListRoute } from "./assistantsList.routes";
import { registerAssistantsGetBySlugRoute } from "./assistantsGetBySlug.routes";
import { registerAssistantsPatchRoute } from "./assistantsPatch.routes";
import { registerAssistantsFileCreateRoute } from "./assistantsFileCreate.routes";
import { registerAssistantsFileDeleteRoute } from "./assistantsFileDelete.routes";

export function registerAssistantsRoutes(app: Express, deps: Deps): void {
  registerAssistantsListRoute(app, deps);
  registerAssistantsGetBySlugRoute(app, deps);
  registerAssistantsPatchRoute(app, deps);
  registerAssistantsFileCreateRoute(app, deps);
  registerAssistantsFileDeleteRoute(app, deps);
}

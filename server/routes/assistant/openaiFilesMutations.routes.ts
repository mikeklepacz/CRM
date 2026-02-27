import type { Express } from "express";
import type { OpenaiFilesMutationsDeps as Deps } from "./openaiFilesMutations.types";
import { registerOpenaiFileUpdateRoute } from "./openaiFileUpdate.routes";
import { registerOpenaiFileDeleteRoute } from "./openaiFileDelete.routes";

export function registerOpenaiFilesMutationsRoutes(app: Express, deps: Deps): void {
  registerOpenaiFileUpdateRoute(app, deps);
  registerOpenaiFileDeleteRoute(app, deps);
}

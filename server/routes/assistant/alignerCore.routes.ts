import type { Express } from "express";
import type { AlignerCoreDeps as Deps } from "./alignerCore.types";
import { registerAlignerGetRoute } from "./alignerGet.routes";
import { registerAlignerInstructionsPatchRoute } from "./alignerInstructionsPatch.routes";
import { registerAlignerTaskPromptPatchRoute } from "./alignerTaskPromptPatch.routes";
import { registerAlignerAssistantIdPatchRoute } from "./alignerAssistantIdPatch.routes";

export function registerAlignerCoreRoutes(app: Express, deps: Deps): void {
  registerAlignerGetRoute(app, deps);
  registerAlignerInstructionsPatchRoute(app, deps);
  registerAlignerTaskPromptPatchRoute(app, deps);
  registerAlignerAssistantIdPatchRoute(app, deps);
}

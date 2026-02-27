import type { Express } from "express";
import type { SequencesConfigDeps as Deps } from "./sequencesConfig.types";
import { registerSequencesStepDelaysPutRoute } from "./sequencesStepDelaysPut.routes";
import { registerSequencesStepsGetRoute } from "./sequencesStepsGet.routes";
import { registerSequencesStepPatchRoute } from "./sequencesStepPatch.routes";
import { registerSequencesKeywordsPutRoute } from "./sequencesKeywordsPut.routes";

export function registerEhubSequencesConfigRoutes(
  app: Express,
  deps: Deps
): void {
  registerSequencesStepDelaysPutRoute(app, deps);
  registerSequencesStepsGetRoute(app, deps);
  registerSequencesStepPatchRoute(app, deps);
  registerSequencesKeywordsPutRoute(app, deps);
}

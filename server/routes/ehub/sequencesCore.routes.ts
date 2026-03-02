import type { Express } from "express";
import type { SequencesCoreDeps as Deps } from "./sequencesCore.types";
import { registerSequencesEnsureManualFollowupsRoute } from "./sequencesEnsureManualFollowups.routes";
import { registerSequencesCreateRoute } from "./sequencesCreate.routes";
import { registerSequencesListRoute } from "./sequencesList.routes";
import { registerSequencesSyncRecipientCountsRoute } from "./sequencesSyncRecipientCounts.routes";
import { registerSequencesGetByIdRoute } from "./sequencesGetById.routes";
import { registerSequencesPatchRoute } from "./sequencesPatch.routes";
import { registerSequencesDeleteRoute } from "./sequencesDelete.routes";

export function registerEhubSequencesCoreRoutes(
  app: Express,
  deps: Deps
): void {
  registerSequencesEnsureManualFollowupsRoute(app, deps);
  registerSequencesCreateRoute(app, deps);
  registerSequencesListRoute(app, deps);
  registerSequencesSyncRecipientCountsRoute(app, deps);
  registerSequencesGetByIdRoute(app, deps);
  registerSequencesPatchRoute(app, deps);
  registerSequencesDeleteRoute(app, deps);
}

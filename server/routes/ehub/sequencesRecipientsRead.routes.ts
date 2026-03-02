import type { Express } from "express";
import type { SequencesRecipientsReadDeps as Deps } from "./sequencesRecipientsRead.types";
import { registerSequencesRecipientsGetRoute } from "./sequencesRecipientsGet.routes";
import { registerSequencesRecipientsTestSendRoute } from "./sequencesRecipientsTestSend.routes";

export function registerEhubSequencesRecipientsReadRoutes(
  app: Express,
  deps: Deps
): void {
  registerSequencesRecipientsGetRoute(app, deps);
  registerSequencesRecipientsTestSendRoute(app, deps);
}

import type { Express } from "express";
import type { SequencesRecipientsReadDeps } from "./sequencesRecipientsRead.types";
import { handleSequencesRecipientsGet } from "./sequencesRecipientsGet.handler";

export function registerSequencesRecipientsGetRoute(app: Express, deps: SequencesRecipientsReadDeps): void {
  app.get("/api/sequences/:id/recipients", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    await handleSequencesRecipientsGet(req, res);
  });
}

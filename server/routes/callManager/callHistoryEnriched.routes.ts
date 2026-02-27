import type { Express } from "express";
import type { CallHistoryEnrichedDeps as Deps } from "./callHistoryEnriched.types";
import { handleCallHistoryEnriched } from "./callHistoryEnriched.handler";

export function registerCallManagerHistoryEnrichedRoutes(
  app: Express,
  deps: Deps
): void {
  app.get("/api/call-history-enriched", deps.isAuthenticatedCustom, async (req: any, res) => {
    await handleCallHistoryEnriched(req, res, deps.checkAdminAccess);
  });
}

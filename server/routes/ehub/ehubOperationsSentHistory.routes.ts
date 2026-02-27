import type { Express } from "express";
import type { EhubOperationsRouteDeps } from "./ehubOperations.types";
import { handleEhubOperationsSentHistory } from "./ehubOperationsSentHistory.handler";

export function registerEhubOperationsSentHistoryRoute(app: Express, deps: EhubOperationsRouteDeps): void {
  app.get("/api/ehub/sent-history", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    await handleEhubOperationsSentHistory(req, res);
  });
}

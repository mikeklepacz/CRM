import type { Express } from "express";
import type { EhubQueueRecipientsRouteDeps } from "./ehubQueueRecipients.types";
import { handleEhubQueueList } from "./ehubQueueList.handler";

export function registerEhubQueueListRoute(app: Express, deps: EhubQueueRecipientsRouteDeps): void {
  app.get("/api/ehub/queue", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    await handleEhubQueueList(req, res);
  });
}

import type { Express } from "express";
import type { AdminEmailAccountsRouteDeps } from "./emailAccounts.types";
import { handleEmailAccountsCallback } from "./emailAccountsCallback.handler";

export function registerEmailAccountsCallbackRoute(app: Express, deps: AdminEmailAccountsRouteDeps): void {
  app.get("/api/email-accounts/callback", async (req: any, res) => {
    await handleEmailAccountsCallback(req, res);
  });
}

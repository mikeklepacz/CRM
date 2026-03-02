import type { Express } from "express";
import { registerEmailAccountsCallbackRoute } from "./emailAccountsCallback.routes";
import { registerEmailAccountsDeleteRoute } from "./emailAccountsDelete.routes";
import { registerEmailAccountsListRoute } from "./emailAccountsList.routes";
import { registerEmailAccountsOauthUrlRoute } from "./emailAccountsOauthUrl.routes";
import { registerEmailAccountsPatchRoute } from "./emailAccountsPatch.routes";
import type { AdminEmailAccountsRouteDeps } from "./emailAccounts.types";

export function registerAdminEmailAccountsRoutes(app: Express, deps: AdminEmailAccountsRouteDeps): void {
  registerEmailAccountsListRoute(app, deps);
  registerEmailAccountsOauthUrlRoute(app, deps);
  registerEmailAccountsCallbackRoute(app, deps);
  registerEmailAccountsDeleteRoute(app, deps);
  registerEmailAccountsPatchRoute(app, deps);
}

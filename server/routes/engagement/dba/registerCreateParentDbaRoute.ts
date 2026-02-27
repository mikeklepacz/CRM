import type { DbaRouteDeps } from "./types";
import { buildCreateParentDbaHandler } from "./createParentDba.handler";

export function registerCreateParentDbaRoute(deps: DbaRouteDeps) {
  const { app, isAuthenticatedCustom } = deps;
  app.post('/api/dba/create-parent', isAuthenticatedCustom, buildCreateParentDbaHandler(deps));
}

import type { DbaRouteDeps } from "./types";
import { buildLinkChildrenDbaHandler } from "./linkChildrenDba.handler";

export function registerLinkChildrenDbaRoute(deps: DbaRouteDeps) {
  const { app, isAuthenticatedCustom } = deps;

  // Link child locations to a parent DBA
  app.post('/api/dba/link-children', isAuthenticatedCustom, buildLinkChildrenDbaHandler(deps));
}

import type { Express } from "express";
import { buildApolloLeadDiscoveryHandler } from "./apolloLeadDiscovery.handler";

export function registerApolloLeadDiscoveryRoutes(
  app: Express,
  deps: {
    isAdmin: any;
    isAuthenticatedCustom: any;
    getEffectiveTenantId: (req: any) => Promise<string | undefined>;
  }
): void {
  app.get(
    "/api/apollo/leads-without-emails",
    deps.isAuthenticatedCustom,
    deps.isAdmin,
    buildApolloLeadDiscoveryHandler(deps),
  );
}

import type { Express } from "express";
import type { ApolloManagementDeps as Deps } from "./apolloManagement.types";
import { registerApolloCompanyContactsCleanRoute } from "./apolloCompanyContactsClean.routes";
import { registerApolloContactsCleanupInvalidRoute } from "./apolloContactsCleanupInvalid.routes";
import { registerApolloContactDeleteRoute } from "./apolloContactDelete.routes";
import { registerApolloCompanyHideRoute } from "./apolloCompanyHide.routes";
import { registerApolloRetiredCompaniesRoute } from "./apolloRetiredCompanies.routes";
import { registerApolloCompanyRestoreNotFoundRoute } from "./apolloCompanyRestoreNotFound.routes";
import { registerApolloCompanyDeleteRoute } from "./apolloCompanyDelete.routes";

export function registerApolloManagementRoutes(
  app: Express,
  deps: Deps
): void {
  registerApolloCompanyContactsCleanRoute(app, deps);
  registerApolloContactsCleanupInvalidRoute(app, deps);
  registerApolloContactDeleteRoute(app, deps);
  registerApolloCompanyHideRoute(app, deps);
  registerApolloRetiredCompaniesRoute(app, deps);
  registerApolloCompanyRestoreNotFoundRoute(app, deps);
  registerApolloCompanyDeleteRoute(app, deps);
}

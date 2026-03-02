import type { Express } from "express";
import { registerApolloCompaniesListRoute } from "./apolloCompaniesList.routes";
import { registerApolloCompanyContactsRoute } from "./apolloCompanyContacts.routes";
import { registerApolloContactsByLinkRoute } from "./apolloContactsByLink.routes";
import { registerApolloEnrichRoute } from "./apolloEnrich.routes";
import { registerApolloPreviewRoute } from "./apolloPreview.routes";
import { registerApolloSearchOrganizationsRoute } from "./apolloSearchOrganizations.routes";
import { registerApolloSearchPeopleRoute } from "./apolloSearchPeople.routes";
import { registerApolloSettingsGetRoute } from "./apolloSettingsGet.routes";
import { registerApolloSettingsPatchRoute } from "./apolloSettingsPatch.routes";
import type { ApolloCoreRouteDeps } from "./apolloCore.types";

export function registerApolloCoreRoutes(
  app: Express,
  deps: ApolloCoreRouteDeps
): void {
  registerApolloSettingsGetRoute(app, deps);
  registerApolloSettingsPatchRoute(app, deps);
  registerApolloSearchOrganizationsRoute(app, deps);
  registerApolloSearchPeopleRoute(app, deps);
  registerApolloPreviewRoute(app, deps);
  registerApolloEnrichRoute(app, deps);
  registerApolloCompaniesListRoute(app, deps);
  registerApolloCompanyContactsRoute(app, deps);
  registerApolloContactsByLinkRoute(app, deps);
}

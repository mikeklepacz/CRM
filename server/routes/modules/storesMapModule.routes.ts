import type { Express } from "express";
import { registerStoreDetailsReadRoutes } from "../clients/storeDetailsRead.routes";
import { registerStoreDetailsUpdateRoutes } from "../clients/storeDetailsUpdate.routes";
import { registerStoreLifecycleRoutes } from "../clients/storeLifecycle.routes";
import { registerStoreDiscoveryRoutes } from "../clients/storeDiscovery.routes";
import { registerStoreByLinkRoutes } from "../clients/storeByLink.routes";
import { registerStoreAssignmentAdminRoutes } from "../clients/storeAssignmentAdmin.routes";
import { registerStoreParseMatchRoutes } from "../clients/storeParseMatch.routes";
import { registerStoreManualMatchingRoutes } from "../clients/storeManualMatching.routes";
import { registerNonDuplicatesRoutes } from "../clients/nonDuplicates.routes";
import { registerStoreGoogleSearchRoutes } from "../mapSearch/storeGoogleSearch.routes";
import { registerMapSearchPreferenceRoutes } from "../mapSearch/preferences.routes";
import { registerMapSearchCoreRoutes } from "../mapSearch/searchCore.routes";
import { registerMapSearchSaveActionsRoutes } from "../mapSearch/saveActions.routes";
import { registerMapSearchClientPinsRoutes } from "../mapSearch/clientPins.routes";

type Deps = {
  clearUserCache: any;
  geocodeAddress: any;
  isAdmin: any;
  isAuthenticatedCustom: any;
  memoryGeocodeCache: Map<string, { lat: number; lng: number } | null>;
};

export function registerStoresMapModuleRoutes(app: Express, deps: Deps): void {
  registerStoreDetailsReadRoutes(app, { isAuthenticatedCustom: deps.isAuthenticatedCustom });
  registerStoreDetailsUpdateRoutes(app, { isAuthenticatedCustom: deps.isAuthenticatedCustom });
  registerStoreLifecycleRoutes(app, { isAdmin: deps.isAdmin, isAuthenticatedCustom: deps.isAuthenticatedCustom });
  registerStoreDiscoveryRoutes(app, {
    isAuthenticatedCustom: deps.isAuthenticatedCustom,
    clearUserCache: deps.clearUserCache,
  });
  registerStoreByLinkRoutes(app, { isAuthenticatedCustom: deps.isAuthenticatedCustom });
  registerStoreAssignmentAdminRoutes(app, {
    isAdmin: deps.isAdmin,
    isAuthenticatedCustom: deps.isAuthenticatedCustom,
    clearUserCache: deps.clearUserCache,
  });
  registerStoreParseMatchRoutes(app, { isAuthenticatedCustom: deps.isAuthenticatedCustom });
  registerStoreManualMatchingRoutes(app, { isAuthenticatedCustom: deps.isAuthenticatedCustom });
  registerNonDuplicatesRoutes(app, { isAuthenticatedCustom: deps.isAuthenticatedCustom });
  registerStoreGoogleSearchRoutes(app, { isAuthenticatedCustom: deps.isAuthenticatedCustom });
  registerMapSearchPreferenceRoutes(app, { isAuthenticatedCustom: deps.isAuthenticatedCustom });
  registerMapSearchCoreRoutes(app, { isAuthenticatedCustom: deps.isAuthenticatedCustom });
  registerMapSearchSaveActionsRoutes(app, { isAuthenticatedCustom: deps.isAuthenticatedCustom });
  registerMapSearchClientPinsRoutes(app, {
    isAuthenticatedCustom: deps.isAuthenticatedCustom,
    geocodeAddress: deps.geocodeAddress,
    primeGeocodeCache: (address, coords) => deps.memoryGeocodeCache.set(address, coords),
  });
}

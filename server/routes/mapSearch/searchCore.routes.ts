import type { Express } from "express";
import type { MapSearchCoreDeps as Deps } from "./searchCore.types";
import { registerMapSearchSearchRoute } from "./mapSearchSearch.routes";
import { registerMapSearchGridSearchRoute } from "./mapSearchGridSearch.routes";
import { registerMapSearchPlaceDetailsRoute } from "./mapSearchPlaceDetails.routes";
import { registerMapSearchReverseGeocodeRoute } from "./mapSearchReverseGeocode.routes";
import { registerMapSearchCheckDuplicatesRoute } from "./mapSearchCheckDuplicates.routes";

export function registerMapSearchCoreRoutes(app: Express, deps: Deps): void {
  registerMapSearchSearchRoute(app, deps);
  registerMapSearchGridSearchRoute(app, deps);
  registerMapSearchPlaceDetailsRoute(app, deps);
  registerMapSearchReverseGeocodeRoute(app, deps);
  registerMapSearchCheckDuplicatesRoute(app, deps);
}

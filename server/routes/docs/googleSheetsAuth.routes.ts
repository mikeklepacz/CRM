import type { Express } from "express";
import type { GoogleSheetsAuthDeps as Deps } from "./googleSheetsAuth.types";
import { registerGoogleSheetsSettingsGetRoute } from "./googleSheetsSettingsGet.routes";
import { registerGoogleSheetsSettingsPutRoute } from "./googleSheetsSettingsPut.routes";
import { registerGoogleSheetsOauthUrlRoute } from "./googleSheetsOauthUrl.routes";
import { registerGoogleSheetsCallbackRoute } from "./googleSheetsCallback.routes";
import { registerGoogleSheetsDisconnectRoute } from "./googleSheetsDisconnect.routes";

export function registerGoogleSheetsAuthRoutes(app: Express, deps: Deps): void {
  registerGoogleSheetsSettingsGetRoute(app, deps);
  registerGoogleSheetsSettingsPutRoute(app, deps);
  registerGoogleSheetsOauthUrlRoute(app, deps);
  registerGoogleSheetsCallbackRoute(app, deps);
  registerGoogleSheetsDisconnectRoute(app, deps);
}

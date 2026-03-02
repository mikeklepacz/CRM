import type { Express } from "express";
import type { OpenaiSettingsDeps as Deps } from "./openaiSettings.types";
import { registerOpenaiSettingsGetRoute } from "./openaiSettingsGet.routes";
import { registerOpenaiSettingsPostRoute } from "./openaiSettingsPost.routes";

export function registerOpenaiSettingsRoutes(app: Express, deps: Deps): void {
  registerOpenaiSettingsGetRoute(app, deps);
  registerOpenaiSettingsPostRoute(app, deps);
}

import type { Express } from "express";
import type { EhubBlacklistDeps as Deps } from "./ehubBlacklist.types";
import { registerEhubBlacklistListRoute } from "./ehubBlacklistList.routes";
import { registerEhubBlacklistCreateRoute } from "./ehubBlacklistCreate.routes";
import { registerEhubBlacklistDeleteRoute } from "./ehubBlacklistDelete.routes";

export function registerEhubBlacklistRoutes(app: Express, deps: Deps): void {
  registerEhubBlacklistListRoute(app, deps);
  registerEhubBlacklistCreateRoute(app, deps);
  registerEhubBlacklistDeleteRoute(app, deps);
}

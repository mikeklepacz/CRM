import type { Express } from "express";
import { registerCreateParentDbaRoute } from "./registerCreateParentDbaRoute";
import { registerGetDbaChildrenRoute } from "./registerGetDbaChildrenRoute";
import { registerLinkChildrenDbaRoute } from "./registerLinkChildrenDbaRoute";
import { registerSetHeadOfficeDbaRoute } from "./registerSetHeadOfficeDbaRoute";
import { registerUnlinkChildrenDbaRoute } from "./registerUnlinkChildrenDbaRoute";

export function registerDbaRoutes(
  app: Express,
  storage: any,
  googleSheets: any,
  isAuthenticatedCustom: any,
  clearUserCache: (userId: string) => void,
) {
  const deps = { app, storage, googleSheets, isAuthenticatedCustom, clearUserCache };

  registerCreateParentDbaRoute(deps);
  registerLinkChildrenDbaRoute(deps);
  registerUnlinkChildrenDbaRoute(deps);
  registerSetHeadOfficeDbaRoute(deps);
  registerGetDbaChildrenRoute(deps);
}

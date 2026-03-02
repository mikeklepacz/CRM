import type { Express } from "express";
import { registerCsvUploadRoutes } from "../organization/csvUpload.routes";
import { registerSheetsCatalogRoutes } from "../sheets/sheetsCatalog.routes";
import { registerSheetsSyncRoutes } from "../sheets/sheetsSync.routes";
import { registerSheetsCellUpdateRoutes } from "../sheets/sheetsCellUpdate.routes";
import { registerSheetsTrackerUpsertRoutes } from "../sheets/sheetsTrackerUpsert.routes";
import { registerSheetsTrackerUnclaimRoutes } from "../sheets/sheetsTrackerUnclaim.routes";
import { registerSheetsAutoClaimRoutes } from "../sheets/sheetsAutoClaim.routes";
import { registerSheetsClaimStoreRoutes } from "../sheets/sheetsClaimStore.routes";
import { registerSheetsContactActionRoutes } from "../sheets/sheetsContactAction.routes";
import type { OrganizationModuleDeps } from "./organizationModule.types";

export function registerOrganizationModuleSheetsRoutes(app: Express, deps: OrganizationModuleDeps): void {
  registerCsvUploadRoutes(app, { isAdmin: deps.isAdmin, isAuthenticatedCustom: deps.isAuthenticatedCustom });

  registerSheetsCatalogRoutes(app, {
    isAdmin: deps.isAdmin,
    isAuthenticatedCustom: deps.isAuthenticatedCustom,
    clearUserCache: deps.clearUserCache,
  });
  registerSheetsSyncRoutes(app, { isAdmin: deps.isAdmin, isAuthenticatedCustom: deps.isAuthenticatedCustom });
  registerSheetsCellUpdateRoutes(app, {
    isAuthenticatedCustom: deps.isAuthenticatedCustom,
    clearUserCache: deps.clearUserCache,
  });
  registerSheetsTrackerUpsertRoutes(app, {
    isAuthenticatedCustom: deps.isAuthenticatedCustom,
    clearUserCache: deps.clearUserCache,
  });
  registerSheetsTrackerUnclaimRoutes(app, {
    isAuthenticatedCustom: deps.isAuthenticatedCustom,
    clearUserCache: deps.clearUserCache,
  });
  registerSheetsAutoClaimRoutes(app, {
    isAuthenticatedCustom: deps.isAuthenticatedCustom,
    clearUserCache: deps.clearUserCache,
  });
  registerSheetsClaimStoreRoutes(app, {
    isAuthenticatedCustom: deps.isAuthenticatedCustom,
    clearUserCache: deps.clearUserCache,
  });
  registerSheetsContactActionRoutes(app, {
    isAuthenticatedCustom: deps.isAuthenticatedCustom,
    clearUserCache: deps.clearUserCache,
  });
}

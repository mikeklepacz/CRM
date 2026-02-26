import type { Express } from "express";
import { registerCsvUploadRoutes } from "../organization/csvUpload.routes";
import { registerOrganizationSheetsMergedDataLegacyRoutes } from "../organization/sheetsMergedDataLegacy.routes";
import { createSheetsMergedDataHandler } from "../../services/organization/sheetsMergedData.handler";
import { registerSheetsCatalogRoutes } from "../sheets/sheetsCatalog.routes";
import { registerSheetsSyncRoutes } from "../sheets/sheetsSync.routes";
import { registerSheetsCellUpdateRoutes } from "../sheets/sheetsCellUpdate.routes";
import { registerSheetsTrackerUpsertRoutes } from "../sheets/sheetsTrackerUpsert.routes";
import { registerSheetsTrackerUnclaimRoutes } from "../sheets/sheetsTrackerUnclaim.routes";
import { registerSheetsAutoClaimRoutes } from "../sheets/sheetsAutoClaim.routes";
import { registerSheetsClaimStoreRoutes } from "../sheets/sheetsClaimStore.routes";
import { registerSheetsContactActionRoutes } from "../sheets/sheetsContactAction.routes";

type Deps = {
  and: any;
  categories: any;
  checkAdminAccess: any;
  clearUserCache: any;
  db: any;
  eq: any;
  generateCacheKey: any;
  getCachedData: any;
  googleSheets: any;
  isAdmin: any;
  isAuthenticatedCustom: any;
  isNull: any;
  normalizeLink: any;
  or: any;
  setCachedData: any;
  storage: any;
};

export function registerOrganizationModuleRoutes(app: Express, deps: Deps): void {
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
  registerSheetsTrackerUnclaimRoutes(app, { isAuthenticatedCustom: deps.isAuthenticatedCustom });
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

  const handleSheetsMergedData = createSheetsMergedDataHandler({
    and: deps.and,
    categories: deps.categories,
    checkAdminAccess: deps.checkAdminAccess,
    db: deps.db,
    eq: deps.eq,
    generateCacheKey: deps.generateCacheKey,
    getCachedData: deps.getCachedData,
    googleSheets: deps.googleSheets,
    isNull: deps.isNull,
    normalizeLink: deps.normalizeLink,
    or: deps.or,
    setCachedData: deps.setCachedData,
    storage: deps.storage,
  });

  registerOrganizationSheetsMergedDataLegacyRoutes(app, {
    isAuthenticatedCustom: deps.isAuthenticatedCustom,
    handleSheetsMergedData,
  });
}

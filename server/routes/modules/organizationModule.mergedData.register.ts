import type { Express } from "express";
import { registerOrganizationSheetsMergedDataLegacyRoutes } from "../organization/sheetsMergedDataLegacy.routes";
import { createSheetsMergedDataHandler } from "../../services/organization/sheetsMergedData.handler";
import type { OrganizationModuleDeps } from "./organizationModule.types";

export function registerOrganizationModuleMergedDataRoutes(app: Express, deps: OrganizationModuleDeps): void {
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

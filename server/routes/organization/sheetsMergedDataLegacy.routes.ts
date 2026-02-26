import type { Express } from "express";

type Deps = {
  isAuthenticatedCustom: any;
  handleSheetsMergedData: any;
};

export function registerOrganizationSheetsMergedDataLegacyRoutes(app: Express, deps: Deps): void {
  app.post("/api/sheets/merged-data", deps.isAuthenticatedCustom, deps.handleSheetsMergedData);
}

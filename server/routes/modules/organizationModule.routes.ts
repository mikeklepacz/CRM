import type { Express } from "express";
import type { OrganizationModuleDeps as Deps } from "./organizationModule.types";
import { registerOrganizationModuleSheetsRoutes } from "./organizationModule.sheets.register";
import { registerOrganizationModuleMergedDataRoutes } from "./organizationModule.mergedData.register";

export function registerOrganizationModuleRoutes(app: Express, deps: Deps): void {
  registerOrganizationModuleSheetsRoutes(app, deps);
  registerOrganizationModuleMergedDataRoutes(app, deps);
}

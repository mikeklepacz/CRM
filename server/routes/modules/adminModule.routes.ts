import type { Express } from "express";
import type { AdminModuleDeps as Deps } from "./adminModule.types";
import { registerAdminModuleRoutesImpl } from "./adminModule.register";

export function registerAdminModuleRoutes(app: Express, deps: Deps): void {
  registerAdminModuleRoutesImpl(app, deps);
}

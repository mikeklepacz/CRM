import type { Express } from "express";
import type { CallManagerModuleDeps as Deps } from "./callManagerModule.types";
import { registerCallManagerModuleRoutesImpl } from "./callManagerModule.register";

export function registerCallManagerModuleRoutes(app: Express, deps: Deps): void {
  registerCallManagerModuleRoutesImpl(app, deps);
}

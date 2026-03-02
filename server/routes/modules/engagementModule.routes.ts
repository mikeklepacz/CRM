import type { Express } from "express";
import type { EngagementModuleDeps as Deps } from "./engagementModule.types";
import { registerEngagementModuleRoutesImpl } from "./engagementModule.register";

export function registerEngagementModuleRoutes(app: Express, deps: Deps): void {
  registerEngagementModuleRoutesImpl(app, deps);
}

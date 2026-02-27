import type { Express } from "express";
import type { AssistantModuleDeps as Deps } from "./assistantModule.types";
import { registerAssistantModuleRoutesImpl } from "./assistantModule.register";

export function registerAssistantModuleRoutes(app: Express, deps: Deps): void {
  registerAssistantModuleRoutesImpl(app, deps);
}

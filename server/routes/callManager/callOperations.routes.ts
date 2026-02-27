import type { Express } from "express";
import type { CallOperationsDeps as Deps } from "./callOperations.types";
import { registerCallDeleteRoute } from "./callDelete.routes";
import { registerCallTranscriptGetRoute } from "./callTranscriptGet.routes";
import { registerCallAnalyzeRoute } from "./callAnalyze.routes";

export function registerCallManagerOperationsRoutes(
  app: Express,
  deps: Deps
): void {
  registerCallDeleteRoute(app, deps);
  registerCallTranscriptGetRoute(app, deps);
  registerCallAnalyzeRoute(app, deps);
}

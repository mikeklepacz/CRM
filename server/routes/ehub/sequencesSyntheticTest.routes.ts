import type { Express } from "express";
import { buildSequencesSyntheticTestHandler } from "./sequencesSyntheticTest.handler";

export function registerEhubSequencesSyntheticTestRoutes(
  app: Express,
  deps: { isAdmin: any; isAuthenticatedCustom: any }
): void {
  app.post(
    "/api/ehub/sequences/:id/synthetic-test",
    deps.isAuthenticatedCustom,
    deps.isAdmin,
    buildSequencesSyntheticTestHandler(),
  );
}

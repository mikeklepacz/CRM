import type { Express } from "express";
import type { CallOperationsDeps } from "./callOperations.types";
import { handleCallDelete } from "./callDelete.handler";

export function registerCallDeleteRoute(app: Express, deps: CallOperationsDeps): void {
  app.delete("/api/elevenlabs/calls/:id", deps.isAuthenticatedCustom, async (req: any, res) => {
    await handleCallDelete(req, res, deps);
  });
}

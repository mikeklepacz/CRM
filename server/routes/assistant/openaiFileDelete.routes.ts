import type { Express } from "express";
import type { OpenaiFilesMutationsDeps } from "./openaiFilesMutations.types";
import { handleOpenaiFileDelete } from "./openaiFileDelete.handler";

export function registerOpenaiFileDeleteRoute(app: Express, deps: OpenaiFilesMutationsDeps): void {
  app.delete("/api/openai/files/:id", deps.isAuthenticated, async (req: any, res) => {
    await handleOpenaiFileDelete(req, res, deps);
  });
}

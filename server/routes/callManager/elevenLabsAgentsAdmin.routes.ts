import type { Express } from "express";
import type { ElevenLabsAgentsAdminDeps as Deps } from "./elevenLabsAgentsAdmin.types";
import { registerElevenLabsAgentsCreateRoute } from "./elevenLabsAgentsCreate.routes";
import { registerElevenLabsAgentsUpdateRoute } from "./elevenLabsAgentsUpdate.routes";
import { registerElevenLabsAgentsDeleteRoute } from "./elevenLabsAgentsDelete.routes";
import { registerElevenLabsAgentsSetDefaultRoute } from "./elevenLabsAgentsSetDefault.routes";
import { registerElevenLabsAgentDetailsRoute } from "./elevenLabsAgentDetails.routes";
import { registerElevenLabsAgentPromptRoute } from "./elevenLabsAgentPrompt.routes";

export function registerCallManagerElevenLabsAgentsAdminRoutes(
  app: Express,
  deps: Deps
): void {
  registerElevenLabsAgentsCreateRoute(app, deps);
  registerElevenLabsAgentsUpdateRoute(app, deps);
  registerElevenLabsAgentsDeleteRoute(app, deps);
  registerElevenLabsAgentsSetDefaultRoute(app, deps);
  registerElevenLabsAgentDetailsRoute(app, deps);
  registerElevenLabsAgentPromptRoute(app, deps);
}

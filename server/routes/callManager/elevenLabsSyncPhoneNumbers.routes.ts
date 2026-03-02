import type { Express } from "express";
import type { ElevenLabsAgentsSyncDeps } from "./elevenLabsAgentsSync.types";
import { handleElevenLabsSyncPhoneNumbers } from "./elevenLabsSyncPhoneNumbers.handler";

export function registerElevenLabsSyncPhoneNumbersRoute(app: Express, deps: ElevenLabsAgentsSyncDeps): void {
  app.post("/api/elevenlabs/sync-phone-numbers", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    await handleElevenLabsSyncPhoneNumbers(req, res);
  });
}

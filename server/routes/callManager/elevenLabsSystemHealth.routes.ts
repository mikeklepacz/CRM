import type { Express } from "express";
import { handleElevenLabsSystemHealth } from "./elevenLabsSystemHealth.handler";

export function registerCallManagerElevenLabsSystemHealthRoutes(
  app: Express,
  deps: {
    isAuthenticatedCustom: any;
    checkFlyVoiceProxyHealth: () => Promise<{ healthy: boolean; details?: any }>;
  }
): void {
  app.get("/api/elevenlabs/system-health", deps.isAuthenticatedCustom, async (req: any, res) => {
    await handleElevenLabsSystemHealth(req, res, deps);
  });
}

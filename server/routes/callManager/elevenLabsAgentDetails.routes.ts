import type { Express } from "express";
import axios from "axios";
import { storage } from "../../storage";
import type { ElevenLabsAgentsAdminDeps } from "./elevenLabsAgentsAdmin.types";

export function registerElevenLabsAgentDetailsRoute(app: Express, deps: ElevenLabsAgentsAdminDeps): void {
  app.get("/api/elevenlabs/agents/:agentId/details", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const { agentId } = req.params;
      const config = await storage.getElevenLabsConfig(req.user.tenantId);

      if (!config?.apiKey) {
        return res.status(400).json({ error: "ElevenLabs API key not configured" });
      }

      const response = await axios.get(`https://api.elevenlabs.io/v1/convai/agents/${agentId}`, {
        headers: { "xi-api-key": config.apiKey },
      });

      const data = response.data;
      let systemPrompt =
        data.prompt ||
        data.system_prompt ||
        data.conversation_config?.agent?.prompt ||
        data.conversation_config?.prompt ||
        data.platform_settings?.prompt ||
        "";

      if (typeof systemPrompt === "object" && systemPrompt !== null) {
        systemPrompt = systemPrompt.prompt || JSON.stringify(systemPrompt);
      }
      systemPrompt = String(systemPrompt || "");

      res.json({ ...data, prompt: systemPrompt });
    } catch (error: any) {
      console.error("[Agent Details] Error fetching agent details:", error);
      res.status(500).json({ error: error.message || "Failed to fetch agent details" });
    }
  });
}

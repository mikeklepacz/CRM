import type { Express } from "express";
import axios from "axios";
import { storage } from "../../storage";
import type { ElevenLabsAgentsAdminDeps } from "./elevenLabsAgentsAdmin.types";

export function registerElevenLabsAgentPromptRoute(app: Express, deps: ElevenLabsAgentsAdminDeps): void {
  app.patch("/api/elevenlabs/agents/:agentId/prompt", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const { agentId } = req.params;
      const { prompt } = req.body;
      if (!prompt) {
        return res.status(400).json({ error: "Prompt is required" });
      }

      const config = await storage.getElevenLabsConfig(req.user.tenantId);
      if (!config?.apiKey) {
        return res.status(400).json({ error: "ElevenLabs API key not configured" });
      }

      const response = await axios.patch(
        `https://api.elevenlabs.io/v1/convai/agents/${agentId}`,
        {
          conversation_config: {
            agent: {
              prompt: { prompt },
            },
          },
        },
        {
          headers: {
            "xi-api-key": config.apiKey,
            "Content-Type": "application/json",
          },
        }
      );

      res.json(response.data);
    } catch (error: any) {
      console.error("[Agent Prompt] Error updating agent prompt:", error.response?.data || error.message);
      res.status(500).json({ error: error.response?.data?.detail?.message || error.message || "Failed to update agent prompt" });
    }
  });
}

import type { Express } from "express";
import axios from "axios";
import { elevenLabsAgentSchema } from "../../services/callManager/elevenLabsSchemas";
import { storage } from "../../storage";

export function registerCallManagerElevenLabsAgentsAdminRoutes(
  app: Express,
  deps: {
    isAdmin: any;
    isAuthenticatedCustom: any;
    syncAgentSettingsFromElevenLabs: (agentId: string, elevenLabsAgentId: string, tenantId: string, storageInstance: typeof storage) => Promise<void>;
  }
): void {
  app.post("/api/elevenlabs/agents", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const validation = elevenLabsAgentSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: validation.error.errors[0].message });
      }

      const agentData = {
        ...validation.data,
        tenantId: req.user.tenantId,
        projectId: validation.data.projectId || null,
      };
      const agent = await storage.createElevenLabsAgent(agentData);

      deps
        .syncAgentSettingsFromElevenLabs(agent.id, agent.agentId, req.user.tenantId, storage)
        .catch((err) => console.error("[Agent Auto-Sync] Background sync failed:", err.message));

      res.json(agent);
    } catch (error: any) {
      console.error("Error creating ElevenLabs agent:", error);
      res.status(500).json({ message: error.message || "Failed to create agent" });
    }
  });

  app.put("/api/elevenlabs/agents/:id", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const validation = elevenLabsAgentSchema.partial().safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: validation.error.errors[0].message });
      }

      const agent = await storage.updateElevenLabsAgent(req.params.id, req.user.tenantId, validation.data);
      res.json(agent);
    } catch (error: any) {
      console.error("Error updating ElevenLabs agent:", error);
      res.status(500).json({ message: error.message || "Failed to update agent" });
    }
  });

  app.delete("/api/elevenlabs/agents/:id", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      await storage.deleteElevenLabsAgent(req.params.id, req.user.tenantId);
      res.json({ message: "Agent deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting ElevenLabs agent:", error);
      res.status(500).json({ message: error.message || "Failed to delete agent" });
    }
  });

  app.put("/api/elevenlabs/agents/:id/set-default", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      await storage.setDefaultElevenLabsAgent(req.params.id, req.user.tenantId);
      res.json({ message: "Default agent set successfully" });
    } catch (error: any) {
      console.error("Error setting default agent:", error);
      res.status(500).json({ message: error.message || "Failed to set default agent" });
    }
  });

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

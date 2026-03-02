import type { Express } from "express";
import { elevenLabsAgentSchema } from "../../services/callManager/elevenLabsSchemas";
import { storage } from "../../storage";
import type { ElevenLabsAgentsAdminDeps } from "./elevenLabsAgentsAdmin.types";

export function registerElevenLabsAgentsCreateRoute(app: Express, deps: ElevenLabsAgentsAdminDeps): void {
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
}

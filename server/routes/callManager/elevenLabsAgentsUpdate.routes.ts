import type { Express } from "express";
import { elevenLabsAgentSchema } from "../../services/callManager/elevenLabsSchemas";
import { storage } from "../../storage";
import type { ElevenLabsAgentsAdminDeps } from "./elevenLabsAgentsAdmin.types";

export function registerElevenLabsAgentsUpdateRoute(app: Express, deps: ElevenLabsAgentsAdminDeps): void {
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
}

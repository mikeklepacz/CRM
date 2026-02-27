import type { Express } from "express";
import { storage } from "../../storage";
import type { SequencesStrategyChatDeps } from "./sequencesStrategyChat.types";

export function registerSequencesStrategyChatGetRoute(app: Express, deps: SequencesStrategyChatDeps): void {
  app.get("/api/sequences/:id/strategy-chat", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const sequence = await storage.getSequence(req.params.id, req.user.tenantId);
      if (!sequence) {
        return res.status(404).json({ message: "Sequence not found" });
      }

      const transcript = sequence.strategyTranscript || { messages: [], lastUpdatedAt: new Date().toISOString() };
      res.json(transcript);
    } catch (error: any) {
      console.error("Error getting strategy chat:", error);
      res.status(500).json({ message: error.message || "Failed to get strategy chat" });
    }
  });
}

import type { Express } from "express";
import { z } from "zod";
import { storage } from "../../storage";
import type { SequencesStrategyFinalizeDeps } from "./sequencesStrategyFinalize.types";

export function registerSequencesStrategyFinalizePatchRoute(app: Express, deps: SequencesStrategyFinalizeDeps): void {
  app.patch("/api/sequences/:id/finalized-strategy", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;

      const { finalizedStrategy } = z.object({
        finalizedStrategy: z.string().min(1, "Finalized strategy cannot be empty"),
      }).parse(req.body);

      const sequence = await storage.getSequence(id, req.user.tenantId);
      if (!sequence) {
        return res.status(404).json({ message: "Sequence not found" });
      }

      const updated = await storage.updateSequence(id, req.user.tenantId, { finalizedStrategy });
      res.json({ sequence: updated });
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid finalized strategy", errors: error.errors });
      }
      console.error("Error saving finalized strategy:", error);
      res.status(500).json({ message: error.message || "Failed to save finalized strategy" });
    }
  });
}

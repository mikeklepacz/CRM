import type { Express } from "express";
import { storage } from "../../storage";
import type { SequencesConfigDeps } from "./sequencesConfig.types";

export function registerSequencesStepsGetRoute(app: Express, deps: SequencesConfigDeps): void {
  app.get("/api/sequences/:id/steps", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;

      const sequence = await storage.getSequence(id, req.user.tenantId);
      if (!sequence) {
        return res.status(404).json({ message: "Sequence not found" });
      }

      const steps = await storage.getSequenceSteps(id);
      res.json(steps);
    } catch (error: any) {
      console.error("Error fetching sequence steps:", error);
      res.status(500).json({ message: error.message || "Failed to fetch sequence steps" });
    }
  });
}

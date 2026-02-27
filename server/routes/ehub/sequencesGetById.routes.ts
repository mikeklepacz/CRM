import type { Express } from "express";
import { storage } from "../../storage";
import type { SequencesCoreDeps } from "./sequencesCore.types";

export function registerSequencesGetByIdRoute(app: Express, deps: SequencesCoreDeps): void {
  app.get("/api/sequences/:id", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const sequence = await storage.getSequence(req.params.id, req.user.tenantId);
      if (!sequence) {
        return res.status(404).json({ message: "Sequence not found" });
      }
      res.json(sequence);
    } catch (error: any) {
      console.error("Error getting sequence:", error);
      res.status(500).json({ message: error.message || "Failed to get sequence" });
    }
  });
}

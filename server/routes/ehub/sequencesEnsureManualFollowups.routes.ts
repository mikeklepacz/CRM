import type { Express } from "express";
import { storage } from "../../storage";
import type { SequencesCoreDeps } from "./sequencesCore.types";

export function registerSequencesEnsureManualFollowupsRoute(app: Express, deps: SequencesCoreDeps): void {
  app.post("/api/sequences/ensure-manual-followups", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const sequence = await storage.getOrCreateManualFollowUpsSequence(req.user.tenantId);
      res.json({
        success: true,
        sequence,
        message: "Manual Follow-Ups sequence is ready"
      });
    } catch (error: any) {
      console.error("Error ensuring Manual Follow-Ups sequence:", error);
      res.status(500).json({ message: error.message || "Failed to ensure Manual Follow-Ups sequence" });
    }
  });
}

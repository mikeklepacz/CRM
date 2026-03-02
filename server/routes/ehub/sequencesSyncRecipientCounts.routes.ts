import type { Express } from "express";
import { storage } from "../../storage";
import type { SequencesCoreDeps } from "./sequencesCore.types";

export function registerSequencesSyncRecipientCountsRoute(app: Express, deps: SequencesCoreDeps): void {
  app.post("/api/sequences/sync-recipient-counts", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const result = await storage.syncSequenceRecipientCounts(req.user.tenantId);
      res.json(result);
    } catch (error: any) {
      console.error("Error syncing recipient counts:", error);
      res.status(500).json({ message: error.message || "Failed to sync recipient counts" });
    }
  });
}

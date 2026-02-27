import type { Express } from "express";
import { syncAlignerKbFiles } from "../../services/assistant/alignerFiles/syncService";
import type { AlignerFilesDeps } from "./alignerFiles.types";

export function registerAlignerSyncKbRoute(app: Express, deps: AlignerFilesDeps): void {
  app.post("/api/aligner/sync-kb", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const tenantId = await deps.getEffectiveTenantId(req);
      const summary = await syncAlignerKbFiles({ tenantId });
      res.json(summary);
    } catch (error: any) {
      console.error("[Aligner Sync] Error syncing KB files:", error);
      res.status(500).json({ error: error.message || "Failed to sync KB files" });
    }
  });
}

import type { Express } from "express";
import { storage } from "../../storage";
import type { KbManagementDeps } from "./kbManagement.types";

export function registerKbProposalsDeleteAllRoute(app: Express, deps: KbManagementDeps): void {
  app.delete("/api/kb/proposals", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const deletedCount = await storage.deleteAllKbProposals(req.user.tenantId);
      console.log(`[KB] Deleted ${deletedCount} proposals`);
      res.json({ deletedCount });
    } catch (error: any) {
      console.error("[KB] Error deleting proposals:", error);
      res.status(500).json({ error: error.message || "Failed to delete proposals" });
    }
  });
}

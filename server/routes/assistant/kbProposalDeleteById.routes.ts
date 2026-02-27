import type { Express } from "express";
import { storage } from "../../storage";
import type { KbManagementDeps } from "./kbManagement.types";

export function registerKbProposalDeleteByIdRoute(app: Express, deps: KbManagementDeps): void {
  app.delete("/api/kb/proposals/:id", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const deleted = await storage.deleteKbProposal(req.params.id, req.user.tenantId);
      if (!deleted) {
        return res.status(404).json({ error: "Proposal not found" });
      }
      console.log(`[KB] Deleted proposal ${req.params.id}`);
      res.json({ success: true });
    } catch (error: any) {
      console.error("[KB] Error deleting proposal:", error);
      res.status(500).json({ error: error.message || "Failed to delete proposal" });
    }
  });
}

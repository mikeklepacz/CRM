import type { Express } from "express";
import { storage } from "../../storage";

type Deps = {
  isAuthenticatedCustom: any;
  isAdmin: any;
};

export function registerKbProposalMutationsRoutes(app: Express, deps: Deps): void {
  app.patch("/api/kb/proposals/:id", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const { proposedContent } = req.body;
      if (!proposedContent) {
        return res.status(400).json({ error: "proposedContent is required" });
      }

      const proposal = await storage.getKbProposalById(req.params.id, req.user.tenantId);
      if (!proposal) {
        return res.status(404).json({ error: "Proposal not found" });
      }
      if (proposal.status !== "pending") {
        return res.status(400).json({ error: "Can only edit pending proposals" });
      }

      await storage.updateKbProposal(req.params.id, req.user.tenantId, {
        proposedContent,
        humanEdited: true,
      });

      res.json({ success: true });
    } catch (error: any) {
      console.error("[KB] Error editing proposal:", error);
      res.status(500).json({ error: error.message || "Failed to edit proposal" });
    }
  });

  app.post("/api/kb/proposals/:id/reject", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const proposal = await storage.getKbProposalById(req.params.id, req.user.tenantId);
      if (!proposal) {
        return res.status(404).json({ error: "Proposal not found" });
      }
      if (proposal.status !== "pending") {
        return res.status(400).json({ error: "Can only reject pending proposals" });
      }

      await storage.updateKbProposal(req.params.id, req.user.tenantId, {
        status: "rejected",
        reviewedAt: new Date(),
        reviewedBy: userId,
      });

      res.json({ success: true });
    } catch (error: any) {
      console.error("[KB] Error rejecting proposal:", error);
      res.status(500).json({ error: error.message || "Failed to reject proposal" });
    }
  });
}

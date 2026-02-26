import type { Express } from "express";
import { approveKbProposal } from "../../services/assistant/kbProposalApprovalService";

type Deps = {
  isAuthenticatedCustom: any;
  isAdmin: any;
  syncKbDocumentToElevenLabs: (
    apiKey: string,
    oldDocId: string,
    filename: string,
    content: string,
    tenantId: string
  ) => Promise<{ success: boolean; newDocId?: string; agentsUpdated?: number; error?: string }>;
  syncKbFileToAlignerVectorStore: (
    kbFileId: string,
    content: string,
    filename: string,
    tenantId: string
  ) => Promise<{ success: boolean; error?: string }>;
};

export function registerKbProposalApprovalRoutes(app: Express, deps: Deps): void {
  app.post("/api/kb/proposals/:id/approve", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const result = await approveKbProposal({
        proposalId: req.params.id,
        tenantId: req.user.tenantId,
        userId,
        syncKbDocumentToElevenLabs: deps.syncKbDocumentToElevenLabs,
        syncKbFileToAlignerVectorStore: deps.syncKbFileToAlignerVectorStore,
      });

      if ("statusCode" in result) {
        return res.status(result.statusCode).json(result.payload);
      }

      res.json(result);
    } catch (error: any) {
      console.error("[KB] Error approving proposal:", error);
      res.status(500).json({ error: error.message || "Failed to approve proposal" });
    }
  });
}

import type { Express } from "express";
import { storage } from "../../storage";
import type { KbManagementDeps } from "./kbManagement.types";

export function registerKbProposalsListRoute(app: Express, deps: KbManagementDeps): void {
  app.get("/api/kb/proposals", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const { status, fileId } = req.query;
      const proposals = await storage.getKbProposals(req.user.tenantId, {
        status: status as string,
        kbFileId: fileId as string,
      });
      res.json({ proposals });
    } catch (error: any) {
      console.error("[KB] Error fetching proposals:", error);
      res.status(500).json({ error: error.message || "Failed to fetch proposals" });
    }
  });
}

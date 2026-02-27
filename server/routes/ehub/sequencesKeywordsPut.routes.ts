import type { Express } from "express";
import { z } from "zod";
import { storage } from "../../storage";
import type { SequencesConfigDeps } from "./sequencesConfig.types";

export function registerSequencesKeywordsPutRoute(app: Express, deps: SequencesConfigDeps): void {
  app.put("/api/sequences/:id/keywords", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;

      const { keywords } = z.object({
        keywords: z.string().optional().default(""),
      }).parse(req.body);

      const sequence = await storage.getSequence(id, req.user.tenantId);
      if (!sequence) {
        return res.status(404).json({ message: "Sequence not found" });
      }

      const updated = await storage.updateSequence(id, req.user.tenantId, { keywords });
      res.json(updated);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid keywords", errors: error.errors });
      }
      console.error("Error updating keywords:", error);
      res.status(500).json({ message: error.message || "Failed to update keywords" });
    }
  });
}

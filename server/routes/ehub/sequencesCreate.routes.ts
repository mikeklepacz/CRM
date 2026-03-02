import type { Express } from "express";
import { insertSequenceSchema } from "@shared/schema";
import { storage } from "../../storage";
import { assertTenantProjectScope } from "../../services/projectScopeValidation";
import type { SequencesCoreDeps } from "./sequencesCore.types";

export function registerSequencesCreateRoute(app: Express, deps: SequencesCoreDeps): void {
  app.post("/api/sequences", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      await assertTenantProjectScope(req.user.tenantId, req.body?.projectId);

      const sequenceData = insertSequenceSchema.parse({
        ...req.body,
        tenantId: req.user.tenantId,
        createdBy: userId,
        status: "paused",
      });

      const sequence = await storage.createSequence(sequenceData);
      res.json(sequence);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid sequence data", errors: error.errors });
      }
      console.error("Error creating sequence:", error);
      res.status(500).json({ message: error.message || "Failed to create sequence" });
    }
  });
}

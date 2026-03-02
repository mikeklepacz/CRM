import type { Express } from "express";
import { z } from "zod";
import { storage } from "../../storage";
import type { SequencesConfigDeps } from "./sequencesConfig.types";

export function registerSequencesStepPatchRoute(app: Express, deps: SequencesConfigDeps): void {
  app.patch("/api/sequences/:sequenceId/steps/:stepId", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const { sequenceId, stepId } = req.params;

      const sequence = await storage.getSequence(sequenceId, req.user.tenantId);
      if (!sequence) {
        return res.status(404).json({ message: "Sequence not found" });
      }

      const { subjectTemplate, bodyTemplate, aiGuidance } = z.object({
        subjectTemplate: z.string().nullable().optional(),
        bodyTemplate: z.string().nullable().optional(),
        aiGuidance: z.string().nullable().optional(),
      }).parse(req.body);

      const updatedStep = await storage.updateSequenceStep(stepId, {
        subjectTemplate: subjectTemplate ?? undefined,
        bodyTemplate: bodyTemplate ?? undefined,
        aiGuidance: aiGuidance ?? undefined,
      });

      res.json(updatedStep);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid step data", errors: error.errors });
      }
      console.error("Error updating sequence step:", error);
      res.status(500).json({ message: error.message || "Failed to update sequence step" });
    }
  });
}

import type { Express } from "express";
import { z } from "zod";
import { storage } from "../../storage";

export function registerEhubSequencesConfigRoutes(
  app: Express,
  deps: { isAdmin: any; isAuthenticatedCustom: any }
): void {
  app.put("/api/sequences/:id/step-delays", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;

      const { stepDelays, repeatLastStep } = z.object({
        stepDelays: z.array(z.number().nonnegative()),
        repeatLastStep: z.boolean().optional().default(false),
      }).parse(req.body);

      if (repeatLastStep && stepDelays.length === 0) {
        return res.status(400).json({
          message: "Cannot enable repeat last step without at least one step delay"
        });
      }

      const sequence = await storage.getSequence(id, req.user.tenantId);
      if (!sequence) {
        return res.status(404).json({ message: "Sequence not found" });
      }

      await storage.updateSequence(id, req.user.tenantId, { repeatLastStep });
      const createdSteps = await storage.replaceSequenceSteps(id, stepDelays, req.user.tenantId);
      const updatedSequence = await storage.getSequence(id, req.user.tenantId);

      console.log("[StepDelays] Step delays updated - Matrix2 slotAssigner will handle rescheduling");

      res.json({
        sequence: updatedSequence,
        steps: createdSteps,
      });
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid step delays", errors: error.errors });
      }
      console.error("Error updating step delays:", error);
      res.status(500).json({ message: error.message || "Failed to update step delays" });
    }
  });

  app.get("/api/sequences/:id/steps", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;

      const sequence = await storage.getSequence(id, req.user.tenantId);
      if (!sequence) {
        return res.status(404).json({ message: "Sequence not found" });
      }

      const steps = await storage.getSequenceSteps(id);
      res.json(steps);
    } catch (error: any) {
      console.error("Error fetching sequence steps:", error);
      res.status(500).json({ message: error.message || "Failed to fetch sequence steps" });
    }
  });

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

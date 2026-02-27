import type { Express } from "express";
import { z } from "zod";
import { storage } from "../../storage";
import type { SequencesConfigDeps } from "./sequencesConfig.types";

export function registerSequencesStepDelaysPutRoute(app: Express, deps: SequencesConfigDeps): void {
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
}

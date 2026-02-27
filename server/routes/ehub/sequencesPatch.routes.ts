import type { Express } from "express";
import { insertSequenceSchema } from "@shared/schema";
import { storage } from "../../storage";
import type { SequencesCoreDeps } from "./sequencesCore.types";

export function registerSequencesPatchRoute(app: Express, deps: SequencesCoreDeps): void {
  app.patch("/api/sequences/:id", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const updates = insertSequenceSchema.partial().parse(req.body);

      const existingSequence = await storage.getSequence(id, req.user.tenantId);
      if (!existingSequence) {
        return res.status(404).json({ message: "Sequence not found" });
      }

      if (updates.status === "active") {
        const finalizedStrategy = (existingSequence as any).finalizedStrategy || (updates as any).finalizedStrategy;
        if (!finalizedStrategy || finalizedStrategy.trim() === "") {
          return res.status(422).json({
            message: "Campaign Brief is required before activation. Complete \"Finalize Strategy\" in the Strategy tab first."
          });
        }
      }

      const oldStatus = existingSequence.status;
      const newStatus = updates.status;

      if (newStatus && newStatus !== oldStatus) {
        const { clearUnsentSlotsForSequence } = await import("../../services/Matrix2/slotDb");

        if (newStatus === "paused") {
          const clearedCount = await clearUnsentSlotsForSequence(id);
          console.log(`[Sequence ${id}] Paused: Cleared ${clearedCount} unsent slots`);
        } else if (newStatus === "active") {
          const clearedCount = await clearUnsentSlotsForSequence(id);
          console.log(`[Sequence ${id}] Activated: Cleared ${clearedCount} stray unsent slots`);

          const { assignRecipientsToSlots } = await import("../../services/Matrix2/slotAssigner");
          await assignRecipientsToSlots();
          console.log(`[Sequence ${id}] Activated: Triggered slot assignment for fresh future slots`);
        }
      }

      const sequence = await storage.updateSequence(id, req.user.tenantId, updates);
      if (!sequence) {
        return res.status(404).json({ message: "Sequence not found" });
      }

      res.json(sequence);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid update data", errors: error.errors });
      }
      console.error("Error updating sequence:", error);
      res.status(500).json({ message: error.message || "Failed to update sequence" });
    }
  });
}

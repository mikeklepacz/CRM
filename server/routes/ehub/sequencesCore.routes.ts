import type { Express } from "express";
import { insertSequenceSchema } from "@shared/schema";
import { storage } from "../../storage";

export function registerEhubSequencesCoreRoutes(
  app: Express,
  deps: { isAdmin: any; isAuthenticatedCustom: any }
): void {
  app.post("/api/sequences/ensure-manual-followups", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const sequence = await storage.getOrCreateManualFollowUpsSequence(req.user.tenantId);
      res.json({
        success: true,
        sequence,
        message: "Manual Follow-Ups sequence is ready"
      });
    } catch (error: any) {
      console.error("Error ensuring Manual Follow-Ups sequence:", error);
      res.status(500).json({ message: error.message || "Failed to ensure Manual Follow-Ups sequence" });
    }
  });

  app.post("/api/sequences", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

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

  app.get("/api/sequences", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const { status, projectId } = req.query;
      const sequences = await storage.listSequences(req.user.tenantId, { status, projectId: projectId as string | undefined });
      res.json(sequences);
    } catch (error: any) {
      console.error("Error listing sequences:", error);
      res.status(500).json({ message: error.message || "Failed to list sequences" });
    }
  });

  app.post("/api/sequences/sync-recipient-counts", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const result = await storage.syncSequenceRecipientCounts(req.user.tenantId);
      res.json(result);
    } catch (error: any) {
      console.error("Error syncing recipient counts:", error);
      res.status(500).json({ message: error.message || "Failed to sync recipient counts" });
    }
  });

  app.get("/api/sequences/:id", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const sequence = await storage.getSequence(req.params.id, req.user.tenantId);
      if (!sequence) {
        return res.status(404).json({ message: "Sequence not found" });
      }
      res.json(sequence);
    } catch (error: any) {
      console.error("Error getting sequence:", error);
      res.status(500).json({ message: error.message || "Failed to get sequence" });
    }
  });

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

  app.delete("/api/sequences/:id", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;

      const sequence = await storage.getSequence(id, req.user.tenantId);
      if (!sequence) {
        return res.status(404).json({ message: "Sequence not found" });
      }

      if (sequence.isSystem) {
        return res.status(403).json({
          message: "Cannot delete system sequence. This sequence is used by automated features and cannot be removed."
        });
      }

      const { clearSlotsForSequence } = await import("../../services/Matrix2/slotDb");
      await clearSlotsForSequence(id);

      const deleted = await storage.deleteSequence(id, req.user.tenantId);
      if (!deleted) {
        return res.status(404).json({ message: "Sequence not found" });
      }

      const { invalidateCache } = await import("../../services/ehubContactsService");
      invalidateCache();

      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting sequence:", error);
      res.status(500).json({ message: error.message || "Failed to delete sequence" });
    }
  });
}

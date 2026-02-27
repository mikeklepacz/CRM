import type { Express } from "express";
import { storage } from "../../storage";
import type { SequencesCoreDeps } from "./sequencesCore.types";

export function registerSequencesDeleteRoute(app: Express, deps: SequencesCoreDeps): void {
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

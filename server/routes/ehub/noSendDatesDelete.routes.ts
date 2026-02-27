import type { Express } from "express";
import { storage } from "../../storage";
import type { NoSendDatesHolidaysDeps } from "./noSendDatesHolidays.types";

export function registerNoSendDatesDeleteRoute(app: Express, deps: NoSendDatesHolidaysDeps): void {
  app.delete("/api/no-send-dates/:id", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;

      const existing = await storage.getNoSendDate(id);
      if (!existing) {
        return res.status(404).json({ message: "No-send date not found" });
      }

      await storage.deleteNoSendDate(id);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting no-send date:", error);
      res.status(500).json({ message: error.message || "Failed to delete no-send date" });
    }
  });
}

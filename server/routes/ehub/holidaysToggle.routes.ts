import type { Express } from "express";
import { storage } from "../../storage";
import type { NoSendDatesHolidaysDeps } from "./noSendDatesHolidays.types";

export function registerHolidaysToggleRoute(app: Express, deps: NoSendDatesHolidaysDeps): void {
  app.post("/api/holidays/toggle", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const userId = req.user?.id || req.user?.claims?.sub;
      const tenantId = req.user?.tenantId;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      if (!tenantId) {
        return res.status(400).json({ message: "Tenant ID required" });
      }

      const { holidayId, holidayName, ignore } = req.body;
      if (!holidayId || !holidayName || typeof ignore !== "boolean") {
        return res.status(400).json({ message: "Missing required fields: holidayId, holidayName, ignore" });
      }

      const { clearIgnoredHolidaysCache } = await import("../../services/holidayCalendar");

      if (ignore) {
        const existing = await storage.getIgnoredHolidayByHolidayId(tenantId, holidayId);
        if (!existing) {
          await storage.createIgnoredHoliday({
            tenantId,
            holidayId,
            holidayName,
            ignoredBy: userId,
          });
        }
      } else {
        await storage.deleteIgnoredHoliday(tenantId, holidayId);
      }

      clearIgnoredHolidaysCache(tenantId);
      res.json({ success: true, holidayId, ignored: ignore });
    } catch (error: any) {
      console.error("Error toggling holiday:", error);
      res.status(500).json({ message: error.message || "Failed to toggle holiday" });
    }
  });
}

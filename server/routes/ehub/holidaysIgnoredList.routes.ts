import type { Express } from "express";
import { storage } from "../../storage";
import type { NoSendDatesHolidaysDeps } from "./noSendDatesHolidays.types";

export function registerHolidaysIgnoredListRoute(app: Express, deps: NoSendDatesHolidaysDeps): void {
  app.get("/api/holidays/ignored", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        return res.status(400).json({ message: "Tenant ID required" });
      }
      const ignored = await storage.getIgnoredHolidays(tenantId);
      res.json(ignored);
    } catch (error: any) {
      console.error("Error fetching ignored holidays:", error);
      res.status(500).json({ message: error.message || "Failed to fetch ignored holidays" });
    }
  });
}

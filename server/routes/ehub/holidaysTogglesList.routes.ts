import type { Express } from "express";
import type { NoSendDatesHolidaysDeps } from "./noSendDatesHolidays.types";

export function registerHolidaysTogglesListRoute(app: Express, deps: NoSendDatesHolidaysDeps): void {
  app.get("/api/holidays/toggles", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        return res.status(400).json({ message: "Tenant ID required" });
      }
      const { getAllHolidaysWithStatus } = await import("../../services/holidayCalendar");
      const holidays = await getAllHolidaysWithStatus(tenantId);
      res.json(holidays);
    } catch (error: any) {
      console.error("Error fetching holiday toggles:", error);
      res.status(500).json({ message: error.message || "Failed to fetch holiday toggles" });
    }
  });
}

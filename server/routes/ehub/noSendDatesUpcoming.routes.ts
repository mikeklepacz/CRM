import type { Express } from "express";
import type { NoSendDatesHolidaysDeps } from "./noSendDatesHolidays.types";

export function registerNoSendDatesUpcomingRoute(app: Express, deps: NoSendDatesHolidaysDeps): void {
  app.get("/api/no-send-dates/upcoming", deps.isAuthenticatedCustom, async (req: any, res) => {
    try {
      const { getUpcomingBlockedDays } = await import("../../services/holidayCalendar");
      const blockedDays = await getUpcomingBlockedDays(new Date(), 90);
      res.json(blockedDays);
    } catch (error: any) {
      console.error("Error fetching upcoming blocked days:", error);
      res.status(500).json({ message: error.message || "Failed to fetch upcoming blocked days" });
    }
  });
}

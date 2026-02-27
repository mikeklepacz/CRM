import type { Express } from "express";
import { storage } from "../../storage";
import type { NoSendDatesHolidaysDeps } from "./noSendDatesHolidays.types";

export function registerNoSendDatesListRoute(app: Express, deps: NoSendDatesHolidaysDeps): void {
  app.get("/api/no-send-dates", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const dates = await storage.getNoSendDates();
      res.json(dates);
    } catch (error: any) {
      console.error("Error fetching no-send dates:", error);
      res.status(500).json({ message: error.message || "Failed to fetch no-send dates" });
    }
  });
}

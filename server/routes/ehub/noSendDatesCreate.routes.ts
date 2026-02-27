import type { Express } from "express";
import { insertNoSendDateSchema } from "@shared/schema";
import { storage } from "../../storage";
import type { NoSendDatesHolidaysDeps } from "./noSendDatesHolidays.types";

export function registerNoSendDatesCreateRoute(app: Express, deps: NoSendDatesHolidaysDeps): void {
  app.post("/api/no-send-dates", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const userId = req.user?.id || req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const validatedData = insertNoSendDateSchema.parse({
        ...req.body,
        createdBy: userId,
      });

      const created = await storage.createNoSendDate(validatedData);
      res.status(201).json(created);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      if (error.message?.includes("duplicate key") || error.code === "23505") {
        return res.status(409).json({ message: "This date is already blocked" });
      }
      console.error("Error creating no-send date:", error);
      res.status(500).json({ message: error.message || "Failed to create no-send date" });
    }
  });
}

import type { Express } from "express";
import { getTicketsForActor } from "../../services/docs/ticketsService";
import type { TicketsReadDeps } from "./ticketsRead.types";

export function registerTicketsListRoute(app: Express, deps: TicketsReadDeps): void {
  app.get("/api/tickets", deps.isAuthenticatedCustom, async (req, res) => {
    try {
      const tickets = await getTicketsForActor(req.user);
      res.json({ tickets });
    } catch (error: any) {
      console.error("Error fetching tickets:", error);
      res.status(500).json({ message: error.message || "Failed to fetch tickets" });
    }
  });
}

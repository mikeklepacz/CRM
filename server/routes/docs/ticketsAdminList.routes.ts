import type { Express } from "express";
import { getAdminTickets, isTicketHttpError } from "../../services/docs/ticketsService";
import type { TicketsReadDeps } from "./ticketsRead.types";

export function registerTicketsAdminListRoute(app: Express, deps: TicketsReadDeps): void {
  app.get("/api/tickets/admin", deps.isAuthenticatedCustom, async (req, res) => {
    try {
      const tickets = await getAdminTickets({
        authUser: req.user,
        checkAdminAccess: deps.checkAdminAccess,
      });
      res.json({ tickets });
    } catch (error: any) {
      if (isTicketHttpError(error)) {
        return res.status(error.status).json({ message: error.message });
      }
      console.error("Error fetching admin tickets:", error);
      res.status(500).json({ message: error.message || "Failed to fetch tickets" });
    }
  });
}

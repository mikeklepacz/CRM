import type { Express } from "express";
import { getTicketDetails, isTicketHttpError } from "../../services/docs/ticketsService";
import type { TicketsReadDeps } from "./ticketsRead.types";

export function registerTicketsGetByIdRoute(app: Express, deps: TicketsReadDeps): void {
  app.get("/api/tickets/:id", deps.isAuthenticatedCustom, async (req, res) => {
    try {
      const payload = await getTicketDetails({
        authUser: req.user,
        ticketId: req.params.id,
      });
      res.json(payload);
    } catch (error: any) {
      if (isTicketHttpError(error)) {
        return res.status(error.status).json({ message: error.message });
      }
      console.error("Error fetching ticket:", error);
      res.status(500).json({ message: error.message || "Failed to fetch ticket" });
    }
  });
}

import type { Express } from "express";
import { isTicketHttpError, updateTicketStatus } from "../../services/docs/ticketsService";
import type { TicketsWriteDeps } from "./ticketsWrite.types";

export function registerTicketsStatusPatchRoute(app: Express, deps: TicketsWriteDeps): void {
  app.patch("/api/tickets/:id/status", deps.isAuthenticatedCustom, async (req, res) => {
    try {
      const ticket = await updateTicketStatus({
        authUser: req.user,
        ticketId: req.params.id,
        status: req.body.status,
      });
      res.json({ ticket });
    } catch (error: any) {
      if (isTicketHttpError(error)) {
        return res.status(error.status).json({ message: error.message });
      }
      console.error("Error updating ticket status:", error);
      res.status(500).json({ message: error.message || "Failed to update ticket status" });
    }
  });
}

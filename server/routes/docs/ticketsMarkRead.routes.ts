import type { Express } from "express";
import { isTicketHttpError, markTicketRead } from "../../services/docs/ticketsService";
import type { TicketsWriteDeps } from "./ticketsWrite.types";

export function registerTicketsMarkReadRoute(app: Express, deps: TicketsWriteDeps): void {
  app.post("/api/tickets/:id/mark-read", deps.isAuthenticatedCustom, async (req, res) => {
    try {
      await markTicketRead({
        authUser: req.user,
        ticketId: req.params.id,
        checkAdminAccess: deps.checkAdminAccess,
      });
      res.json({ success: true });
    } catch (error: any) {
      if (isTicketHttpError(error)) {
        return res.status(error.status).json({ message: error.message });
      }
      console.error("Error marking ticket as read:", error);
      res.status(500).json({ message: error.message || "Failed to mark ticket as read" });
    }
  });
}

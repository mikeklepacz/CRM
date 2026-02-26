import type { Express } from "express";
import {
  getAdminTickets,
  getTicketDetails,
  getTicketsForActor,
  getUnreadTicketCount,
  isTicketHttpError,
  type CheckAdminAccess,
} from "../../services/docs/ticketsService";

type Deps = {
  isAuthenticatedCustom: any;
  checkAdminAccess: CheckAdminAccess;
};

export function registerTicketsReadRoutes(app: Express, deps: Deps): void {
  app.get("/api/tickets/unread-count", deps.isAuthenticatedCustom, async (req, res) => {
    try {
      const count = await getUnreadTicketCount({
        authUser: req.user,
        checkAdminAccess: deps.checkAdminAccess,
      });
      res.json({ count });
    } catch (error: any) {
      console.error("Error getting unread count:", error);
      res.status(500).json({ message: error.message || "Failed to get unread count" });
    }
  });

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

  app.get("/api/tickets", deps.isAuthenticatedCustom, async (req, res) => {
    try {
      const tickets = await getTicketsForActor(req.user);
      res.json({ tickets });
    } catch (error: any) {
      console.error("Error fetching tickets:", error);
      res.status(500).json({ message: error.message || "Failed to fetch tickets" });
    }
  });

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

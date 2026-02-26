import type { Express } from "express";
import {
  createTicket,
  createTicketReply,
  isTicketHttpError,
  markTicketRead,
  updateTicketStatus,
  type CheckAdminAccess,
} from "../../services/docs/ticketsService";

type Deps = {
  isAuthenticatedCustom: any;
  checkAdminAccess: CheckAdminAccess;
};

export function registerTicketsWriteRoutes(app: Express, deps: Deps): void {
  app.post("/api/tickets", deps.isAuthenticatedCustom, async (req, res) => {
    try {
      const ticket = await createTicket({
        authUser: req.user,
        body: req.body,
      });
      res.json({ ticket });
    } catch (error: any) {
      console.error("Error creating ticket:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid ticket data", errors: error.errors });
      }
      res.status(500).json({ message: error.message || "Failed to create ticket" });
    }
  });

  app.post("/api/tickets/:id/reply", deps.isAuthenticatedCustom, async (req, res) => {
    try {
      const reply = await createTicketReply({
        authUser: req.user,
        ticketId: req.params.id,
        message: req.body.message,
      });
      res.json({ reply });
    } catch (error: any) {
      if (isTicketHttpError(error)) {
        return res.status(error.status).json({ message: error.message });
      }
      console.error("Error creating reply:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid reply data", errors: error.errors });
      }
      res.status(500).json({ message: error.message || "Failed to create reply" });
    }
  });

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

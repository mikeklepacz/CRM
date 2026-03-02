import type { Express } from "express";
import { createTicketReply, isTicketHttpError } from "../../services/docs/ticketsService";
import type { TicketsWriteDeps } from "./ticketsWrite.types";

export function registerTicketsReplyCreateRoute(app: Express, deps: TicketsWriteDeps): void {
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
}

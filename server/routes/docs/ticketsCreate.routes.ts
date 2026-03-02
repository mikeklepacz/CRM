import type { Express } from "express";
import { createTicket } from "../../services/docs/ticketsService";
import type { TicketsWriteDeps } from "./ticketsWrite.types";

export function registerTicketsCreateRoute(app: Express, deps: TicketsWriteDeps): void {
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
}

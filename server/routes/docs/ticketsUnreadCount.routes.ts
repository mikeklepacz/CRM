import type { Express } from "express";
import { getUnreadTicketCount } from "../../services/docs/ticketsService";
import type { TicketsReadDeps } from "./ticketsRead.types";

export function registerTicketsUnreadCountRoute(app: Express, deps: TicketsReadDeps): void {
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
}

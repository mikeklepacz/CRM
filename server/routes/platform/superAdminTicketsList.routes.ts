import type { Express } from "express";
import type { SuperAdminTicketsWebhooksRouteDeps } from "./superAdminTicketsWebhooks.types";
import { requireSuperAdminFromSession } from "./superAdminTicketsWebhooks.helpers";
import { storage } from "../../storage";

export function registerSuperAdminTicketsListRoute(app: Express, deps: SuperAdminTicketsWebhooksRouteDeps): void {
  app.get("/api/super-admin/tickets", deps.isAuthenticatedCustom, async (req: any, res) => {
      try {
          const superAdmin = await requireSuperAdminFromSession(req, res);
          if (!superAdmin)
              return;
          const tenantId = req.query.tenantId as string | undefined;
          let allTickets = await storage.getAllTickets();
          if (tenantId && tenantId !== "all") {
              allTickets = allTickets.filter((t) => t.tenantId === tenantId);
          }
          const ticketsWithInfo = await Promise.all(allTickets.map(async (ticket) => {
              const ticketUser = await storage.getUser(ticket.userId);
              let tenantName = "Unknown Tenant";
              if (ticket.tenantId) {
                  const tenant = await storage.getTenantById(ticket.tenantId);
                  tenantName = tenant?.name || "Unknown Tenant";
              }
              return {
                  ...ticket,
                  tenantName,
                  userEmail: ticketUser?.email,
                  userName: ticketUser?.firstName && ticketUser?.lastName
                      ? `${ticketUser.firstName} ${ticketUser.lastName}`
                      : undefined,
              };
          }));
          res.json({ tickets: ticketsWithInfo });
      }
      catch (error: any) {
          console.error("Error fetching super admin tickets:", error);
          res.status(500).json({ message: error.message || "Failed to fetch tickets" });
      }
  });
}

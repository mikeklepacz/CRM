import type { Express } from "express";
import type { TicketsReadDeps as Deps } from "./ticketsRead.types";
import { registerTicketsUnreadCountRoute } from "./ticketsUnreadCount.routes";
import { registerTicketsAdminListRoute } from "./ticketsAdminList.routes";
import { registerTicketsListRoute } from "./ticketsList.routes";
import { registerTicketsGetByIdRoute } from "./ticketsGetById.routes";

export function registerTicketsReadRoutes(app: Express, deps: Deps): void {
  registerTicketsUnreadCountRoute(app, deps);
  registerTicketsAdminListRoute(app, deps);
  registerTicketsListRoute(app, deps);
  registerTicketsGetByIdRoute(app, deps);
}

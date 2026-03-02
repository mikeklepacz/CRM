import type { Express } from "express";
import type { TicketsWriteDeps as Deps } from "./ticketsWrite.types";
import { registerTicketsCreateRoute } from "./ticketsCreate.routes";
import { registerTicketsReplyCreateRoute } from "./ticketsReplyCreate.routes";
import { registerTicketsStatusPatchRoute } from "./ticketsStatusPatch.routes";
import { registerTicketsMarkReadRoute } from "./ticketsMarkRead.routes";

export function registerTicketsWriteRoutes(app: Express, deps: Deps): void {
  registerTicketsCreateRoute(app, deps);
  registerTicketsReplyCreateRoute(app, deps);
  registerTicketsStatusPatchRoute(app, deps);
  registerTicketsMarkReadRoute(app, deps);
}

import type { CheckAdminAccess } from "../../services/docs/ticketsService";

export type TicketsReadDeps = {
  isAuthenticatedCustom: any;
  checkAdminAccess: CheckAdminAccess;
};

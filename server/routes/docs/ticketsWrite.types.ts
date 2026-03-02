import type { CheckAdminAccess } from "../../services/docs/ticketsService";

export type TicketsWriteDeps = {
  isAuthenticatedCustom: any;
  checkAdminAccess: CheckAdminAccess;
};

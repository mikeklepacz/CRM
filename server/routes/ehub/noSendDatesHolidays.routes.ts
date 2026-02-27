import type { Express } from "express";
import type { NoSendDatesHolidaysDeps as Deps } from "./noSendDatesHolidays.types";
import { registerNoSendDatesListRoute } from "./noSendDatesList.routes";
import { registerNoSendDatesCreateRoute } from "./noSendDatesCreate.routes";
import { registerNoSendDatesDeleteRoute } from "./noSendDatesDelete.routes";
import { registerNoSendDatesUpcomingRoute } from "./noSendDatesUpcoming.routes";
import { registerHolidaysTogglesListRoute } from "./holidaysTogglesList.routes";
import { registerHolidaysToggleRoute } from "./holidaysToggle.routes";
import { registerHolidaysIgnoredListRoute } from "./holidaysIgnoredList.routes";

export function registerNoSendDatesAndHolidaysRoutes(
  app: Express,
  deps: Deps
): void {
  registerNoSendDatesListRoute(app, deps);
  registerNoSendDatesCreateRoute(app, deps);
  registerNoSendDatesDeleteRoute(app, deps);
  registerNoSendDatesUpcomingRoute(app, deps);
  registerHolidaysTogglesListRoute(app, deps);
  registerHolidaysToggleRoute(app, deps);
  registerHolidaysIgnoredListRoute(app, deps);
}

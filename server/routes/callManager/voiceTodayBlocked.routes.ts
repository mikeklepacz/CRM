import type { Express } from "express";
import type { OutboundCallingDeps } from "./outboundCalling.types";

export function registerVoiceTodayBlockedRoute(app: Express, deps: OutboundCallingDeps): void {
  app.get("/api/voice/today-blocked", deps.isAuthenticatedCustom, async (req: any, res) => {
    try {
      const tenantId = req.user.tenantId;
      const { isNoSendDay } = await import("../../services/holidayCalendar");
      const result = await isNoSendDay(new Date(), undefined, tenantId);
      res.json({ blocked: result.blocked, reason: result.reason || null });
    } catch (error: any) {
      console.error("Error checking blocked day:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });
}

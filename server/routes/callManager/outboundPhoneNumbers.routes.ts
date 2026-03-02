import type { Express } from "express";
import { storage } from "../../storage";
import type { OutboundCallingDeps } from "./outboundCalling.types";

export function registerOutboundPhoneNumbersRoute(app: Express, deps: OutboundCallingDeps): void {
  app.get("/api/elevenlabs/phone-numbers", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const phoneNumbers = await storage.getAllElevenLabsPhoneNumbers(req.user.tenantId);
      res.json(phoneNumbers);
    } catch (error: any) {
      console.error("Error fetching phone numbers:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });
}

import type { Express } from "express";
import type { SuperAdminElevenLabsAgentsRouteDeps } from "./superAdminElevenLabsAgents.types";
import { storage } from "../../storage";

export function registerSuperAdminElevenLabsPhoneNumbersListRoute(app: Express, deps: SuperAdminElevenLabsAgentsRouteDeps): void {
  app.get("/api/super-admin/tenants/:tenantId/elevenlabs/phone-numbers", deps.requireSuperAdmin, async (req: any, res) => {
      try {
          const { tenantId } = req.params;
          const phoneNumbers = await storage.getAllElevenLabsPhoneNumbers(tenantId);
          res.json(phoneNumbers);
      }
      catch (error: any) {
          console.error("Error fetching phone numbers:", error);
          res.status(500).json({ error: error.message || "Internal server error" });
      }
  });
}

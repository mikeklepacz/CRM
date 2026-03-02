import type { Express } from "express";
import { storage } from "../../storage";
import type { ManualCallHistoryDeps } from "./manualCallHistory.types";

export function registerManualCallHistoryCreateRoute(app: Express, deps: ManualCallHistoryDeps): void {
  app.post("/api/call-history", deps.isAuthenticatedCustom, async (req, res) => {
    try {
      const user = req.user as any;
      const userId = user.isPasswordAuth ? user.id : user.claims.sub;
      const tenantId = user.tenantId;
      if (!tenantId) {
        return res.status(400).json({ message: "Tenant context required" });
      }
      const { storeName, phoneNumber, storeLink } = req.body;

      if (!storeName || !phoneNumber) {
        return res.status(400).json({ message: "Store name and phone number are required" });
      }

      const callData = {
        agentId: userId,
        tenantId,
        storeName,
        phoneNumber,
        storeLink: storeLink || null,
      };

      const newCall = await storage.createCallHistory(callData);

      if (storeLink) {
        try {
          const client = await storage.getClientByUniqueIdentifier(storeLink);
          if (client) {
            await storage.updateLastContactDate(client.id);
            console.log(`[Manual Call] Updated lastContactDate for client ${client.id} (${storeName})`);
          }
        } catch (error) {
          console.log("Could not update lastContactDate for client:", error);
        }
      }

      res.json(newCall);
    } catch (error: any) {
      console.error("Error creating call history:", error);
      res.status(500).json({ message: error.message || "Failed to log call" });
    }
  });
}

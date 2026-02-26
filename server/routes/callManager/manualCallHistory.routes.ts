import type { Express } from "express";
import { storage } from "../../storage";

type Deps = {
  isAuthenticatedCustom: any;
};

export function registerCallManagerManualCallHistoryRoutes(app: Express, deps: Deps): void {
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

  app.get("/api/call-history", deps.isAuthenticatedCustom, async (req, res) => {
    try {
      const userContext = req.user as any;
      const userId = userContext.isPasswordAuth ? userContext.id : userContext.claims.sub;
      const tenantId = userContext.tenantId;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const { agentId } = req.query;
      if (agentId && (user.roleInTenant === "org_admin" || user.role === "admin")) {
        const callHistory = await storage.getAllCallHistory(tenantId, agentId as string);
        return res.json(callHistory);
      }
      if (user.roleInTenant === "org_admin" || user.role === "admin") {
        const callHistory = await storage.getAllCallHistory(tenantId);
        return res.json(callHistory);
      }

      const callHistory = await storage.getUserCallHistory(userId, tenantId);
      res.json(callHistory);
    } catch (error: any) {
      console.error("Error fetching call history:", error);
      res.status(500).json({ message: error.message || "Failed to fetch call history" });
    }
  });
}

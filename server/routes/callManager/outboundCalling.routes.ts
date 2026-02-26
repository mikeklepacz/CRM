import type { Express } from "express";
import { storage } from "../../storage";

export function registerCallManagerOutboundCallingRoutes(
  app: Express,
  deps: {
    isAdmin: any;
    isAuthenticatedCustom: any;
    checkAdminAccess: (user: any, tenantId: string | undefined) => Promise<boolean>;
  }
): void {
  app.post("/api/elevenlabs/initiate-call", deps.isAuthenticatedCustom, async (req: any, res) => {
    try {
      const { phoneNumber, agentId, clientId, storeSnapshot } = req.body;

      if (!phoneNumber || !agentId) {
        return res.status(400).json({ error: "phoneNumber and agentId are required" });
      }

      const tenantId = req.user.tenantId;
      const config = await storage.getElevenLabsConfig(tenantId);
      if (!config?.apiKey) {
        return res.status(500).json({ error: "ElevenLabs API key not configured" });
      }
      if (!config?.phoneNumberId) {
        return res.status(500).json({ error: "ElevenLabs phone number ID not configured" });
      }

      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const elevenlabsApiUrl = "https://api.elevenlabs.io/v1/convai/twilio/outbound-call";
      const requestBody = {
        agent_id: agentId,
        agent_phone_number_id: config.phoneNumberId,
        to_number: phoneNumber,
        conversation_initiation_client_data: {
          phoneNumber,
          clientId: clientId || "",
          initiatedByUserId: userId,
          storeSnapshot: storeSnapshot || null,
        },
      };

      const response = await fetch(elevenlabsApiUrl, {
        method: "POST",
        headers: {
          "xi-api-key": config.apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("ElevenLabs API error:", response.status, errorText);
        return res.status(response.status).json({
          error: `ElevenLabs API error: ${response.statusText}`,
          details: errorText,
        });
      }

      const data = await response.json();
      const conversationId = data.conversationId ?? data.conversation_id;

      if (!conversationId) {
        console.error("ElevenLabs API returned no conversation ID:", data);
        return res.status(502).json({
          error: "Invalid response from ElevenLabs API",
          details: "No conversation ID returned",
        });
      }

      const session = await storage.createCallSession({
        tenantId: req.user.tenantId,
        conversationId,
        agentId,
        clientId: clientId || "",
        initiatedByUserId: userId,
        phoneNumber,
        status: "initiated",
        storeSnapshot: storeSnapshot || null,
      });

      await storage.createCallEvent({
        tenantId: req.user.tenantId,
        conversationId,
        eventType: "call_initiated",
        status: "initiated",
        payload: { phoneNumber, agentId, userId },
      });

      res.status(200).json({
        conversationId,
        sessionId: session.id,
        status: "initiated",
      });
    } catch (error: any) {
      console.error("Error initiating call:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });

  app.get("/api/elevenlabs/phone-numbers", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const phoneNumbers = await storage.getAllElevenLabsPhoneNumbers(req.user.tenantId);
      res.json(phoneNumbers);
    } catch (error: any) {
      console.error("Error fetching phone numbers:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });

  app.get("/api/elevenlabs/agents", deps.isAuthenticatedCustom, async (req: any, res) => {
    try {
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const user = await storage.getUser(userId);

      console.log("[DEBUG] GET /api/elevenlabs/agents - tenantId:", req.user.tenantId, "userId:", userId);

      const isAdmin = await deps.checkAdminAccess(user, req.user.tenantId);
      if (!isAdmin && !user?.hasVoiceAccess) {
        return res.status(403).json({ error: "Voice calling access required" });
      }

      const { projectId } = req.query;
      const agents = await storage.getAllElevenLabsAgents(req.user.tenantId, projectId as string | undefined);
      const phoneNumbers = await storage.getAllElevenLabsPhoneNumbers(req.user.tenantId);
      const phoneByIdMap = new Map(phoneNumbers.map((p) => [p.phoneNumberId, p]));

      const transformedAgents = agents.map((agent) => {
        const phone = agent.phoneNumberId ? phoneByIdMap.get(agent.phoneNumberId) : null;
        return {
          id: agent.id,
          name: agent.name,
          agent_id: agent.agentId,
          phone_number_id: agent.phoneNumberId,
          phone_number: phone?.phoneNumber || null,
          phone_label: phone?.label || null,
          description: agent.description,
          is_default: agent.isDefault,
        };
      });
      res.json(transformedAgents);
    } catch (error: any) {
      console.error("Error fetching agents:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });

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

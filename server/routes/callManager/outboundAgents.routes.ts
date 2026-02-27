import type { Express } from "express";
import { storage } from "../../storage";
import type { OutboundCallingDeps } from "./outboundCalling.types";

export function registerOutboundAgentsRoute(app: Express, deps: OutboundCallingDeps): void {
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
}

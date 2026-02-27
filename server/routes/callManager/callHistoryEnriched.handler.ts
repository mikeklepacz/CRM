import { storage } from "../../storage";

export async function handleCallHistoryEnriched(req: any, res: any, checkAdminAccess: any): Promise<any> {
  try {
    const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
    const user = await storage.getUser(userId);

    const isAdminUser = await checkAdminAccess(user, req.user.tenantId);
    if (!isAdminUser && !user?.hasVoiceAccess) {
      return res.status(403).json({ error: "Voice calling access required" });
    }

    const {
      startDate,
      endDate,
      status,
      agentId,
      campaignId,
      qualificationLeadId,
      search,
    } = req.query;

    const filters: any = {};

    if (startDate) {
      filters.startDate = new Date(startDate as string);
    }
    if (endDate) {
      filters.endDate = new Date(endDate as string);
    }
    if (status) {
      filters.status = status;
    }
    if (qualificationLeadId) {
      filters.qualificationLeadId = qualificationLeadId;
    }
    if (agentId && agentId !== "all") {
      filters.agentId = agentId;
    }
    if (campaignId) {
      filters.campaignId = campaignId;
    }

    const tenantId = req.user.tenantId;
    const sessions = await storage.getCallSessions(tenantId, filters);

    const enrichedSessions = await Promise.all(
      sessions.map(async (session: any) => {
        let client = null;
        let campaign = null;
        let campaignName = null;

        if (session.clientId) {
          try {
            client = await storage.getClient(session.clientId, tenantId);
          } catch (e) {
            console.warn(`Could not fetch client ${session.clientId}:`, e);
          }
        }

        try {
          const targets = await storage.getCallTargetsBySession(session.conversationId, tenantId);
          if (targets && targets.length > 0) {
            const target = targets[0];
            if (target.campaignId) {
              campaign = await storage.getCallCampaign(target.campaignId, tenantId);
              campaignName = campaign?.name || null;
            }
          }
        } catch (e) {
          console.warn(`Could not fetch campaign for session ${session.conversationId}:`, e);
        }

        let agentName = "Unknown";
        if (session.agentId) {
          try {
            const agent = await storage.getElevenLabsAgent(session.agentId, tenantId);
            agentName = agent?.name || "Unknown";
          } catch (e) {
            console.warn(`Could not fetch agent ${session.agentId}:`, e);
          }
        }

        return {
          ...session,
          clientData: client?.data || null,
          storeName: client?.data?.Name || client?.data?.name || "Unknown",
          storeLink: client?.uniqueIdentifier || null,
          campaignName,
          campaignScenario: campaign?.scenario || session.scenario || "unknown",
          agentName,
        };
      })
    );

    let filteredSessions = enrichedSessions;
    if (search && typeof search === "string" && search.trim()) {
      const searchLower = search.toLowerCase().trim();
      filteredSessions = enrichedSessions.filter((session: any) => {
        return (
          session.storeName?.toLowerCase().includes(searchLower) ||
          session.phoneNumber?.toLowerCase().includes(searchLower) ||
          session.pocName?.toLowerCase().includes(searchLower)
        );
      });
    }

    res.json({
      sessions: filteredSessions,
      total: filteredSessions.length,
    });
  } catch (error: any) {
    console.error("Error fetching enriched call history:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
}

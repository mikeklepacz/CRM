export function createDebugCallTraceHandler(storage: any) {
  return async (req: any, res: any) => {
    try {
      const { callSid } = req.params;
      console.log("[Debug][DEBUG] Fetching call trace for:", callSid);

      const session = await storage.getCallSessionByCallSid(callSid);
      let events: any[] = [];
      if (session?.conversationId) {
        events = await storage.getCallEvents(session.conversationId);
      }

      let campaignTarget = null;
      const tenantId = (req.user as any).tenantId;
      if (session?.conversationId) {
        const targets = await storage.getCallTargetsBySession(session.conversationId, tenantId);
        if (targets.length > 0) {
          campaignTarget = targets[0];
        }
      }

      let flyioStatus = null;
      try {
        const flyResponse = await fetch("https://hemp-voice-proxy.fly.dev/sessions", {
          headers: {
            Authorization: `Bearer ${process.env.FLY_PROXY_SECRET || "hemp-voice-proxy-secret-2024"}`,
          },
        });
        if (flyResponse.ok) {
          flyioStatus = await flyResponse.json();
        }
      } catch (e) {
        flyioStatus = { error: "Failed to fetch Fly.io status" };
      }

      res.json({
        callSid,
        session: session || null,
        events,
        campaignTarget,
        flyioProxySessions: flyioStatus,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error("[Debug][DEBUG] Error fetching call trace:", error);
      res.status(500).json({ error: error.message });
    }
  };
}

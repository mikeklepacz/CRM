import axios from "axios";

type Deps = {
  storage: any;
};

export function createSyncCallsHandler(deps: Deps) {
  const { storage } = deps;

  return async (req: any, res: any) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const projectId = req.body?.projectId as string | undefined;
      const config = await storage.getElevenLabsConfig(tenantId, projectId);
      if (!config?.apiKey) {
        return res.status(400).json({ error: "ElevenLabs API key not configured" });
      }

      let importedCount = 0;
      let skippedCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      const configuredAgents = await storage.getAllElevenLabsAgents(tenantId, projectId);
      const validAgentIds = new Set(configuredAgents.map((a: any) => a.agentId));
      console.log("[Sync] Configured agents:", Array.from(validAgentIds));

      const listResponse = await axios.get("https://api.elevenlabs.io/v1/convai/conversations", {
        headers: { "xi-api-key": config.apiKey },
        params: { limit: 100 },
      });

      const conversations = listResponse.data?.conversations || [];
      console.log(`[Sync] Found ${conversations.length} conversations from ElevenLabs`);

      for (const conv of conversations) {
        try {
          const conversationId = conv.conversation_id;

          if (conv.agent_id && !validAgentIds.has(conv.agent_id)) {
            console.log(`[Sync] Skipping conversation ${conversationId} - unknown agent: ${conv.agent_id}`);
            skippedCount++;
            continue;
          }

          const existing = await storage.getCallSessionByConversationId(conversationId);
          const detailResponse = await axios.get(
            `https://api.elevenlabs.io/v1/convai/conversations/${conversationId}`,
            { headers: { "xi-api-key": config.apiKey } }
          );
          const details = detailResponse.data;

          if (!details.agent_id || !validAgentIds.has(details.agent_id)) {
            console.log(
              `[Sync] Skipping conversation ${conversationId} - unknown agent in details: ${details.agent_id || "none"}`
            );
            skippedCount++;
            continue;
          }

          const metadata = details.metadata || {};
          const phoneNumber =
            metadata.caller_number || details.conversation_initiation_client_data?.phone_number || "Unknown";

          let client = await storage.getClientByUniqueIdentifier(phoneNumber);
          if (!client) {
            client = await storage.createClient({
              uniqueIdentifier: phoneNumber,
              data: {
                phoneNumber,
                businessName: details.conversation_initiation_client_data?.business_name,
                ...details.conversation_initiation_client_data,
              },
              tenantId,
            });
          }

          const durationSecs =
            metadata.conversation_duration_secs ||
            metadata.duration_secs ||
            metadata.call_duration_secs ||
            details.call_duration_secs ||
            0;

          const startedAt = metadata.start_time_unix_secs
            ? new Date(metadata.start_time_unix_secs * 1000)
            : new Date();
          const endedAt = metadata.end_time_unix_secs
            ? new Date(metadata.end_time_unix_secs * 1000)
            : startedAt;

          const callSuccessful = details.status === "done";
          let aiAnalysis = null;
          if (details.analysis) {
            aiAnalysis = {
              summary: details.analysis.transcript_summary || details.analysis.call_summary_title,
              sentiment: details.analysis.sentiment || details.analysis.customer_sentiment,
              customerMood: details.analysis.customer_mood || details.analysis.customer_emotion,
              mainObjection: details.analysis.main_objection,
              keyMoment: details.analysis.key_moment,
            };
          }

          if (existing) {
            await storage.deleteCallTranscripts(conversationId);
            await storage.updateCallSession(existing.id, tenantId, {
              agentId: details.agent_id,
              status: details.status === "done" ? "completed" : details.status,
              callDurationSecs: durationSecs,
              startedAt,
              endedAt,
              callSuccessful,
              aiAnalysis,
            });
            console.log(`[Sync] Updated conversation ${conversationId}`);
          } else {
            await storage.createCallSession({
              tenantId,
              conversationId,
              agentId: details.agent_id,
              clientId: client.id,
              phoneNumber,
              status: details.status === "done" ? "completed" : details.status,
              callDurationSecs: durationSecs,
              startedAt,
              endedAt,
              callSuccessful,
              aiAnalysis,
              interestLevel: null,
              followUpNeeded: false,
              storeSnapshot: details.conversation_initiation_client_data,
            });
            console.log(`[Sync] Created conversation ${conversationId}`);
          }

          if (details.transcript && Array.isArray(details.transcript)) {
            for (let i = 0; i < details.transcript.length; i++) {
              const msg = details.transcript[i];
              await storage.createCallTranscript({
                tenantId,
                conversationId,
                sequenceNumber: i,
                role: msg.role,
                message: msg.content || msg.message || "",
                timestamp: msg.timestamp || msg.time_in_call_secs || 0,
              });
            }
          }

          importedCount++;
        } catch (convError: any) {
          console.error("[Sync] Error processing conversation:", convError);
          errorCount++;
          errors.push(convError.message || "Unknown error");
        }
      }

      res.json({
        success: true,
        imported: importedCount,
        skipped: skippedCount,
        errors: errorCount,
        errorDetails: errors.slice(0, 5),
        total: conversations.length,
      });
    } catch (error: any) {
      console.error("[Sync] Error syncing calls:", error);
      res.status(500).json({
        error: error.message || "Failed to sync calls",
        details: error.response?.data,
      });
    }
  };
}

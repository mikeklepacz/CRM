import axios from "axios";
import { applyExtractedDataAndSheetsSync } from "./elevenLabsWebhookExtraction.service";

type Deps = {
  analyzeCallTranscript: (conversationId: string, tenantId: string) => Promise<any>;
  analyzeTranscriptQualification: (sessionId: string, tenantId: string) => Promise<any>;
  columnIndexToLetter: (index: number) => string;
  googleSheets: {
    readSheetData: (spreadsheetId: string, range: string) => Promise<any[][]>;
    writeSheetData: (spreadsheetId: string, range: string, values: any[][]) => Promise<any>;
  };
  storage: any;
};

function createResponse(status: number, body: any) {
  return { status, body };
}

export async function handleCallInitiationFailure(deps: Deps, payload: any, receiveTime: number) {
  const data = payload.data;
  const conversationId = data.conversation_id;
  const clientData = data.conversation_initiation_client_data || {};

  console.log("[ElevenLabs Webhook][DEBUG] *** CALL INITIATION FAILURE ***");
  console.log("[ElevenLabs Webhook][DEBUG] Failure details:", JSON.stringify(data, null, 2));

  const session = await deps.storage.getCallSessionByConversationId(conversationId);
  if (session) {
    console.log("[ElevenLabs Webhook][DEBUG] Found session, marking as failed:", session.id);
    await deps.storage.updateCallSessionByConversationId(conversationId, { status: "failed", endedAt: new Date() });
  } else {
    console.log("[ElevenLabs Webhook][DEBUG] No session found for conversation:", conversationId);
  }

  if (clientData.campaignTargetId) {
    const target = await deps.storage.getCallCampaignTarget(clientData.campaignTargetId, clientData.tenantId);
    if (target && target.targetStatus === "in-progress") {
      await deps.storage.updateCallCampaignTarget(clientData.campaignTargetId, clientData.tenantId, {
        targetStatus: "failed",
      });
      await deps.storage.incrementCampaignCalls(target.campaignId, clientData.tenantId, "failed");
    }
  }

  console.log(`[ElevenLabs Webhook][DEBUG] Processed in ${Date.now() - receiveTime}ms`);
  return createResponse(200, { status: "processed", type: "call_initiation_failure" });
}

export async function handlePostCallAudio(deps: Deps, payload: any, receiveTime: number) {
  const data = payload.data;
  const conversationId = data.conversation_id;
  const metadata = data.metadata || {};

  console.log("[ElevenLabs Webhook][DEBUG] Post-call audio notification");
  console.log("[ElevenLabs Webhook][DEBUG] Call duration:", metadata.call_duration_secs, "seconds");
  console.log("[ElevenLabs Webhook][DEBUG] Cost:", metadata.cost);

  const session = await deps.storage.getCallSessionByConversationId(conversationId);
  if (session) {
    const endedAt =
      metadata.start_time_unix_secs && metadata.call_duration_secs
        ? new Date((metadata.start_time_unix_secs + metadata.call_duration_secs) * 1000)
        : new Date();

    await deps.storage.updateCallSessionByConversationId(conversationId, {
      status: "processing",
      callDurationSecs: metadata.call_duration_secs || null,
      costCredits: metadata.cost || null,
      endedAt,
    });
  } else {
    console.log("[ElevenLabs Webhook][DEBUG] No session found for conversation:", conversationId);
  }

  console.log(`[ElevenLabs Webhook][DEBUG] Processed in ${Date.now() - receiveTime}ms`);
  return createResponse(200, { status: "processed", type: "post_call_audio" });
}

async function upsertSessionAndCampaignData(deps: Deps, data: any, conversationId: string) {
  let session = await deps.storage.getCallSessionByConversationId(conversationId);
  const metadata = data.metadata || {};
  const clientData = data.conversation_initiation_client_data || {};
  const analysis = data.analysis || {};

  const startedAt = metadata.start_time_unix_secs ? new Date(metadata.start_time_unix_secs * 1000) : new Date();
  const endedAt =
    metadata.start_time_unix_secs && metadata.call_duration_secs
      ? new Date((metadata.start_time_unix_secs + metadata.call_duration_secs) * 1000)
      : data.status === "done"
      ? new Date()
      : null;

  if (!session) {
    session = await deps.storage.createCallSession({
      conversationId,
      agentId: data.agent_id,
      clientId: clientData.clientId || "",
      initiatedByUserId: clientData.initiatedByUserId || null,
      phoneNumber: clientData.phoneNumber || "",
      status: data.status === "done" ? "completed" : data.status,
      callDurationSecs: metadata.call_duration_secs || null,
      costCredits: metadata.cost || null,
      startedAt,
      endedAt,
      callSuccessful: analysis.call_successful || null,
      storeSnapshot: clientData.storeSnapshot || null,
    });
  } else {
    await deps.storage.updateCallSessionByConversationId(conversationId, {
      status: data.status === "done" ? "completed" : data.status,
      callDurationSecs: metadata.call_duration_secs || null,
      costCredits: metadata.cost || null,
      endedAt,
      callSuccessful: analysis.call_successful || null,
    });
  }

  if (clientData.campaignTargetId && data.status === "done") {
    const callSuccessful = analysis.call_successful;
    const target = await deps.storage.getCallCampaignTarget(clientData.campaignTargetId, clientData.tenantId);
    if (target && target.targetStatus === "in-progress") {
      await deps.storage.updateCallCampaignTarget(clientData.campaignTargetId, clientData.tenantId, {
        targetStatus: callSuccessful ? "completed" : "failed",
        externalConversationId: conversationId,
      });
      await deps.storage.incrementCampaignCalls(
        target.campaignId,
        clientData.tenantId,
        callSuccessful ? "successful" : "failed"
      );

      if (target.clientId) {
        const client = await deps.storage.getClient(target.clientId, clientData.tenantId);
        if (client?.uniqueIdentifier?.startsWith("lead:")) {
          const leadId = client.uniqueIdentifier.replace("lead:", "");
          const leadStatus = callSuccessful ? "completed" : "failed";
          await deps.storage.updateQualificationLead(leadId, clientData.tenantId, {
            callStatus: leadStatus,
            callSessionId: conversationId,
            lastCallAt: new Date(),
            status: callSuccessful ? "contacted" : "new",
          });
        }
      }
    }
  }

  return { session, clientData, analysis };
}

async function storeTranscriptsIfMissing(storage: any, data: any, conversationId: string) {
  if (!(data.transcript && Array.isArray(data.transcript))) return;
  const existingTranscripts = await storage.getCallTranscripts(conversationId);
  if (existingTranscripts.length > 0) return;

  const transcripts = data.transcript.map((item: any) => ({
    conversationId,
    role: item.role,
    message: item.message,
    timeInCallSecs: item.time_in_call_secs || null,
    toolCalls: item.tool_calls || null,
    toolResults: item.tool_results || null,
    metrics: item.conversation_turn_metrics || null,
  }));

  await storage.bulkCreateCallTranscripts(transcripts);
}

async function updateAutomatedLineIfDetected(deps: Deps, data: any, clientData: any) {
  if (!(data.transcript && Array.isArray(data.transcript) && clientData.clientId)) return;

  const ivrDetected = data.transcript.some((item: any) =>
    Array.isArray(item.tool_calls) && item.tool_calls.some((tool: any) => tool.name === "play_keypad_touch_tone")
  );
  if (!ivrDetected) return;

  try {
    const storeSnapshot = clientData.storeSnapshot;
    if (!storeSnapshot || storeSnapshot.rowIndex === undefined || !storeSnapshot.sheetId) return;

    const sheet = await deps.storage.getGoogleSheetById(storeSnapshot.sheetId, clientData.tenantId);
    if (!sheet) return;

    const { spreadsheetId, sheetName } = sheet;
    const headers = (await deps.googleSheets.readSheetData(spreadsheetId, `${sheetName}!1:1`))[0] || [];
    const columnIndex = headers.findIndex((h: string) => h.toLowerCase() === "automated line");
    if (columnIndex === -1) return;

    await deps.googleSheets.writeSheetData(
      spreadsheetId,
      `${sheetName}!${deps.columnIndexToLetter(columnIndex)}${storeSnapshot.rowIndex}`,
      [["TRUE"]]
    );
  } catch (ivrError: any) {
    console.error("[IVR Detection] Error updating Automated Line:", ivrError.message);
  }
}

async function runAutoTriggers(deps: Deps, data: any, conversationId: string, session: any) {
  if (!(data.status === "done" && data.transcript && data.transcript.length > 0 && session?.tenantId)) return;

  deps.analyzeCallTranscript(conversationId, session.tenantId).catch((err) => {
    console.error("Async error in OpenAI reflection:", err);
  });

  if (session?.id) {
    deps.analyzeTranscriptQualification(session.id, session.tenantId).catch((err) => {
      console.error("[Auto-Trigger] Error in qualification transcript analysis:", err.message);
    });
  }

  (async () => {
    try {
      const agentId = data.agent_id;
      if (!agentId) return;

      const allUsers = await deps.storage.getAllUsers();
      const adminUser = allUsers.find(
        (u: any) => u.roleInTenant === "org_admin" || u.role === "admin" || u.isSuperAdmin
      );
      if (!adminUser) return;

      const preferences = await deps.storage.getUserPreferences(adminUser.id, session.tenantId);
      if (!preferences?.autoKbAnalysis) return;

      const threshold = preferences.kbAnalysisThreshold || 10;
      const unanalyzedCalls = await deps.storage.getCallsWithTranscripts({
        agentId,
        onlyUnanalyzed: true,
        limit: threshold + 1,
      });

      if (unanalyzedCalls.length >= threshold) {
        await axios.post(
          `http://localhost:${process.env.PORT || 5000}/api/elevenlabs/analyze-calls`,
          { agentId, limit: threshold },
          { timeout: 300000 }
        );
      }
    } catch (autoTriggerError: any) {
      console.error("[Auto-Trigger] Error during auto-triggered analysis:", autoTriggerError.message);
    }
  })();
}

export async function handlePostCallTranscription(deps: Deps, payload: any) {
  const data = payload.data;
  const conversationId = data.conversation_id;
  if (!conversationId) {
    return createResponse(400, { error: "Missing conversation_id" });
  }

  await deps.storage.createCallEvent({
    conversationId,
    eventType: "webhook_received",
    status: data.status,
    payload: data,
  });

  const { session, clientData } = await upsertSessionAndCampaignData(deps, data, conversationId);
  await storeTranscriptsIfMissing(deps.storage, data, conversationId);
  await updateAutomatedLineIfDetected(deps, data, clientData);

  await applyExtractedDataAndSheetsSync(
    { columnIndexToLetter: deps.columnIndexToLetter, googleSheets: deps.googleSheets, storage: deps.storage },
    { conversationId, data, clientData }
  );

  await runAutoTriggers(deps, data, conversationId, session);
  return createResponse(200, { status: "received", conversationId });
}

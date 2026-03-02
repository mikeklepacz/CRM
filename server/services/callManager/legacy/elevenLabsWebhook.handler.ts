import { handleCallInitiationFailure, handlePostCallAudio, handlePostCallTranscription } from "./elevenLabsWebhookFlow.service";
import { validateElevenLabsSignature } from "../../../webhook-validation";

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

function logIncomingWebhook(payload: any) {
  console.log("[ElevenLabs Webhook][DEBUG] ========== INCOMING WEBHOOK ==========");
  console.log("[ElevenLabs Webhook][DEBUG] Timestamp:", new Date().toISOString());
  console.log("[ElevenLabs Webhook][DEBUG] Webhook type:", payload.type);
  console.log("[ElevenLabs Webhook][DEBUG] Data keys:", Object.keys(payload.data || {}));
  if (payload.data?.conversation_id) {
    console.log("[ElevenLabs Webhook][DEBUG] Conversation ID:", payload.data.conversation_id);
  }
  if (payload.data?.metadata) {
    console.log("[ElevenLabs Webhook][DEBUG] Metadata:", JSON.stringify(payload.data.metadata, null, 2));
  }
  console.log("[ElevenLabs Webhook][DEBUG] =====================");
}

async function validateSignatureIfConfigured(storage: any, req: any, payload: any) {
  const webhookTenantId = payload.data?.metadata?.tenantId as string | undefined;
  const config = webhookTenantId ? await storage.getElevenLabsConfig(webhookTenantId) : null;

  if (!config?.webhookSecret) return { ok: true };

  const signature = req.headers["elevenlabs-signature"] as string | undefined;
  const rawBody = (req as any).rawBody;
  if (!rawBody) {
    console.error("[ElevenLabs Webhook][DEBUG] Raw body not available for signature validation");
    return { ok: false, status: 500, body: { error: "Server configuration error" } };
  }

  const isValid = validateElevenLabsSignature(signature, rawBody, config.webhookSecret);
  if (!isValid) {
    console.error("[ElevenLabs Webhook][DEBUG] *** SIGNATURE VALIDATION FAILED ***");
    return { ok: false, status: 401, body: { error: "Invalid signature" } };
  }

  console.log("[ElevenLabs Webhook][DEBUG] Signature validated OK");
  return { ok: true };
}

export function createElevenlabsWebhookHandler(deps: Deps) {
  return async (req: any, res: any) => {
    const receiveTime = Date.now();

    try {
      const payload = req.body;
      logIncomingWebhook(payload);

      const signatureResult = await validateSignatureIfConfigured(deps.storage, req, payload);
      if (!signatureResult.ok) {
        return res.status(signatureResult.status).json(signatureResult.body);
      }

      const webhookType = payload.type;
      if (webhookType === "call_initiation_failure") {
        const result = await handleCallInitiationFailure(deps, payload, receiveTime);
        return res.status(result.status).json(result.body);
      }

      if (webhookType === "post_call_audio") {
        const result = await handlePostCallAudio(deps, payload, receiveTime);
        return res.status(result.status).json(result.body);
      }

      if (webhookType !== "post_call_transcription") {
        console.log("[ElevenLabs Webhook][DEBUG] Unknown webhook type, ignoring:", webhookType);
        return res.status(200).json({ status: "ignored", reason: `Unknown webhook type: ${webhookType}` });
      }

      console.log("[ElevenLabs Webhook][DEBUG] Processing post_call_transcription...");
      const result = await handlePostCallTranscription(deps, payload);
      return res.status(result.status).json(result.body);
    } catch (error: any) {
      console.error("Error processing ElevenLabs webhook:", error);
      return res.status(500).json({ error: error.message || "Internal server error" });
    }
  };
}

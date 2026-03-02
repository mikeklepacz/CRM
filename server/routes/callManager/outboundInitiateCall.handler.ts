import { storage } from "../../storage";

export async function handleOutboundInitiateCall(req: any, res: any): Promise<any> {
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
}

import axios from "axios";
import { storage } from "../../storage";

export async function handleElevenLabsSyncPhoneNumbers(req: any, res: any): Promise<any> {
  try {
    const config = await storage.getElevenLabsConfig(req.user.tenantId);
    if (!config?.apiKey) {
      return res.status(400).json({ error: "ElevenLabs API key not configured" });
    }

    const response = await axios.get("https://api.elevenlabs.io/v1/convai/phone-numbers/", {
      headers: { "xi-api-key": config.apiKey },
    });

    const phoneNumbers = Array.isArray(response.data) ? response.data : (response.data.phone_numbers ?? []);
    if (!phoneNumbers || phoneNumbers.length === 0) {
      return res.json({ message: "No phone numbers found in ElevenLabs account", phoneNumbers: [] });
    }

    for (const phone of phoneNumbers) {
      await storage.upsertElevenLabsPhoneNumber({
        phoneNumberId: phone.phone_number_id,
        phoneNumber: phone.number || phone.phone_number || "",
        label: phone.label || phone.name || null,
        agentId: phone.agent_id || null,
        tenantId: req.user.tenantId,
      } as any);
    }

    const allAgents = await storage.getAllElevenLabsAgents(req.user.tenantId);
    const agentIdToDbId = new Map(allAgents.map((a) => [a.agentId, a.id]));

    let agentUpdates = 0;
    for (const phone of phoneNumbers) {
      const assignedAgentId = phone.assigned_agent?.agent_id || phone.agent_id;
      if (assignedAgentId && phone.phone_number_id) {
        const dbAgentId = agentIdToDbId.get(assignedAgentId);
        if (dbAgentId) {
          try {
            await storage.updateElevenLabsAgent(dbAgentId, req.user.tenantId, { phoneNumberId: phone.phone_number_id });
            agentUpdates++;
          } catch (err: any) {
            console.error(`[PhoneSync] Failed to update agent ${assignedAgentId}:`, err.message);
          }
        }
      }
    }

    res.json({
      message: `Successfully synced ${phoneNumbers.length} phone number(s) from ElevenLabs (${agentUpdates} agent(s) updated)`,
      phoneNumbers: phoneNumbers.map((pn: any) => ({
        phone_number: pn.phone_number || pn.number,
        phone_number_id: pn.phone_number_id,
        provider: pn.provider,
        label: pn.label || pn.name,
        agent_id: pn.agent_id,
      })),
    });
  } catch (error: any) {
    console.error("[PhoneSync] Error syncing phone numbers:", error.response?.data || error.message);
    res.status(500).json({
      error: error.message || "Failed to sync phone numbers",
      details: error.response?.data,
    });
  }
}

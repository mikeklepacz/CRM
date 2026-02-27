import { storage } from "../../storage";

export interface SuperAdminElevenLabsAgentsRouteDeps {
  requireSuperAdmin: any;
  syncAgentSettingsFromElevenLabs: (
    agentId: string,
    elevenLabsAgentId: string,
    tenantId: string,
    storageInstance: typeof storage,
  ) => Promise<void>;
}

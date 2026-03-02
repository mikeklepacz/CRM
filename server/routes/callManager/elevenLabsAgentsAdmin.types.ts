import type { storage } from "../../storage";

export type ElevenLabsAgentsAdminDeps = {
  isAdmin: any;
  isAuthenticatedCustom: any;
  syncAgentSettingsFromElevenLabs: (
    agentId: string,
    elevenLabsAgentId: string,
    tenantId: string,
    storageInstance: typeof storage
  ) => Promise<void>;
};

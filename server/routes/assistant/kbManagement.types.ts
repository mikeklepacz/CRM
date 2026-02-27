export type KbManagementDeps = {
  isAuthenticatedCustom: any;
  isAdmin: any;
  syncKbDocumentToElevenLabs: (
    apiKey: string,
    oldDocId: string,
    filename: string,
    content: string,
    tenantId: string
  ) => Promise<{ success: boolean; newDocId?: string; agentsUpdated?: number; error?: string }>;
  syncKbFileToAlignerVectorStore: (
    kbFileId: string,
    content: string,
    filename: string,
    tenantId: string
  ) => Promise<{ success: boolean; error?: string }>;
};

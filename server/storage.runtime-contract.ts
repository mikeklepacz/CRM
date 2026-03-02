import type { IStorage } from "./storage.contract";

export interface StorageRuntimeContract extends IStorage {
  appendSequenceStrategyMessages(
    sequenceId: string,
    messages: Array<{ role: "user" | "assistant"; content: string; createdBy?: string }>,
    threadId?: string,
  ): Promise<any>;
  getPausedRecipients(tenantId?: string): Promise<any[]>;
  getAdminUserForSequences(): Promise<{ id: string; name: string } | undefined>;
  nukeAllAnalysis(): Promise<{ deletedInsights: number; deletedProposals: number; resetCalls: number }>;
  getRecipientById(recipientId: string): Promise<any | null>;
  getSequenceById(sequenceId: string): Promise<any | null>;
  getAdminUser(): Promise<any | null>;
  getAdminTenantId(): Promise<string | null>;
  updateRecipient(recipientId: string, updates: any): Promise<any>;
  insertRecipientMessage(message: any): Promise<any>;
}

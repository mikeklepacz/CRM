import type {
  CallSession,
  InsertCallSession,
  CallTranscript,
  QualificationCampaign,
  InsertQualificationCampaign,
  QualificationLead,
  InsertQualificationLead,
} from "./shared-types";

export interface QualificationStorageContract {
  // Qualification Campaign operations
  listQualificationCampaigns(tenantId: string): Promise<QualificationCampaign[]>;
  getActiveQualificationCampaign(tenantId: string): Promise<QualificationCampaign | undefined>;
  getQualificationCampaign(id: string, tenantId: string): Promise<QualificationCampaign | undefined>;
  createQualificationCampaign(data: InsertQualificationCampaign): Promise<QualificationCampaign>;
  updateQualificationCampaign(id: string, tenantId: string, updates: Partial<InsertQualificationCampaign>): Promise<QualificationCampaign>;
  deleteQualificationCampaign(id: string, tenantId: string): Promise<boolean>;

  // Qualification Lead operations
  listQualificationLeads(tenantId: string, filters?: { campaignId?: string; status?: string; callStatus?: string; projectId?: string; limit?: number; offset?: number }): Promise<{ leads: QualificationLead[]; total: number }>;
  getQualificationLead(id: string, tenantId: string): Promise<QualificationLead | undefined>;
  findQualificationLeadBySourceId(tenantId: string, sourceId: string): Promise<QualificationLead | undefined>;
  createQualificationLead(data: InsertQualificationLead): Promise<QualificationLead>;
  createQualificationLeads(leads: InsertQualificationLead[]): Promise<QualificationLead[]>;
  updateQualificationLead(id: string, tenantId: string, updates: Partial<InsertQualificationLead>): Promise<QualificationLead>;
  deleteQualificationLead(id: string, tenantId: string): Promise<boolean>;
  deleteQualificationLeads(ids: string[], tenantId: string): Promise<number>;
  getQualificationLeadStats(tenantId: string, campaignId?: string, projectId?: string): Promise<{ total: number; byStatus: Record<string, number>; byCallStatus: Record<string, number>; averageScore: number | null }>;

  // AI Transcript Analysis operations
  getCallSessionWithContext(id: string, tenantId: string): Promise<{
    session: CallSession;
    transcripts: CallTranscript[];
    lead: QualificationLead | null;
    campaign: QualificationCampaign | null;
  } | undefined>;
  updateAnalysisResults(
    sessionId: string,
    leadId: string | null,
    tenantId: string,
    sessionUpdates: Partial<InsertCallSession>,
    leadUpdates: Partial<InsertQualificationLead>
  ): Promise<void>;

}

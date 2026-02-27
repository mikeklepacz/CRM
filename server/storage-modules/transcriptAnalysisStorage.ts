import {
  callSessions,
  qualificationLeads,
  type CallSession,
  type CallTranscript,
  type InsertCallSession,
  type InsertQualificationLead,
  type QualificationCampaign,
  type QualificationLead,
} from "@shared/schema";
import { db } from "../db";
import { and, eq } from "drizzle-orm";
import { getCallSessionStorage } from "./callSessionStorage";
import { getCallTranscriptsStorage } from "./callTranscriptStorage";
import { getQualificationCampaignStorage, getQualificationLeadStorage } from "./qualificationStorage";

export async function getCallSessionWithContextStorage(
  id: string,
  tenantId: string
): Promise<
  | {
      session: CallSession;
      transcripts: CallTranscript[];
      lead: QualificationLead | null;
      campaign: QualificationCampaign | null;
    }
  | undefined
> {
  const session = await getCallSessionStorage(id, tenantId);
  if (!session) {
    return undefined;
  }

  const transcripts = session.conversationId ? await getCallTranscriptsStorage(session.conversationId) : [];

  let lead: QualificationLead | null = null;
  let campaign: QualificationCampaign | null = null;

  if (session.qualificationLeadId) {
    const foundLead = await getQualificationLeadStorage(session.qualificationLeadId, tenantId);
    if (foundLead) {
      lead = foundLead;
      if (lead.campaignId) {
        const foundCampaign = await getQualificationCampaignStorage(lead.campaignId, tenantId);
        if (foundCampaign) {
          campaign = foundCampaign;
        }
      }
    }
  }

  return { session, transcripts, lead, campaign };
}

export async function updateAnalysisResultsStorage(
  sessionId: string,
  leadId: string | null,
  tenantId: string,
  sessionUpdates: Partial<InsertCallSession>,
  leadUpdates: Partial<InsertQualificationLead>
): Promise<void> {
  await db
    .update(callSessions)
    .set({ ...sessionUpdates, updatedAt: new Date() } as any)
    .where(and(eq(callSessions.id, sessionId), eq(callSessions.tenantId, tenantId)));

  if (leadId) {
    await db
      .update(qualificationLeads)
      .set({ ...leadUpdates, updatedAt: new Date() } as any)
      .where(and(eq(qualificationLeads.id, leadId), eq(qualificationLeads.tenantId, tenantId)));
  }
}

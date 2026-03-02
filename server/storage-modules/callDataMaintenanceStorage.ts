import {
  aiInsights,
  callCampaigns,
  callCampaignTargets,
  callEvents,
  callHistory,
  callSessions,
  callTranscripts,
  kbChangeProposals,
} from "@shared/schema";
import { db } from "../db";

export async function nukeAllAnalysisStorage(): Promise<{ deletedInsights: number; deletedProposals: number; resetCalls: number }> {
  const deletedProposals = await db.delete(kbChangeProposals).returning();
  const deletedInsights = await db.delete(aiInsights).returning();
  const resetCalls = await db.update(callSessions)
    .set({ lastAnalyzedAt: null })
    .returning();

  return {
    deletedInsights: deletedInsights.length,
    deletedProposals: deletedProposals.length,
    resetCalls: resetCalls.length,
  };
}

export async function nukeAllCallDataStorage(): Promise<{
  sessionsDeleted: number;
  historyDeleted: number;
  transcriptsDeleted: number;
  eventsDeleted: number;
  targetsDeleted: number;
  campaignsDeleted: number;
}> {
  const deletedTargets = await db.delete(callCampaignTargets).returning();
  const deletedCampaigns = await db.delete(callCampaigns).returning();
  const deletedEvents = await db.delete(callEvents).returning();
  const deletedTranscripts = await db.delete(callTranscripts).returning();
  const deletedHistory = await db.delete(callHistory).returning();
  const deletedSessions = await db.delete(callSessions).returning();

  return {
    sessionsDeleted: deletedSessions.length,
    historyDeleted: deletedHistory.length,
    transcriptsDeleted: deletedTranscripts.length,
    eventsDeleted: deletedEvents.length,
    targetsDeleted: deletedTargets.length,
    campaignsDeleted: deletedCampaigns.length,
  };
}

import {
  callSessions,
  type CallSession,
  type CallTranscript,
  type Client,
} from "@shared/schema";
import { db } from "../db";
import { and, eq, inArray, sql } from "drizzle-orm";
import { getCallTranscriptsStorage } from "./callTranscriptStorage";
import { getClientStorage } from "./clientStorage";

export async function getCallsWithTranscriptsStorage(filters: {
  startDate?: string;
  endDate?: string;
  agentId?: string;
  limit?: number;
  onlyUnanalyzed?: boolean;
  conversationIds?: string[];
}): Promise<
  Array<{
    session: CallSession;
    transcripts: CallTranscript[];
    client: Client;
  }>
> {
  const limit = filters.limit || 100;

  const conditions = [eq(callSessions.status, "completed")];

  if (filters.conversationIds && filters.conversationIds.length > 0) {
    conditions.push(inArray(callSessions.conversationId, filters.conversationIds));
  } else {
    if (filters.startDate) {
      conditions.push(sql`${callSessions.startedAt} >= ${new Date(filters.startDate)}`);
    }
    if (filters.endDate) {
      conditions.push(sql`${callSessions.startedAt} <= ${new Date(filters.endDate)}`);
    }
    if (filters.agentId) {
      conditions.push(eq(callSessions.agentId, filters.agentId));
    }
    if (filters.onlyUnanalyzed) {
      conditions.push(sql`${callSessions.lastAnalyzedAt} IS NULL`);
    }
  }

  const sessions = await db
    .select()
    .from(callSessions)
    .where(and(...conditions))
    .orderBy(callSessions.startedAt)
    .limit(limit);

  const results = await Promise.all(
    sessions.map(async (session) => {
      const transcripts = await getCallTranscriptsStorage(session.conversationId!);
      const client = await getClientStorage(session.clientId as string, session.tenantId);

      return {
        session,
        transcripts,
        client: client!,
      };
    })
  );

  return results;
}

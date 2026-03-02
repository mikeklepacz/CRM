import { and, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { callSessions, categories, clients } from "@shared/schema";
import { db } from "../../db";
import { storage } from "../../storage";

export async function handleCallAnalyticsGet(req: any, res: any, deps: any): Promise<any> {
  try {
    const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
    const user = await storage.getUser(userId);

    const isAdminUser = await deps.checkAdminAccess(user, req.user.tenantId);
    if (!isAdminUser && !user?.hasVoiceAccess) {
      return res.status(403).json({ error: "Voice calling access required" });
    }

    const { agentId, startDate, endDate, outcome, projectId, limit = 50 } = req.query;
    const tenantId = req.user.tenantId;

    let elevenLabsAgentId: string | undefined;
    if (agentId) {
      const localAgent = await storage.getElevenLabsAgent(agentId as string, tenantId);
      if (localAgent) {
        elevenLabsAgentId = localAgent.agentId;
      }
    }

    let query: any = db
      .select({
        session: sql`json_build_object(
            'id', ${callSessions.id},
            'conversationId', ${callSessions.conversationId},
            'agentId', ${callSessions.agentId},
            'clientId', ${callSessions.clientId},
            'phoneNumber', ${callSessions.phoneNumber},
            'status', ${callSessions.status},
            'callDurationSecs', ${callSessions.callDurationSecs},
            'costCredits', ${callSessions.costCredits},
            'startedAt', ${callSessions.startedAt},
            'endedAt', ${callSessions.endedAt},
            'aiAnalysis', CASE WHEN ${callSessions.aiAnalysis} IS NOT NULL THEN ${callSessions.aiAnalysis}::jsonb ELSE NULL END,
            'callSuccessful', ${callSessions.callSuccessful},
            'interestLevel', ${callSessions.interestLevel},
            'followUpNeeded', ${callSessions.followUpNeeded},
            'followUpDate', ${callSessions.followUpDate},
            'nextAction', ${callSessions.nextAction},
            'storeSnapshot', ${callSessions.storeSnapshot}
          )`,
        client: sql`json_build_object('id', ${clients.id}, 'uniqueIdentifier', ${clients.uniqueIdentifier}, 'data', ${clients.data})`,
        transcriptCount: sql<number>`(SELECT COUNT(*)::int FROM call_transcripts WHERE conversation_id = ${callSessions.conversationId})`,
      })
      .from(callSessions)
      .leftJoin(clients, eq(clients.id, callSessions.clientId))
      .where(sql`${callSessions.status} IN ('completed', 'failed') AND ${callSessions.tenantId} = ${tenantId}`);

    if (elevenLabsAgentId) query = query.where(eq(callSessions.agentId, elevenLabsAgentId));
    if (startDate) query = query.where(sql`${callSessions.startedAt} >= ${new Date(startDate as string)}`);
    if (endDate) query = query.where(sql`${callSessions.endedAt} <= ${new Date(endDate as string)}`);
    if (outcome === "successful") query = query.where(eq(callSessions.callSuccessful, true));
    if (outcome === "failed") query = query.where(sql`${callSessions.callSuccessful} = false OR ${callSessions.status} = 'failed'`);

    if (projectId) {
      const projectCategories = await db
        .select({ name: categories.name })
        .from(categories)
        .where(and(eq(categories.tenantId, tenantId), or(eq(categories.projectId, projectId as string), isNull(categories.projectId))));
      const categoryNames = projectCategories.map((c) => c.name.toLowerCase());

      if (categoryNames.length > 0) {
        query = query.where(or(inArray(sql`LOWER(${clients.category})`, categoryNames), isNull(clients.category), eq(clients.category, "")));
      } else {
        query = query.where(sql`1 = 0`);
      }
    }

    const calls = await query.orderBy(sql`${callSessions.startedAt} DESC`).limit(parseInt(limit as string));

    const metrics = {
      totalCalls: calls.length,
      successfulCalls: calls.filter((c: any) => c.session.callSuccessful === true).length,
      failedCalls: calls.filter((c: any) => c.session.callSuccessful === false || c.session.status === "failed").length,
      avgDurationSecs: Math.round(calls.reduce((sum: number, c: any) => sum + (c.session.callDurationSecs || 0), 0) / (calls.length || 1)),
      interestLevels: {
        hot: calls.filter((c: any) => c.session.interestLevel === "hot").length,
        warm: calls.filter((c: any) => c.session.interestLevel === "warm").length,
        cold: calls.filter((c: any) => c.session.interestLevel === "cold").length,
        notInterested: calls.filter((c: any) => c.session.interestLevel === "not-interested").length,
      },
    };

    res.json({ calls, metrics });
  } catch (error: any) {
    console.error("Error fetching call analytics:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
}

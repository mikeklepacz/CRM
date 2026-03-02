import {
  aiInsightObjections,
  aiInsightPatterns,
  aiInsightRecommendations,
  aiInsights,
  type AiInsight,
  type AiInsightObjection,
  type AiInsightPattern,
  type AiInsightRecommendation,
  type InsertAiInsight,
  type InsertAiInsightObjection,
  type InsertAiInsightPattern,
  type InsertAiInsightRecommendation,
} from "@shared/schema";
import { db } from "../db";
import { and, desc, eq, gte, lte } from "drizzle-orm";

export async function saveAiInsightStorage(
  insight: InsertAiInsight,
  objections: InsertAiInsightObjection[],
  patterns: InsertAiInsightPattern[],
  recommendations: InsertAiInsightRecommendation[]
): Promise<AiInsight> {
  const [savedInsight] = await db.insert(aiInsights).values(insight).returning();

  if (objections.length > 0) {
    await db.insert(aiInsightObjections).values(
      objections.map((obj) => ({ ...obj, insightId: savedInsight.id, tenantId: savedInsight.tenantId }))
    );
  }

  if (patterns.length > 0) {
    await db.insert(aiInsightPatterns).values(
      patterns.map((pat) => ({ ...pat, insightId: savedInsight.id, tenantId: savedInsight.tenantId }))
    );
  }

  if (recommendations.length > 0) {
    await db.insert(aiInsightRecommendations).values(
      recommendations.map((rec) => ({ ...rec, insightId: savedInsight.id, tenantId: savedInsight.tenantId }))
    );
  }

  return savedInsight;
}

export async function getAiInsightByIdStorage(
  id: string
): Promise<
  | (AiInsight & {
      objections: AiInsightObjection[];
      patterns: AiInsightPattern[];
      recommendations: AiInsightRecommendation[];
    })
  | undefined
> {
  const [insight] = await db.select().from(aiInsights).where(eq(aiInsights.id, id));
  if (!insight) {
    return undefined;
  }

  const [objections, patterns, recommendations] = await Promise.all([
    db.select().from(aiInsightObjections).where(eq(aiInsightObjections.insightId, insight.id)),
    db.select().from(aiInsightPatterns).where(eq(aiInsightPatterns.insightId, insight.id)),
    db.select().from(aiInsightRecommendations).where(eq(aiInsightRecommendations.insightId, insight.id)),
  ]);

  return {
    ...insight,
    objections,
    patterns,
    recommendations,
  };
}

export async function getAiInsightsHistoryStorage(filters?: {
  agentId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}): Promise<
  Array<
    AiInsight & {
      objections: AiInsightObjection[];
      patterns: AiInsightPattern[];
      recommendations: AiInsightRecommendation[];
    }
  >
> {
  let query = db.select().from(aiInsights);

  const conditions = [];
  if (filters?.agentId) {
    conditions.push(eq(aiInsights.agentId, filters.agentId));
  }
  if (filters?.startDate) {
    conditions.push(gte(aiInsights.dateRangeStart, filters.startDate));
  }
  if (filters?.endDate) {
    conditions.push(lte(aiInsights.dateRangeEnd, filters.endDate));
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }

  const insights = await query.orderBy(desc(aiInsights.analyzedAt)).limit(filters?.limit || 50);

  const enrichedInsights = await Promise.all(
    insights.map(async (insight) => {
      const [objections, patterns, recommendations] = await Promise.all([
        db.select().from(aiInsightObjections).where(eq(aiInsightObjections.insightId, insight.id)),
        db.select().from(aiInsightPatterns).where(eq(aiInsightPatterns.insightId, insight.id)),
        db.select().from(aiInsightRecommendations).where(eq(aiInsightRecommendations.insightId, insight.id)),
      ]);

      return {
        ...insight,
        objections,
        patterns,
        recommendations,
      };
    })
  );

  return enrichedInsights;
}

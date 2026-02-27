import type {
  AiInsight,
  InsertAiInsight,
  AiInsightObjection,
  InsertAiInsightObjection,
  AiInsightPattern,
  InsertAiInsightPattern,
  AiInsightRecommendation,
  InsertAiInsightRecommendation,
  AnalysisJob,
  InsertAnalysisJob,
} from "./shared-types";

export interface ApolloStorageContract {
  // AI Insights operations
  saveAiInsight(insight: InsertAiInsight, objections: InsertAiInsightObjection[], patterns: InsertAiInsightPattern[], recommendations: InsertAiInsightRecommendation[]): Promise<AiInsight>;
  getAiInsightById(id: string): Promise<(AiInsight & { objections: AiInsightObjection[]; patterns: AiInsightPattern[]; recommendations: AiInsightRecommendation[] }) | undefined>;
  getAiInsightsHistory(filters?: { agentId?: string; startDate?: Date; endDate?: Date; limit?: number }): Promise<Array<AiInsight & { objections: AiInsightObjection[]; patterns: AiInsightPattern[]; recommendations: AiInsightRecommendation[] }>>;

  // Analysis Jobs operations
  createAnalysisJob(job: InsertAnalysisJob): Promise<AnalysisJob>;
  getAnalysisJob(id: string): Promise<AnalysisJob | undefined>;
  getRunningAnalysisJob(): Promise<AnalysisJob | undefined>;
  getAnalysisJobs(filters?: { status?: string; agentId?: string; limit?: number }): Promise<AnalysisJob[]>;
  updateAnalysisJob(id: string, updates: Partial<InsertAnalysisJob>): Promise<AnalysisJob>;

}

import {
  analysisJobs,
  type AnalysisJob,
  type InsertAnalysisJob,
} from "@shared/schema";
import { db } from "../db";
import { desc, eq } from "drizzle-orm";

export async function createAnalysisJobStorage(job: InsertAnalysisJob): Promise<AnalysisJob> {
  const [newJob] = await db.insert(analysisJobs).values(job).returning();
  return newJob;
}

export async function getAnalysisJobStorage(id: string): Promise<AnalysisJob | undefined> {
  const [job] = await db.select().from(analysisJobs).where(eq(analysisJobs.id, id));
  return job;
}

export async function getRunningAnalysisJobStorage(): Promise<AnalysisJob | undefined> {
  const [job] = await db
    .select()
    .from(analysisJobs)
    .where(eq(analysisJobs.status, "running"))
    .orderBy(analysisJobs.startedAt)
    .limit(1);
  return job;
}

export async function getAnalysisJobsStorage(filters?: {
  status?: string;
  agentId?: string;
  limit?: number;
}): Promise<AnalysisJob[]> {
  let query = db.select().from(analysisJobs);

  if (filters?.status) {
    query = query.where(eq(analysisJobs.status, filters.status)) as any;
  }
  if (filters?.agentId) {
    query = query.where(eq(analysisJobs.agentId, filters.agentId)) as any;
  }

  query = query.orderBy(desc(analysisJobs.createdAt)) as any;

  if (filters?.limit) {
    query = query.limit(filters.limit) as any;
  }

  return await query;
}

export async function updateAnalysisJobStorage(
  id: string,
  updates: Partial<InsertAnalysisJob>
): Promise<AnalysisJob> {
  const [updated] = await db.update(analysisJobs).set(updates).where(eq(analysisJobs.id, id)).returning();
  return updated;
}

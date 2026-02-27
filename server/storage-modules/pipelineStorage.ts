import {
  pipelineStages,
  pipelines,
  type InsertPipeline,
  type InsertPipelineStage,
  type Pipeline,
  type PipelineStage,
} from "@shared/schema";
import { db } from "../db";
import { and, eq } from "drizzle-orm";

export async function listPipelinesStorage(tenantId: string, projectId?: string): Promise<Pipeline[]> {
  const conditions = [eq(pipelines.tenantId, tenantId)];
  if (projectId) {
    conditions.push(eq(pipelines.projectId, projectId));
  }
  return await db.select().from(pipelines).where(and(...conditions)).orderBy(pipelines.name);
}

export async function getPipelineByIdStorage(
  pipelineId: string,
  tenantId: string
): Promise<Pipeline | undefined> {
  const [pipeline] = await db
    .select()
    .from(pipelines)
    .where(and(eq(pipelines.id, pipelineId), eq(pipelines.tenantId, tenantId)));
  return pipeline;
}

export async function getPipelineBySlugStorage(slug: string, tenantId: string): Promise<Pipeline | undefined> {
  const [pipeline] = await db
    .select()
    .from(pipelines)
    .where(and(eq(pipelines.slug, slug), eq(pipelines.tenantId, tenantId)));
  return pipeline;
}

export async function createPipelineStorage(data: InsertPipeline): Promise<Pipeline> {
  const [pipeline] = await db.insert(pipelines).values(data as any).returning();
  return pipeline;
}

export async function updatePipelineStorage(
  pipelineId: string,
  tenantId: string,
  updates: Partial<InsertPipeline>
): Promise<Pipeline> {
  const [updated] = await db
    .update(pipelines)
    .set({ ...updates, updatedAt: new Date() } as any)
    .where(and(eq(pipelines.id, pipelineId), eq(pipelines.tenantId, tenantId)))
    .returning();
  return updated;
}

export async function deletePipelineStorage(pipelineId: string, tenantId: string): Promise<void> {
  await db.delete(pipelines).where(and(eq(pipelines.id, pipelineId), eq(pipelines.tenantId, tenantId)));
}

export async function listPipelineStagesStorage(
  pipelineId: string,
  tenantId: string
): Promise<PipelineStage[]> {
  return await db
    .select()
    .from(pipelineStages)
    .where(and(eq(pipelineStages.pipelineId, pipelineId), eq(pipelineStages.tenantId, tenantId)))
    .orderBy(pipelineStages.stageOrder);
}

export async function getPipelineStageByIdStorage(
  stageId: string,
  tenantId: string
): Promise<PipelineStage | undefined> {
  const [stage] = await db
    .select()
    .from(pipelineStages)
    .where(and(eq(pipelineStages.id, stageId), eq(pipelineStages.tenantId, tenantId)));
  return stage;
}

export async function createPipelineStageStorage(data: InsertPipelineStage): Promise<PipelineStage> {
  const [stage] = await db.insert(pipelineStages).values(data as any).returning();
  return stage;
}

export async function updatePipelineStageStorage(
  stageId: string,
  tenantId: string,
  updates: Partial<InsertPipelineStage>
): Promise<PipelineStage> {
  const [updated] = await db
    .update(pipelineStages)
    .set({ ...updates, updatedAt: new Date() } as any)
    .where(and(eq(pipelineStages.id, stageId), eq(pipelineStages.tenantId, tenantId)))
    .returning();
  return updated;
}

export async function deletePipelineStageStorage(stageId: string, tenantId: string): Promise<void> {
  await db.delete(pipelineStages).where(and(eq(pipelineStages.id, stageId), eq(pipelineStages.tenantId, tenantId)));
}

export async function reorderPipelineStagesStorage(
  pipelineId: string,
  tenantId: string,
  stageIds: string[]
): Promise<void> {
  for (let i = 0; i < stageIds.length; i++) {
    await db
      .update(pipelineStages)
      .set({ stageOrder: i + 1, updatedAt: new Date() })
      .where(and(eq(pipelineStages.id, stageIds[i]), eq(pipelineStages.pipelineId, pipelineId), eq(pipelineStages.tenantId, tenantId)));
  }
}

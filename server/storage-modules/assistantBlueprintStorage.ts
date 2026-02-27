import {
  assistantBlueprints,
  type AssistantBlueprint,
  type InsertAssistantBlueprint,
} from "@shared/schema";
import { db } from "../db";
import { and, desc, eq } from "drizzle-orm";

export async function listAssistantBlueprintsStorage(
  tenantId: string,
  blueprintType?: string
): Promise<AssistantBlueprint[]> {
  if (blueprintType) {
    return await db
      .select()
      .from(assistantBlueprints)
      .where(and(eq(assistantBlueprints.tenantId, tenantId), eq(assistantBlueprints.blueprintType, blueprintType)))
      .orderBy(desc(assistantBlueprints.createdAt));
  }
  return await db
    .select()
    .from(assistantBlueprints)
    .where(eq(assistantBlueprints.tenantId, tenantId))
    .orderBy(desc(assistantBlueprints.createdAt));
}

export async function getAssistantBlueprintByIdStorage(
  blueprintId: string,
  tenantId: string
): Promise<AssistantBlueprint | undefined> {
  const [blueprint] = await db
    .select()
    .from(assistantBlueprints)
    .where(and(eq(assistantBlueprints.id, blueprintId), eq(assistantBlueprints.tenantId, tenantId)));
  return blueprint;
}

export async function createAssistantBlueprintStorage(
  data: InsertAssistantBlueprint,
  slug: string
): Promise<AssistantBlueprint> {
  const [blueprint] = await db
    .insert(assistantBlueprints)
    .values({
      ...data,
      slug,
    } as any)
    .returning();
  return blueprint;
}

export async function updateAssistantBlueprintStorage(
  blueprintId: string,
  tenantId: string,
  updates: Partial<InsertAssistantBlueprint>
): Promise<AssistantBlueprint> {
  const [blueprint] = await db
    .update(assistantBlueprints)
    .set({ ...updates, updatedAt: new Date() } as any)
    .where(and(eq(assistantBlueprints.id, blueprintId), eq(assistantBlueprints.tenantId, tenantId)))
    .returning();
  return blueprint;
}

export async function deleteAssistantBlueprintStorage(
  blueprintId: string,
  tenantId: string
): Promise<void> {
  await db
    .delete(assistantBlueprints)
    .where(and(eq(assistantBlueprints.id, blueprintId), eq(assistantBlueprints.tenantId, tenantId)));
}

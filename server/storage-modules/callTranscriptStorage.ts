import {
  callTranscripts,
  type CallTranscript,
  type InsertCallTranscript,
} from "@shared/schema";
import { db } from "../db";
import { eq } from "drizzle-orm";

export async function createCallTranscriptStorage(transcript: InsertCallTranscript): Promise<CallTranscript> {
  const [newTranscript] = await db.insert(callTranscripts).values(transcript).returning();
  return newTranscript;
}

export async function getCallTranscriptsStorage(conversationId: string): Promise<CallTranscript[]> {
  return await db.select().from(callTranscripts)
    .where(eq(callTranscripts.conversationId, conversationId))
    .orderBy(callTranscripts.timeInCallSecs);
}

export async function bulkCreateCallTranscriptsStorage(transcripts: InsertCallTranscript[]): Promise<void> {
  if (transcripts.length === 0) return;
  await db.insert(callTranscripts).values(transcripts);
}

export async function deleteCallTranscriptsStorage(conversationId: string): Promise<void> {
  await db.delete(callTranscripts).where(eq(callTranscripts.conversationId, conversationId));
}

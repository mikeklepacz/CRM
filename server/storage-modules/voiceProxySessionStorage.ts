import {
  voiceProxySessions,
  type InsertVoiceProxySession,
  type VoiceProxySession,
} from "@shared/schema";
import { db } from "../db";
import { eq } from "drizzle-orm";

export async function createVoiceProxySessionStorage(
  session: InsertVoiceProxySession
): Promise<VoiceProxySession> {
  const [created] = await db.insert(voiceProxySessions).values(session).returning();
  return created;
}

export async function getVoiceProxySessionStorage(streamSid: string): Promise<VoiceProxySession | undefined> {
  const [session] = await db
    .select()
    .from(voiceProxySessions)
    .where(eq(voiceProxySessions.streamSid, streamSid))
    .limit(1);
  return session;
}

export async function getActiveVoiceProxySessionsStorage(): Promise<VoiceProxySession[]> {
  return await db.select().from(voiceProxySessions).where(eq(voiceProxySessions.status, "active"));
}

export async function updateVoiceProxySessionStorage(
  id: string,
  updates: Partial<InsertVoiceProxySession>
): Promise<VoiceProxySession> {
  const [updated] = await db.update(voiceProxySessions).set(updates).where(eq(voiceProxySessions.id, id)).returning();
  return updated;
}

export async function endVoiceProxySessionStorage(streamSid: string): Promise<void> {
  await db
    .update(voiceProxySessions)
    .set({ status: "completed", endedAt: new Date() })
    .where(eq(voiceProxySessions.streamSid, streamSid));
}

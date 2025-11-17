// server/services/matrix2/slotDb.ts

import { db } from "../../db";
import { sql } from "drizzle-orm";
import { dailySendSlots } from "../../../shared/schema";
import { eq, and, lte } from "drizzle-orm";

// Matches schema in shared/schema.ts
export interface SlotRecord {
  id: string;
  slotTimeUtc: Date;
  slotDate: string;
  filled: boolean;
  recipientId: string | null;
  sent: boolean;
  createdAt: Date;
}

// -------------------------------------------------------
// INSERT A BATCH OF SLOTS
// -------------------------------------------------------
export async function insertSlots(slots: { id: string; slotTimeUtc: Date; slotDate: string }[]) {
  if (!slots.length) return;
  
  await db.insert(dailySendSlots).values(
    slots.map(s => ({
      id: s.id,
      slotTimeUtc: s.slotTimeUtc,
      slotDate: s.slotDate,
      filled: false,
      sent: false,
    }))
  );
}

// -------------------------------------------------------
// GET ALL UNASSIGNED SLOTS (not filled)
// -------------------------------------------------------
export async function getUnassignedSlots(): Promise<SlotRecord[]> {
  const slots = await db
    .select()
    .from(dailySendSlots)
    .where(eq(dailySendSlots.filled, false));
  
  return slots.map(s => ({
    id: s.id,
    slotTimeUtc: s.slotTimeUtc,
    slotDate: s.slotDate,
    filled: s.filled,
    recipientId: s.recipientId || null,
    sent: s.sent,
    createdAt: s.createdAt!,
  }));
}

// -------------------------------------------------------
// GET READY-TO-SEND SLOTS (filled, not sent, time passed)
// -------------------------------------------------------
export async function getReadyToSendSlots(limit: number = 10): Promise<SlotRecord[]> {
  const now = new Date();
  
  const slots = await db
    .select()
    .from(dailySendSlots)
    .where(
      and(
        eq(dailySendSlots.filled, true),
        eq(dailySendSlots.sent, false),
        lte(dailySendSlots.slotTimeUtc, now)
      )
    )
    .limit(limit);
  
  return slots.map(s => ({
    id: s.id,
    slotTimeUtc: s.slotTimeUtc,
    slotDate: s.slotDate,
    filled: s.filled,
    recipientId: s.recipientId || null,
    sent: s.sent,
    createdAt: s.createdAt!,
  }));
}

// -------------------------------------------------------
// MARK SLOT AS FILLED (assigned to recipient)
// -------------------------------------------------------
export async function markSlotAssigned(slotId: string, recipientId: string) {
  await db
    .update(dailySendSlots)
    .set({ 
      filled: true, 
      recipientId: recipientId,
      updatedAt: new Date() 
    })
    .where(eq(dailySendSlots.id, slotId));
}

// -------------------------------------------------------
// MARK SLOT AS SENT
// -------------------------------------------------------
export async function markSlotSent(slotId: string) {
  await db
    .update(dailySendSlots)
    .set({ 
      sent: true,
      updatedAt: new Date() 
    })
    .where(eq(dailySendSlots.id, slotId));
}

// -------------------------------------------------------
// CLEAR SLOTS OLDER THAN N DAYS
// -------------------------------------------------------
export async function cleanupOldSlots(days: number = 7) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  
  await db
    .delete(dailySendSlots)
    .where(lte(dailySendSlots.slotTimeUtc, cutoffDate));
}
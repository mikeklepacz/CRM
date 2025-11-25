import { db } from '@server/db';
import { dailySendSlots } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

/**
 * Matrix2 Helper - Slot management operations for recipient actions
 * Handles interactions between recipient operations and Matrix2 daily_send_slots
 */

export async function getRecipientSlot(recipientId: string) {
  // Fetch the next unfilled/unsent slot for this recipient
  const [slot] = await db
    .select()
    .from(dailySendSlots)
    .where(
      and(
        eq(dailySendSlots.recipientId, recipientId as any), // Cast varchar to uuid
        eq(dailySendSlots.filled, true),
        eq(dailySendSlots.sent, false)
      )
    )
    .orderBy(dailySendSlots.slotTimeUtc)
    .limit(1);
  
  return slot || null;
}

export async function releaseSlot(slotId: string) {
  // Release a slot by clearing recipient_id (makes it available for reassignment)
  await db
    .update(dailySendSlots)
    .set({
      recipientId: null,
      filled: false,
      updatedAt: new Date()
    })
    .where(eq(dailySendSlots.id, slotId));
}

export async function releaseAllRecipientSlots(recipientId: string) {
  // Release all slots for this recipient
  await db
    .update(dailySendSlots)
    .set({
      recipientId: null,
      filled: false,
      updatedAt: new Date()
    })
    .where(
      and(
        eq(dailySendSlots.recipientId, recipientId as any),
        eq(dailySendSlots.sent, false)
      )
    );
}

export async function updateSlotTime(slotId: string, newTimeUtc: Date) {
  // Update slot_time_utc to reschedule send
  await db
    .update(dailySendSlots)
    .set({
      slotTimeUtc: newTimeUtc,
      updatedAt: new Date()
    })
    .where(eq(dailySendSlots.id, slotId));
}

export async function forceSendNow(slotId: string) {
  // Set slot_time_utc to 1 second ago (makes it immediately eligible)
  const oneSecondAgo = new Date(Date.now() - 1000);
  await db
    .update(dailySendSlots)
    .set({
      slotTimeUtc: oneSecondAgo,
      updatedAt: new Date()
    })
    .where(eq(dailySendSlots.id, slotId));
}

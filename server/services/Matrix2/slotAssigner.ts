// server/services/matrix2/slotAssigner.ts

import { formatInTimeZone } from "date-fns-tz";
import { isWeekend } from "date-fns";
import { db } from "../../db"; // Your database adapter
import {
  getUnassignedSlots,
  markSlotAssigned
} from "./slotDb";

import {
  getEligibleRecipientsForAssignment,
  markRecipientScheduled
} from "./recipientDb"; // We'll implement this soon

import { getBusinessHours } from "../timezoneHours";
import { getEhubSettings } from "../ehubContactsService";

// --------------------------------------------------

export async function runSlotAssigner() {
  console.log("\n[MATRIX 2.0] Running slot assigner engine...");

  const settings = await getEhubSettings();
  const sendOffsetHours = settings.clientWindowStartOffset ?? 1; // Default: 1 hr after opening
  const endHour = settings.clientWindowEndHour ?? 14;            // Default: 2 PM local
  const skipWeekends = settings.skipWeekends ?? false;

  // Get all empty slots for today
  const slots = await getUnassignedSlots();
  console.log(`[MATRIX 2.0] Found ${slots.length} unassigned slots`);

  if (slots.length === 0) return;

  // Get all recipients waiting for a send
  const recipients = await getEligibleRecipientsForAssignment();
  console.log(`[MATRIX 2.0] Found ${recipients.length} eligible recipients`);

  if (recipients.length === 0) return;

  for (const slot of slots) {
    const slotUtc = new Date(slot.slot_ts);

    let assigned = false;

    for (const r of recipients) {
      if (isRecipientEligibleForSlot(r, slotUtc, {
        sendOffsetHours,
        endHour,
        skipWeekends
      })) {
        // Assign the slot
        await markSlotAssigned(slot.id, r.id);

        // Mark recipient as “scheduled”
        await markRecipientScheduled(r.id, slotUtc);

        console.log(`[MATRIX 2.0] Slot ${slot.id} assigned to recipient ${r.id}`);

        assigned = true;
        break;
      }
    }

    if (!assigned) {
      console.log(`[MATRIX 2.0] No recipient eligible for slot ${slot.id}`);
    }
  }
}

// --------------------------------------------------

function isRecipientEligibleForSlot(
  recipient: any,
  slotUtc: Date,
  ops: {
    sendOffsetHours: number,
    endHour: number,
    skipWeekends: boolean
  }
): boolean {

  const { sendOffsetHours, endHour, skipWeekends } = ops;

  const rTz = recipient.timezone;
  if (!rTz) return false;

  // Convert slot to recipient local time
  const localIso = formatInTimeZone(slotUtc, rTz, "yyyy-MM-dd'T'HH:mm:ssXXX");
  const localDate = new Date(localIso);

  if (skipWeekends && isWeekend(localDate)) {
    return false;
  }

  // Get recipient’s parsed business hours for that weekday
  const jsDay = localDate.getDay(); // 0=Sun, 1=Mon...
  const bh = getBusinessHours(recipient.business_hours);
  const todaysHours = bh[jsDay];
  if (!todaysHours || todaysHours.length === 0) return false;

  const minutesSinceMidnight = localDate.getHours() * 60 + localDate.getMinutes();

  // Check against each business-hours block
  for (const block of todaysHours) {
    const legalStart = block.open + sendOffsetHours * 60; // e.g., 11am open + 1 hr = 12pm
    const legalEnd = Math.min(block.close, endHour * 60); // must be before endHour

    if (minutesSinceMidnight >= legalStart && minutesSinceMidnight <= legalEnd) {
      return true;
    }
  }

  return false;
}
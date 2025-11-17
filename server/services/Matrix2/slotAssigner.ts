// server/services/Matrix2/slotAssigner.ts
import { parseBusinessHours } from "../timezoneHours";
import { zonedTimeToUtc, utcToZonedTime } from "date-fns-tz";
import { getEmptySlots, fillSlot } from "./slotDb";
import { getEligibleRecipientsForAssignment } from "./recipientDb";
import { storage } from "../../storage";
import { isWithinInterval } from "date-fns";

export async function assignRecipientsToSlots() {
  const settings = await storage.getEhubSettings();

  const today = new Date();
  const dateIso = today.toISOString().slice(0, 10);
  const slots = await getEmptySlots(dateIso);
  if (slots.length === 0) return;

  const recipients = await getEligibleRecipientsForAssignment();
  if (recipients.length === 0) return;

  for (const slot of slots) {
    const slotUtc = new Date(slot.slot_time_utc);

    for (const r of recipients) {
      if (!isRecipientEligible(r, slotUtc, settings)) continue;

      await fillSlot(slot.id, r.id, r.sequence_id, r.current_step);

      const idx = recipients.findIndex((x: any) => x.id === r.id);
      if (idx >= 0) recipients.splice(idx, 1);

      break;
    }
  }
}

function isRecipientEligible(recipient: any, slotUtc: Date, settings: any): boolean {
  const local = utcToZonedTime(slotUtc, recipient.timezone);

  const parsed = parseBusinessHours(recipient.business_hours);
  const day = local.getDay();
  const daySchedule = parsed[String(day)];

  if (!daySchedule || daySchedule.length === 0) return false;

  const windowStart = addMinutesLocal(local, settings.client_window_start_offset * 60);
  const windowEnd = new Date(
    local.getFullYear(),
    local.getMonth(),
    local.getDate(),
    settings.client_window_end_hour,
    0,
    0
  );

  if (
    !isWithinInterval(local, {
      start: windowStart,
      end: windowEnd,
    })
  ) return false;

  if (recipient.step_delay > 0) {
    if (!recipient.last_step_sent_at) return true;
    const last = new Date(recipient.last_step_sent_at);
    const delayMs = recipient.step_delay * 24 * 3600 * 1000;
    if (Date.now() < last.getTime() + delayMs) return false;
  }

  return true;
}

function addMinutesLocal(d: Date, mins: number) {
  return new Date(d.getTime() + mins * 60000);
}
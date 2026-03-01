import { parseBusinessHours } from "../timezoneHours";
import { toZonedTime } from "date-fns-tz";
import { isNoSendDay } from "../holidayCalendar";

export function getPriorityTier(recipient: any): number {
  const currentStep = recipient.current_step || 0;
  const isManualFollowUps = recipient.is_system === true;

  if (isManualFollowUps && currentStep >= 1) {
    return 1;
  }

  if (currentStep >= 2) {
    return 2;
  }

  return 3;
}

export async function isRecipientEligible(recipient: any, slotUtc: Date, settings: any): Promise<boolean> {
  const recipientState = recipient.state || "";
  const recipientTimezone = recipient.timezone;

  if (!recipientTimezone) {
    return false;
  }

  try {
    Intl.DateTimeFormat(undefined, { timeZone: recipientTimezone });
  } catch (error) {
    return false;
  }

  const localTime = toZonedTime(slotUtc, recipientTimezone);
  const dayOfWeek = localTime.getDay();

  const noSendCheck = await isNoSendDay(slotUtc, recipientTimezone);
  if (noSendCheck.blocked) {
    return false;
  }

  const excludedDays = settings.excludedDays || [];
  if (excludedDays.includes(dayOfWeek)) {
    return false;
  }

  const parsed = parseBusinessHours(recipient.business_hours || "", recipientState);

  if (parsed.isClosed) {
    return false;
  }

  const daySchedule = parsed.schedule[dayOfWeek];
  if (!daySchedule || daySchedule.length === 0) {
    return false;
  }

  const firstRange = daySchedule[0];
  const openMinutes = firstRange.open;
  const closeMinutes = firstRange.close;
  const localMinutes = localTime.getHours() * 60 + localTime.getMinutes();

  const clientWindowStartOffset = parseFloat(String(settings.clientWindowStartOffset || 1));
  const windowStartMinutes = openMinutes + clientWindowStartOffset * 60;

  const clientWindowEndHour = settings.clientWindowEndHour || 14;
  const windowEndMinutes = Math.min(closeMinutes, clientWindowEndHour * 60);

  if (localMinutes < windowStartMinutes || localMinutes > windowEndMinutes) {
    return false;
  }

  if (recipient.step_delay && recipient.step_delay > 0 && recipient.last_step_sent_at) {
    const lastSent = new Date(recipient.last_step_sent_at);
    const delayMs = recipient.step_delay * 24 * 60 * 60 * 1000;
    const earliestNext = new Date(lastSent.getTime() + delayMs);

    if (slotUtc < earliestNext) {
      return false;
    }
  }

  return true;
}

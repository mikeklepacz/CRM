import { insertReminderSchema } from "@shared/schema";
import { storage } from "../../../storage";
import { autoClaimStoreOnReminderCreate } from "./autoClaim";
import { createCalendarEventForReminder } from "./calendar";
import { syncDefaultCalendarReminders } from "./preferences";

type AuthUser = {
  id: string;
  tenantId: string;
  isPasswordAuth?: boolean;
  claims?: { sub?: string };
};

type ReminderCreateBody = {
  title?: string;
  description?: string;
  reminderDate?: string;
  reminderTime?: string;
  storeMetadata?: any;
  useCustomerTimezone?: boolean;
  customerTimezone?: string;
  agentTimezone?: string;
  calendarReminders?: Array<{ method: "email" | "popup"; minutes: number }>;
};

type ReminderCreateError = Error & { statusCode?: number };

function badRequest(message: string): ReminderCreateError {
  const error = new Error(message) as ReminderCreateError;
  error.statusCode = 400;
  return error;
}

function getUserId(user: AuthUser): string {
  return user.isPasswordAuth ? user.id : user.claims?.sub || user.id;
}

function resolveScheduledDate(reminderDate: string): string {
  if (reminderDate.includes("T")) return reminderDate.split("T")[0];
  return reminderDate;
}

export async function createReminder(body: ReminderCreateBody, user: AuthUser): Promise<any> {
  const userId = getUserId(user);
  const tenantId = user.tenantId;
  const {
    title,
    description,
    reminderDate,
    reminderTime,
    storeMetadata,
    useCustomerTimezone,
    customerTimezone,
    agentTimezone,
    calendarReminders,
  } = body;

  if (!title || !reminderDate || !reminderTime) {
    throw badRequest("Missing required fields: title, reminderDate, reminderTime");
  }

  const effectiveTimezone = useCustomerTimezone && customerTimezone ? customerTimezone : agentTimezone || "UTC";
  const scheduledDate = resolveScheduledDate(String(reminderDate));
  const scheduledTime = reminderTime;
  const enhancedStoreMetadata = storeMetadata
    ? {
        ...storeMetadata,
        customerTimeZone: useCustomerTimezone && customerTimezone ? customerTimezone : undefined,
      }
    : null;

  const validation = insertReminderSchema.safeParse({
    userId,
    title,
    description: description || null,
    reminderType: "one_time" as const,
    scheduledDate,
    scheduledTime,
    timezone: effectiveTimezone,
    isActive: true,
    addToCalendar: false,
    storeMetadata: enhancedStoreMetadata,
    tenantId,
  });

  if (!validation.success) {
    console.error("Validation failed:", validation.error.errors);
    throw badRequest(validation.error.errors[0].message);
  }

  const reminder = await storage.createReminder(validation.data);

  try {
    await autoClaimStoreOnReminderCreate({
      tenantId,
      userId,
      storeMetadata: enhancedStoreMetadata,
    });
  } catch (claimError: any) {
    console.error("[Auto-Claim] Failed to claim store:", claimError.message);
  }

  try {
    await createCalendarEventForReminder({
      reminderId: reminder.id,
      tenantId,
      userId,
      title,
      description: description || null,
      scheduledDate,
      scheduledTime,
      timezone: effectiveTimezone,
      storeMetadata: enhancedStoreMetadata,
      calendarReminders,
    });
  } catch {
    // Non-blocking - reminder was created successfully even if calendar sync fails.
  }

  try {
    await syncDefaultCalendarReminders({
      tenantId,
      userId,
      calendarReminders,
    });
  } catch {
    // Non-blocking - preference persistence should not fail reminder creation.
  }

  return reminder;
}

export function getReminderCreateStatusCode(error: unknown): number | null {
  if (typeof error !== "object" || !error) return null;
  const statusCode = (error as ReminderCreateError).statusCode;
  return typeof statusCode === "number" ? statusCode : null;
}

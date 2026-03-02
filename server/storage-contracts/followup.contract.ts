import type {
  Client,
  Reminder,
  InsertReminder,
  Notification,
} from "./shared-types";

export interface FollowUpStorageContract {
  // Reminder operations
  getRemindersByUser(userId: string, tenantId: string): Promise<Reminder[]>;
  getRemindersByClient(clientId: string, tenantId: string): Promise<Reminder[]>;
  getReminderById(id: string, tenantId: string): Promise<Reminder | undefined>;
  createReminder(reminder: InsertReminder): Promise<Reminder>;
  updateReminder(id: string, tenantId: string, updates: Partial<InsertReminder>): Promise<Reminder>;
  deleteReminder(id: string, tenantId: string): Promise<void>;

  // Notification operations
  getNotificationsByUser(userId: string, tenantId: string): Promise<Notification[]>;
  getNotificationById(id: string, tenantId: string): Promise<Notification | undefined>;
  markNotificationAsRead(id: string, tenantId: string): Promise<Notification>;
  markNotificationAsResolved(id: string, tenantId: string): Promise<Notification>;
  deleteNotification(id: string, tenantId: string): Promise<void>;

  // Follow-up Center operations
  getFollowUpClients(userId: string, userRole: string): Promise<{
    claimedUntouched: Array<Client & { daysSinceContact: number }>;
    interestedGoingCold: Array<Client & { daysSinceContact: number }>;
    closedWonReorder: Array<Client & { daysSinceOrder: number }>;
  }>;

}

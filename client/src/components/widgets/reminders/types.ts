export interface Reminder {
  id: string;
  clientId: string | null;
  title: string;
  description: string | null;
  scheduledDate: string;
  scheduledTime: string;
  timezone: string;
  dueDate?: string;
  scheduledAtUtc?: string;
  reminderTimeZone?: string;
  isCompleted: boolean;
  createdAt: string;
  agentId?: string;
  agentName?: string;
  storeMetadata?: {
    storeName?: string;
    storeLink?: string;
    uniqueIdentifier?: string;
    sheetId?: string;
    customerTimeZone?: string;
    pointOfContact?: string;
    pocEmail?: string;
    pocPhone?: string;
    [key: string]: any;
  };
}

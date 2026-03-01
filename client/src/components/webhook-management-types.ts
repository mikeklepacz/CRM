export interface WebhookStatus {
  userId: string;
  userEmail: string;
  agentName: string;
  hasGoogleCalendar: boolean;
  channelId: string | null;
  resourceId: string | null;
  expiry: number | null;
  expiryDate: string | null;
  isExpired: boolean | null;
  registeredUrl: string;
  environment: "production" | "development";
}

export interface WebhookStatus {
  userId: string;
  userEmail: string;
  agentName?: string;
  tenantId?: string;
  tenantName?: string;
  hasGoogleCalendar: boolean;
  channelId?: string | null;
  resourceId?: string | null;
  expiry?: number | null;
  expiryDate?: string | null;
  isExpired?: boolean | null;
  registeredUrl?: string;
  environment?: string;
}

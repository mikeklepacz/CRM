export type WooCommerceSettings = {
  url: string;
  consumerKey: string;
  consumerSecret: string;
};

export type GoogleOAuthSettings = {
  clientId: string;
  clientSecret: string;
  googleEmail?: string | null;
  connected: boolean;
  connectedByEmail?: string | null;
  connectedAt?: string | null;
};

export type IntegrationStatus = {
  googleSheetsConnected: boolean;
  googleCalendarConnected: boolean;
  googleSheetsEmail: string | null;
  googleCalendarEmail: string | null;
};

export type UserPreferences = {
  loadingLogoUrl?: string;
  timezone?: string;
  defaultTimezoneMode?: string;
  timeFormat?: string;
  defaultCalendarReminders?: Array<{ method: 'popup' | 'email'; minutes: number }>;
  visibleModules?: Record<string, boolean>;
};

export type Agent = {
  id: string;
  name: string;
  agent_id: string;
  phone_number_id?: string | null;
  phone_number?: string | null;
  phone_label?: string | null;
  description?: string;
  is_default: boolean;
  projectId?: string | null;
  projectName?: string | null;
  lastSyncedAt?: string | null;
  sttEncoding?: string | null;
  ttsOutputFormat?: string | null;
};

export type Project = {
  id: string;
  name: string;
};

export type PhoneNumber = {
  id: string;
  phoneNumberId: string;
  phoneNumber: string;
  label: string | null;
};

export type ConfigData = {
  apiKey: string;
  twilioNumber?: string;
};

export type WebhookStatus = {
  webhookUrl: string | null;
  hasSecret: boolean;
  hasApiKey: boolean;
};

export type BackgroundAudioSettings = {
  fileName: string | null;
  volumeDb: number;
  uploadedAt: string | null;
  websocketUrl: string;
  activeSessions: number;
};

export interface VoiceSettingsProps {
  tenantId?: string;
}

export type PlaceholderFieldDef = {
  name: string;
  description: string;
};

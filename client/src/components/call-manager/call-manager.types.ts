export interface ElevenLabsAgent {
  id: string;
  agent_id: string;
  name: string;
  phone_number_id: string;
}

export interface HoursScheduleEntry {
  day: string;
  hours: string;
  isToday: boolean;
  isClosed: boolean;
}

export interface EligibleStore {
  link: string;
  businessName: string;
  state: string;
  phone: string;
  hours: string;
  hoursSchedule?: HoursScheduleEntry[];
  isOpen: boolean;
  agentName?: string;
  status?: string;
  lastContactDate?: string;
  followUpDate?: string;
  pocName?: string;
  source: "sheets" | "leads";
  leadId?: string;
  website?: string;
  country?: string;
}

export interface CallQueueStats {
  activeCalls: number;
  queuedCalls: number;
  completedToday: number;
  failedToday: number;
  campaigns: any[];
}

export interface CallSession {
  id: string;
  conversationId: string;
  agentId: string;
  clientId: string;
  phoneNumber: string;
  status: string;
  callDurationSecs: number;
  startedAt: string;
  endedAt: string;
  aiAnalysis: {
    summary?: string;
    sentiment?: string;
    customerMood?: string;
    mainObjection?: string;
    keyMoment?: string;
    agentStrengths?: string;
    lessonLearned?: string;
  } | null;
  callSuccessful: boolean;
  interestLevel: "hot" | "warm" | "cold" | "not-interested" | null;
}

export interface CallClient {
  id: string;
  uniqueIdentifier: string;
  data: any;
}

export interface CallRecord {
  session: CallSession;
  client: CallClient;
  transcriptCount: number;
}

export interface CallAnalyticsMetrics {
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  avgDurationSecs: number;
  interestLevels: {
    hot: number;
    warm: number;
    cold: number;
    notInterested: number;
  };
}

export interface CallAnalyticsData {
  calls: CallRecord[];
  metrics: CallAnalyticsMetrics;
}

export type CallScenario = "cold_calls" | "follow_ups" | "recovery";

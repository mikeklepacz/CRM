export interface CallSession {
  id: string;
  conversationId: string;
  agentId: string;
  clientId: string;
  phoneNumber: string;
  status: string;
  callDurationSecs: number | null;
  costCredits: number | null;
  startedAt: string;
  endedAt: string | null;
  aiAnalysis: {
    summary?: string;
    sentiment?: string;
    customerMood?: string;
    mainObjection?: string;
    keyMoment?: string;
    agentStrengths?: string;
    lessonLearned?: string;
    extractedPoc?: {
      name?: string | null;
      email?: string | null;
      phone?: string | null;
      title?: string | null;
    };
    extractedAnswers?: {
      [key: string]: {
        value: any;
        confidence: "high" | "medium" | "low";
      };
    };
    campaignName?: string | null;
    campaignId?: string | null;
    score?: number;
    scoreBreakdown?: {
      [key: string]: {
        weight: number;
        earned: number;
        answer: any;
      };
    };
    qualificationResult?: "qualified" | "not_qualified" | "needs_review";
    analysisCompletedAt?: string;
  } | null;
  callSuccessful: boolean | null;
  interestLevel: "hot" | "warm" | "cold" | "not-interested" | null;
  followUpNeeded: boolean | null;
  followUpDate: string | null;
  nextAction: string | null;
  storeSnapshot: any;
}

export interface CallClient {
  id: string;
  uniqueIdentifier: string;
  data: any;
}

export interface CallDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string | null;
  callData: {
    session: CallSession;
    client: CallClient;
    transcriptCount: number;
  } | null;
  trackerSheetId?: string;
  storeSheetId?: string;
  refetch?: () => Promise<any>;
  currentColors?: any;
  statusOptions?: string[];
  statusColors?: { [status: string]: { background: string; text: string } };
  contextUpdateTrigger?: number;
  setContextUpdateTrigger?: (value: number | ((prev: number) => number)) => void;
}

export interface TranscriptMessage {
  id: string;
  conversationId: string;
  role: "agent" | "user";
  message: string;
  timeInCallSecs: number | null;
  createdAt: string;
}

export interface TranscriptResponse {
  transcripts: TranscriptMessage[];
}

export interface InlineAIChatStoreContext {
  sales_ready_summary?: string;
  notes?: string;
  point_of_contact?: string;
  poc_email?: string;
  poc_phone?: string;
  status?: string;
  follow_up_date?: string;
  next_action?: string;
  dba?: string;
  name: string;
  type?: string;
  link?: string;
  address?: string;
  city?: string;
  state?: string;
  phone?: string;
  email?: string;
  website?: string;
}

export interface InlineAIChatEnhancedProps {
  storeContext?: InlineAIChatStoreContext;
  contextUpdateTrigger?: number;
  loadDefaultScriptTrigger?: number;
  trackerSheetId?: string;
  onStatusChange?: (newStatus: string) => void;
}

export type TimelineItem =
  | { type: "script"; id: string; title: string; content: string; timestamp: number }
  | {
      type: "message";
      id: string;
      role: "user" | "assistant";
      content: string;
      timestamp: number;
      status?: "pending" | "sent" | "error";
      error?: string;
    };

export interface Ticket {
  id: string;
  userId: string;
  subject: string;
  message: string;
  category: string;
  status: string;
  priority: string;
  isUnreadByAdmin: boolean;
  isUnreadByUser: boolean;
  createdAt: string;
  updatedAt: string;
  userEmail?: string;
  userName?: string;
  tenantName?: string;
}

export interface TicketReply {
  id: string;
  ticketId: string;
  userId: string;
  message: string;
  createdAt: string;
  userName?: string;
  userEmail?: string;
}

export const TICKET_CATEGORIES = [
  "Bug Report",
  "Feature Request",
  "Technical Support",
  "Account Issue",
  "Billing Question",
  "Data Issue",
  "Performance Problem",
  "Integration Help",
  "General Question",
  "Other",
] as const;

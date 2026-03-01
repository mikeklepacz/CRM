export interface GmailMessage {
  id: string;
  threadId: string;
  internalDate: string;
  to: string;
  subject?: string;
  body?: string;
}

export interface ScanResult {
  scanned: number;
  promoted: number;
  newEnrollments: number;
  errors: number;
  details: {
    recipientId?: string;
    email: string;
    status: "promoted" | "has_reply" | "too_recent" | "error" | "newly_enrolled" | "blacklisted";
    message?: string;
    isNew?: boolean;
  }[];
}

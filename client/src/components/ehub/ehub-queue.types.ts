export interface IndividualSend {
  recipientId: string;
  recipientEmail: string;
  recipientName: string;
  sequenceId: string;
  sequenceName: string;
  stepNumber: number;
  scheduledAt: string | null;
  sentAt: string | null;
  status: 'sent' | 'scheduled' | 'overdue' | 'open';
  subject: string | null;
  threadId?: string | null;
  messageId?: string | null;
  senderEmail?: string;
  emailAccountId?: string;
}

export interface PausedRecipient {
  recipientId: string;
  recipientEmail: string;
  recipientName: string;
  sequenceId: string;
  sequenceName: string;
  currentStep: number;
  totalSteps: number;
  lastStepSentAt: string | null;
  pausedAt: string | null;
  messageHistory: Array<{
    stepNumber: number;
    subject: string | null;
    sentAt: string | null;
    threadId: string | null;
    messageId: string | null;
  }>;
}

export type DelayDialogState = {
  open: boolean;
  recipientId: string | null;
  hours: number;
};

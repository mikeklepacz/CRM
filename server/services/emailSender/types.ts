import type { SequenceRecipient, StrategyTranscript } from "../../../shared/schema";

export interface EmailOptions {
  userId: string;
  to: string;
  subject: string;
  body: string;
  from?: string;
  threadId?: string;
  inReplyTo?: string;
  references?: string;
}

export interface EmailResponse {
  success: boolean;
  messageId?: string;
  threadId?: string;
  rfc822MessageId?: string;
  error?: string;
}

export interface FailureNotificationParams {
  recipientEmail: string;
  recipientId: string;
  sequenceName: string;
  sequenceId: string;
  tenantId: string;
  errorReason: string;
  emailAccountId?: string;
}

export type PersonalizeTemplate = { subject?: string; body?: string };

export type PersonalizeSettings = {
  promptInjection?: string;
  keywordBin?: string;
  signature?: string;
};

export type { SequenceRecipient, StrategyTranscript };

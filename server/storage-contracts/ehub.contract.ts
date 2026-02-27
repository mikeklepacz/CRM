import type {
  EhubSettings,
  InsertEhubSettings,
  Sequence,
  InsertSequence,
  SequenceRecipient,
  InsertSequenceRecipient,
  SequenceStep,
  InsertSequenceStep,
  SequenceRecipientMessage,
  InsertSequenceRecipientMessage,
  SequenceScheduledSend,
  InsertSequenceScheduledSend,
  InsertTestEmailSend,
  TestEmailSend,
  InsertTestDataNukeLog,
  TestDataNukeLog,
  NoSendDate,
  InsertNoSendDate,
  IgnoredHoliday,
  InsertIgnoredHoliday,
  EmailAccount,
  InsertEmailAccount,
} from "./shared-types";

export interface EhubStorageContract {
  // E-Hub Settings operations
  getEhubSettings(tenantId: string): Promise<EhubSettings | undefined>;
  updateEhubSettings(tenantId: string, updates: Partial<InsertEhubSettings>): Promise<EhubSettings>;
  getOrCreateManualFollowUpsSequence(tenantId: string): Promise<Sequence>;

  // E-Hub Sequence operations
  createSequence(sequence: InsertSequence): Promise<Sequence>;
  getSequence(id: string, tenantId: string): Promise<Sequence | undefined>;
  listSequences(tenantId: string, filters?: { createdBy?: string; status?: string; projectId?: string }): Promise<Sequence[]>;
  updateSequence(id: string, tenantId: string, updates: Partial<InsertSequence>): Promise<Sequence | undefined>;
  deleteSequence(id: string, tenantId: string): Promise<boolean>;
  updateSequenceStats(id: string, tenantId: string, stats: { sentCount?: number; failedCount?: number; repliedCount?: number; lastSentAt?: Date }): Promise<Sequence>;
  incrementSequenceSentCount(id: string, tenantId: string): Promise<void>;
  syncSequenceRecipientCounts(tenantId: string): Promise<{ updated: number; sequences: Array<{ id: string; name: string; oldCount: number; newCount: number }> }>;

  // E-Hub Sequence Recipients operations
  addRecipients(recipients: InsertSequenceRecipient[]): Promise<SequenceRecipient[]>;
  getRecipients(sequenceId: string, filters?: { status?: string; limit?: number }): Promise<SequenceRecipient[]>;
  getRecipient(id: string): Promise<SequenceRecipient | undefined>;
  getNextRecipientsToSend(limit: number): Promise<SequenceRecipient[]>;
  getAllPendingRecipients(): Promise<SequenceRecipient[]>;
  getActiveRecipientsWithThreads(): Promise<SequenceRecipient[]>;
  getQueueView(): Promise<Array<SequenceRecipient & { sequenceName: string }>>;
  getIndividualSendsQueue(options: { search?: string; statusFilter?: 'active' | 'paused' }): Promise<Array<{
    recipientId: string;
    recipientEmail: string;
    recipientName: string;
    sequenceId: string;
    sequenceName: string;
    stepNumber: number;
    scheduledAt: Date | null;
    sentAt: Date | null;
    status: 'sent' | 'scheduled' | 'overdue';
    subject: string | null;
    threadId: string | null;
    messageId: string | null;
  }>>;
  updateRecipientStatus(id: string, updates: Partial<InsertSequenceRecipient>): Promise<SequenceRecipient>;
  findRecipientByEmail(sequenceId: string, email: string): Promise<SequenceRecipient | undefined>;
  pauseRecipient(id: string, tenantId?: string): Promise<SequenceRecipient>;
  resumeRecipient(id: string, tenantId?: string): Promise<SequenceRecipient>; // Added this method to resume paused recipients
  getPausedRecipientsCount(tenantId?: string): Promise<number>;
  getQueueTail(options?: { excludeRecipientId?: string }): Promise<Date | null>;
  getDailyScheduledCount(options?: { date?: Date; excludeRecipientId?: string }): Promise<number>;
  removeRecipient(id: string, tenantId?: string): Promise<SequenceRecipient>;
  sendRecipientNow(id: string, tenantId?: string): Promise<SequenceRecipient>;
  delayRecipient(id: string, hours: number, tenantId?: string): Promise<SequenceRecipient>;
  skipRecipientStep(id: string, tenantId?: string): Promise<SequenceRecipient>;

  // E-Hub Sequence Scheduled Sends operations
  insertScheduledSends(sends: InsertSequenceScheduledSend[]): Promise<SequenceScheduledSend[]>;
  getNextScheduledSends(limit: number): Promise<SequenceScheduledSend[]>;
  getUpcomingScheduledSends(limit: number): Promise<SequenceScheduledSend[]>;
  clearScheduledAtForPendingSends(imminentThreshold: Date): Promise<number>;
  deleteRecipientScheduledSends(recipientId: string): Promise<number>;
  deleteAllPendingScheduledSends(sequenceId?: string): Promise<number>;
  updateScheduledSend(id: string, updates: Partial<InsertSequenceScheduledSend>): Promise<SequenceScheduledSend>;
  claimScheduledSend(id: string): Promise<boolean>;
  getScheduledSendsByRecipient(recipientId: string): Promise<SequenceScheduledSend[]>;
  getScheduledSendsQueue(options: { search?: string; statusFilter?: 'active' | 'paused'; limit: number; timeWindowDays?: number }): Promise<Array<{
    recipientId: string;
    recipientEmail: string;
    recipientName: string;
    sequenceId: string;
    sequenceName: string;
    stepNumber: number;
    scheduledAt: Date | null;
    sentAt: Date | null;
    status: 'sent' | 'scheduled' | 'overdue' | 'open';
    subject: string | null;
    threadId: string | null;
    messageId: string | null;
  }>>;
  getLastScheduledSendForUser(userId: string): Promise<SequenceScheduledSend | null>;

  // E-Hub Sequence Steps operations
  createSequenceStep(step: InsertSequenceStep): Promise<SequenceStep>;
  getSequenceSteps(sequenceId: string): Promise<SequenceStep[]>;
  updateSequenceStep(id: string, updates: Partial<InsertSequenceStep>): Promise<SequenceStep>;
  deleteSequenceStep(id: string): Promise<boolean>;
  replaceSequenceSteps(sequenceId: string, stepDelays: number[], tenantId: string): Promise<SequenceStep[]>;

  // E-Hub Sequence Recipient Messages operations
  createRecipientMessage(message: InsertSequenceRecipientMessage): Promise<SequenceRecipientMessage>;
  getRecipientMessages(recipientId: string): Promise<SequenceRecipientMessage[]>;
  deleteRecipientMessages(recipientId: string): Promise<void>;

  // E-Hub Strategy Chat operations
  appendSequenceStrategyMessages(sequenceId: string, messages: Array<{ role: 'user' | 'assistant'; content: string }>, threadId?: string): Promise<Sequence>;

  // Test Email Sends operations
  createTestEmailSend(testSend: InsertTestEmailSend): Promise<TestEmailSend>;
  updateTestEmailSendStatus(id: string, updates: Partial<InsertTestEmailSend>): Promise<TestEmailSend>;
  getTestEmailSendByThreadId(threadId: string): Promise<TestEmailSend | undefined>;
  getTestEmailSendById(id: string): Promise<TestEmailSend | undefined>;
  listTestEmailSendsForUser(userId: string): Promise<TestEmailSend[]>;

  // Test Data Nuke operations
  getTestDataNukeCounts(emailPattern?: string): Promise<{
    recipientsCount: number;
    messagesCount: number;
    testEmailsCount: number;
    slotsCount: number;
  }>;
  nukeTestData(userId: string, tenantId: string, emailPattern?: string): Promise<{
    recipientsDeleted: number;
    messagesDeleted: number;
    testEmailsDeleted: number;
    slotsDeleted: number;
  }>;
  logTestDataNuke(log: InsertTestDataNukeLog): Promise<TestDataNukeLog>;

  // No-Send Dates operations
  getNoSendDates(): Promise<NoSendDate[]>;
  getNoSendDate(id: string): Promise<NoSendDate | undefined>;
  createNoSendDate(data: InsertNoSendDate): Promise<NoSendDate>;
  deleteNoSendDate(id: string): Promise<void>;

  // Ignored Holidays operations (tenant-aware)
  getIgnoredHolidays(tenantId: string): Promise<IgnoredHoliday[]>;
  getIgnoredHolidayByHolidayId(tenantId: string, holidayId: string): Promise<IgnoredHoliday | undefined>;
  createIgnoredHoliday(data: InsertIgnoredHoliday): Promise<IgnoredHoliday>;
  deleteIgnoredHoliday(tenantId: string, holidayId: string): Promise<void>;

  // Email Accounts Pool operations
  listEmailAccounts(tenantId: string): Promise<EmailAccount[]>;
  getEmailAccount(id: string, tenantId: string): Promise<EmailAccount | undefined>;
  getEmailAccountByEmail(tenantId: string, email: string): Promise<EmailAccount | undefined>;
  createEmailAccount(data: InsertEmailAccount): Promise<EmailAccount>;
  updateEmailAccount(id: string, tenantId: string, updates: Partial<InsertEmailAccount>): Promise<EmailAccount>;
  deleteEmailAccount(id: string, tenantId: string): Promise<boolean>;
  incrementEmailAccountDailySendCount(id: string, tenantId: string): Promise<EmailAccount>;
  getAvailableEmailAccount(tenantId: string, maxDailyLimit: number): Promise<EmailAccount | undefined>;
  getActiveEmailAccounts(tenantId: string): Promise<EmailAccount[]>;

}

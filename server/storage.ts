// Database storage implementation - combines javascript_database and javascript_log_in_with_replit blueprints
import {
  users,
  clients,
  notes,
  orders,
  commissions,
  csvUploads,
  googleSheets,
  systemIntegrations,
  userIntegrations,
  dashboardCards,
  userPreferences,
  reminders,
  notifications,
  widgetLayouts,
  openaiSettings,
  knowledgeBaseFiles,
  chatMessages,
  projects,
  conversations,
  templates,
  userTags,
  categories,
  importedPlaces,
  searchHistory,
  savedExclusions,
  statuses,
  tickets,
  ticketReplies,
  callHistory,
  emailDrafts,
  driveFolders,
  elevenLabsConfig,
  elevenLabsPhoneNumbers,
  elevenLabsAgents,
  callSessions,
  callTranscripts,
  callEvents,
  callCampaigns,
  callCampaignTargets,
  aiInsights,
  aiInsightObjections,
  aiInsightPatterns,
  aiInsightRecommendations,
  kbFiles,
  kbFileVersions,
  kbChangeProposals,
  analysisJobs,
  openaiAssistants,
  openaiAssistantFiles,
  nonDuplicates,
  type User,
  type UpsertUser,
  type Ticket,
  type InsertTicket,
  type TicketReply,
  type InsertTicketReply,
  type Client,
  type InsertClient,
  type Note,
  type InsertNote,
  type Order,
  type InsertOrder,
  type Commission,
  type InsertCommission,
  type CsvUpload,
  type InsertCsvUpload,
  type GoogleSheet,
  type InsertGoogleSheet,
  type SystemIntegration,
  type InsertSystemIntegration,
  type UserIntegration,
  type InsertUserIntegration,
  type DashboardCard,
  type UserPreferences,
  type InsertUserPreferences,
  type Reminder,
  type InsertReminder,
  type Notification,
  type InsertNotification,
  type WidgetLayout,
  type InsertWidgetLayout,
  type OpenaiSettings,
  type InsertOpenaiSettings,
  type KnowledgeBaseFile,
  type InsertKnowledgeBaseFile,
  type ChatMessage,
  type InsertChatMessage,
  type Project,
  type InsertProject,
  type Conversation,
  type InsertConversation,
  type Template,
  type InsertTemplate,
  type UserTag,
  type InsertUserTag,
  type Category,
  type InsertCategory,
  type SearchHistory,
  type InsertSearchHistory,
  type SavedExclusion,
  type InsertSavedExclusion,
  type Status,
  type InsertStatus,
  type CallHistory,
  type InsertCallHistory,
  type EmailDraft,
  type InsertEmailDraft,
  type DriveFolder,
  type InsertDriveFolder,
  type ElevenLabsConfig,
  type InsertElevenLabsConfig,
  type ElevenLabsPhoneNumber,
  type InsertElevenLabsPhoneNumber,
  type ElevenLabsAgent,
  type InsertElevenLabsAgent,
  type CallSession,
  type InsertCallSession,
  type CallTranscript,
  type InsertCallTranscript,
  type CallEvent,
  type InsertCallEvent,
  type CallCampaign,
  type InsertCallCampaign,
  type CallCampaignTarget,
  type InsertCallCampaignTarget,
  type AiInsight,
  type InsertAiInsight,
  type AiInsightObjection,
  type InsertAiInsightObjection,
  type AiInsightPattern,
  type InsertAiInsightPattern,
  type AiInsightRecommendation,
  type InsertAiInsightRecommendation,
  type KbFile,
  type InsertKbFile,
  type KbFileVersion,
  type InsertKbFileVersion,
  type KbChangeProposal,
  type InsertKbChangeProposal,
  type AnalysisJob,
  type InsertAnalysisJob,
  type NonDuplicate,
  type InsertNonDuplicate,
  backgroundAudioSettings,
  voiceProxySessions,
  type BackgroundAudioSettings,
  type InsertBackgroundAudioSettings,
  type VoiceProxySession,
  type InsertVoiceProxySession,
  ehubSettings,
  sequences,
  sequenceRecipients,
  sequenceSteps,
  sequenceRecipientMessages,
  testEmailSends,
  type EhubSettings,
  type InsertEhubSettings,
  type Sequence,
  type InsertSequence,
  type SequenceRecipient,
  type InsertSequenceRecipient,
  type SequenceStep,
  type InsertSequenceStep,
  type SequenceRecipientMessage,
  type InsertSequenceRecipientMessage,
  type InsertTestEmailSend,
  type TestEmailSend,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, inArray, sql, desc, lte, gte, gt, isNull } from "drizzle-orm";
import { v4 as uuidv4 } from 'uuid';

export interface IStorage {
  // User operations - Required for Replit Auth
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  createUser(userData: Partial<UpsertUser>): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;
  createPasswordUser(userData: any): Promise<User>;
  updateUserRole(id: string, role: string): Promise<User>;
  updateUser(id: string, updates: Partial<UpsertUser>): Promise<User>;
  deleteUser(id: string): Promise<void>;
  getAgents(): Promise<User[]>;

  // System integrations operations
  getSystemIntegration(provider: string): Promise<SystemIntegration | undefined>;
  updateSystemIntegration(provider: string, updates: Partial<InsertSystemIntegration>): Promise<SystemIntegration>;
  deleteSystemIntegration(provider: string): Promise<void>;

  // User integrations operations
  getUserIntegration(userId: string): Promise<UserIntegration | undefined>;
  getAllUserIntegrations(): Promise<UserIntegration[]>;
  updateUserIntegration(userId: string, updates: Partial<InsertUserIntegration>): Promise<UserIntegration>;

  // User preferences operations
  getUserPreferences(userId: string): Promise<UserPreferences | undefined>;
  saveUserPreferences(userId: string, preferences: Partial<InsertUserPreferences>): Promise<UserPreferences>;
  getLastCategory(userId: string): Promise<string | null>;
  setLastCategory(userId: string, category: string): Promise<UserPreferences>;
  getSelectedCategory(userId: string): Promise<string | null>;
  setSelectedCategory(userId: string, category: string): Promise<UserPreferences>;

  // Client operations
  getAllClients(): Promise<Client[]>;
  getClientsByAgent(agentId: string): Promise<Client[]>;
  getFilteredClients(filters: { search?: string; nameFilter?: string; cityFilter?: string; states?: string[]; cities?: string[]; status?: string[]; showMyStoresOnly?: boolean; category?: string; agentId?: string }): Promise<Client[]>;
  getClient(id: string): Promise<Client | undefined>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: string, updates: Partial<InsertClient>): Promise<Client>;
  claimClient(clientId: string, agentId: string): Promise<Client>;
  unclaimClient(clientId: string): Promise<Client>;
  findClientByUniqueKey(key: string, value: string): Promise<Client | undefined>;
  updateLastContactDate(clientId: string, contactDate?: Date): Promise<Client | undefined>;

  // Notes operations
  getClientNotes(clientId: string): Promise<Note[]>;
  createNote(note: InsertNote): Promise<Note>;

  // Order operations
  createOrder(order: InsertOrder): Promise<Order>;
  getOrderById(id: string): Promise<Order | undefined>;
  updateOrder(id: string, updates: Partial<InsertOrder>): Promise<Order>;
  deleteOrder(id: string): Promise<void>;
  getAllOrders(): Promise<Order[]>;

  // Commission operations
  createCommission(commission: InsertCommission): Promise<Commission>;
  getCommissionsByAgent(agentId: string): Promise<Commission[]>;
  getCommissionsByOrder(orderId: string): Promise<Commission[]>;
  deleteCommissionsByOrder(orderId: string): Promise<void>;

  // CSV Upload operations
  createCsvUpload(upload: InsertCsvUpload): Promise<CsvUpload>;
  getRecentCsvUploads(limit: number): Promise<CsvUpload[]>;

  // Google Sheets operations
  getAllActiveGoogleSheets(): Promise<GoogleSheet[]>;
  getGoogleSheetById(id: string): Promise<GoogleSheet | null>;
  getGoogleSheetByPurpose(purpose: string): Promise<GoogleSheet | null>;
  createGoogleSheetConnection(connection: InsertGoogleSheet): Promise<GoogleSheet>;
  disconnectGoogleSheet(id: string): Promise<void>;
  updateGoogleSheetLastSync(id: string): Promise<void>;
  getClientByUniqueIdentifier(uniqueId: string): Promise<Client | undefined>;

  // Dashboard operations
  getDashboardCardsByRole(role: string): Promise<any[]>;
  getDashboardStats(userId: string, role: string): Promise<any>;

  // Helper methods
  getUserById(id: string): Promise<User | undefined>;
  getOrdersByClient(clientId: string): Promise<Order[]>;

  // Reminder operations
  getRemindersByUser(userId: string): Promise<Reminder[]>;
  getRemindersByClient(clientId: string): Promise<Reminder[]>;
  getReminderById(id: string): Promise<Reminder | undefined>;
  createReminder(reminder: InsertReminder): Promise<Reminder>;
  updateReminder(id: string, updates: Partial<InsertReminder>): Promise<Reminder>;
  deleteReminder(id: string): Promise<void>;

  // Notification operations
  getNotificationsByUser(userId: string): Promise<Notification[]>;
  getNotificationById(id: string): Promise<Notification | undefined>;
  markNotificationAsRead(id: string): Promise<Notification>;
  markNotificationAsResolved(id: string): Promise<Notification>;
  deleteNotification(id: string): Promise<void>;

  // Widget layout operations
  getWidgetLayout(userId: string, dashboardType: string): Promise<WidgetLayout | undefined>;
  saveWidgetLayout(layout: InsertWidgetLayout): Promise<WidgetLayout>;

  // OpenAI operations
  getOpenaiSettings(): Promise<OpenaiSettings | undefined>;
  saveOpenaiSettings(settings: Partial<InsertOpenaiSettings>): Promise<OpenaiSettings>;
  
  // Knowledge base operations
  getAllKnowledgeBaseFiles(): Promise<KnowledgeBaseFile[]>;
  getKnowledgeBaseFile(id: string): Promise<KnowledgeBaseFile | undefined>;
  createKnowledgeBaseFile(file: InsertKnowledgeBaseFile): Promise<KnowledgeBaseFile>;
  updateKnowledgeBaseFileStatus(id: string, status: string): Promise<KnowledgeBaseFile>;
  updateKnowledgeBaseFile(id: string, updates: Partial<InsertKnowledgeBaseFile>): Promise<KnowledgeBaseFile>;
  deleteKnowledgeBaseFile(id: string): Promise<void>;
  
  // Chat operations
  getChatHistory(userId: string, limit?: number): Promise<ChatMessage[]>;
  getConversationMessages(conversationId: string): Promise<ChatMessage[]>;
  saveChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  clearChatHistory(userId: string): Promise<void>;
  
  // Project operations
  getProjects(userId: string): Promise<Project[]>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: string, updates: Partial<InsertProject>): Promise<Project>;
  deleteProject(id: string): Promise<void>;
  
  // Conversation operations
  getConversations(userId: string): Promise<Conversation[]>;
  getConversation(id: string): Promise<Conversation | undefined>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  updateConversation(id: string, updates: Partial<InsertConversation>): Promise<Conversation>;
  deleteConversation(id: string): Promise<void>;
  moveConversationToProject(conversationId: string, projectId: string | null): Promise<Conversation>;
  
  // Template operations
  getUserTemplates(userId: string): Promise<Template[]>;  // Per-user templates
  getTemplate(id: string): Promise<Template | undefined>;
  createTemplate(template: InsertTemplate): Promise<Template>;
  updateTemplate(id: string, updates: Partial<InsertTemplate>): Promise<Template>;
  deleteTemplate(id: string): Promise<void>;
  getAllTemplateTags(): Promise<string[]>; // Get all unique tags across all templates
  
  // User Tag operations
  getUserTags(userId: string): Promise<UserTag[]>;
  addUserTag(userId: string, tag: string): Promise<UserTag>;
  removeUserTag(userId: string, tag: string): Promise<void>;
  removeUserTagById(userId: string, id: string): Promise<void>;
  
  // Category operations
  getAllCategories(): Promise<Category[]>;
  getActiveCategories(): Promise<Category[]>;
  getCategory(id: string): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(id: string, updates: Partial<InsertCategory>): Promise<Category>;
  deleteCategory(id: string): Promise<void>;
  
  // Imported Places operations
  checkImportedPlaces(placeIds: string[]): Promise<Set<string>>;
  recordImportedPlace(placeId: string): Promise<void>;
  
  // Search History operations
  getAllSearchHistory(): Promise<SearchHistory[]>;
  recordSearch(businessType: string, city: string, state: string, country: string, excludedKeywords?: string[], excludedTypes?: string[], category?: string): Promise<SearchHistory>;
  deleteSearchHistory(id: string): Promise<void>;
  
  // Saved Exclusions operations
  getAllSavedExclusions(): Promise<SavedExclusion[]>;
  getSavedExclusionsByType(type: 'keyword' | 'place_type'): Promise<SavedExclusion[]>;
  createSavedExclusion(exclusion: InsertSavedExclusion): Promise<SavedExclusion>;
  deleteSavedExclusion(id: string): Promise<void>;
  updateUserActiveExclusions(userId: string, activeKeywords: string[], activeTypes: string[]): Promise<UserPreferences>;
  
  // Status operations
  getAllStatuses(): Promise<Status[]>;
  getActiveStatuses(): Promise<Status[]>;
  getStatus(id: string): Promise<Status | undefined>;
  createStatus(status: InsertStatus): Promise<Status>;
  updateStatus(id: string, updates: Partial<InsertStatus>): Promise<Status>;
  deleteStatus(id: string): Promise<void>;
  reorderStatuses(updates: { id: string; displayOrder: number }[]): Promise<void>;
  
  // Ticket operations
  getAllTickets(): Promise<Ticket[]>;
  getUserTickets(userId: string): Promise<Ticket[]>;
  getTicket(id: string): Promise<Ticket | undefined>;
  createTicket(ticket: InsertTicket): Promise<Ticket>;
  updateTicket(id: string, updates: Partial<InsertTicket>): Promise<Ticket>;
  getUnreadAdminCount(): Promise<number>;
  markTicketReadByAdmin(id: string): Promise<Ticket>;
  markTicketReadByUser(id: string): Promise<Ticket>;
  
  // Ticket Reply operations
  getTicketReplies(ticketId: string): Promise<TicketReply[]>;
  createTicketReply(reply: InsertTicketReply): Promise<TicketReply>;
  
  // Call History operations
  createCallHistory(callData: InsertCallHistory): Promise<CallHistory>;
  getUserCallHistory(userId: string): Promise<CallHistory[]>;
  getAllCallHistory(agentId?: string): Promise<CallHistory[]>;
  
  // Email Draft operations
  createEmailDraft(draftData: InsertEmailDraft): Promise<EmailDraft>;
  getUserEmailDrafts(userId: string): Promise<EmailDraft[]>;
  
  // Drive Folder operations
  getAllDriveFolders(): Promise<DriveFolder[]>;
  getDriveFolder(id: string): Promise<DriveFolder | undefined>;
  getDriveFolderByName(name: string): Promise<DriveFolder | undefined>;
  createDriveFolder(folder: InsertDriveFolder): Promise<DriveFolder>;
  updateDriveFolder(id: string, updates: Partial<InsertDriveFolder>): Promise<DriveFolder>;
  deleteDriveFolder(id: string): Promise<void>;
  
  // Follow-up Center operations
  getFollowUpClients(userId: string, userRole: string): Promise<{
    claimedUntouched: Array<Client & { daysSinceContact: number }>;
    interestedGoingCold: Array<Client & { daysSinceContact: number }>;
    closedWonReorder: Array<Client & { daysSinceOrder: number }>;
  }>;
  
  // ElevenLabs settings operations
  getElevenLabsConfig(): Promise<{ apiKey: string; twilioNumber?: string; webhookSecret?: string; phoneNumberId?: string } | undefined>;
  updateElevenLabsConfig(config: { apiKey?: string; twilioNumber?: string; webhookSecret?: string; phoneNumberId?: string }): Promise<void>;
  
  // ElevenLabs Phone Numbers operations
  getAllElevenLabsPhoneNumbers(): Promise<ElevenLabsPhoneNumber[]>;
  getElevenLabsPhoneNumber(phoneNumberId: string): Promise<ElevenLabsPhoneNumber | undefined>;
  upsertElevenLabsPhoneNumber(phoneData: InsertElevenLabsPhoneNumber): Promise<ElevenLabsPhoneNumber>;
  deleteElevenLabsPhoneNumber(phoneNumberId: string): Promise<void>;
  
  getAllElevenLabsAgents(): Promise<ElevenLabsAgent[]>;
  getElevenLabsAgent(id: string): Promise<ElevenLabsAgent | undefined>;
  getDefaultElevenLabsAgent(): Promise<ElevenLabsAgent | undefined>;
  createElevenLabsAgent(agent: InsertElevenLabsAgent): Promise<ElevenLabsAgent>;
  updateElevenLabsAgent(id: string, updates: Partial<InsertElevenLabsAgent>): Promise<ElevenLabsAgent>;
  deleteElevenLabsAgent(id: string): Promise<void>;
  setDefaultElevenLabsAgent(id: string): Promise<void>;

  // Voice AI Call Sessions operations
  createCallSession(session: InsertCallSession): Promise<CallSession>;
  getCallSession(id: string): Promise<CallSession | undefined>;
  getCallSessionByConversationId(conversationId: string): Promise<CallSession | undefined>;
  getCallSessionByCallSid(callSid: string): Promise<CallSession | undefined>;
  getCallSessions(filters?: { clientId?: string; initiatedByUserId?: string; status?: string }): Promise<CallSession[]>;
  updateCallSession(id: string, updates: Partial<InsertCallSession>): Promise<CallSession>;
  updateCallSessionByConversationId(conversationId: string, updates: Partial<InsertCallSession>): Promise<CallSession>;

  // Call Transcripts operations
  createCallTranscript(transcript: InsertCallTranscript): Promise<CallTranscript>;
  getCallTranscripts(conversationId: string): Promise<CallTranscript[]>;
  bulkCreateCallTranscripts(transcripts: InsertCallTranscript[]): Promise<void>;
  deleteCallTranscripts(conversationId: string): Promise<void>;

  // AI Insights helper operations
  getCallsWithTranscripts(filters: { startDate?: string; endDate?: string; agentId?: string; limit?: number; onlyUnanalyzed?: boolean }): Promise<Array<{
    session: CallSession;
    transcripts: CallTranscript[];
    client: Client;
  }>>;
  markCallsAsAnalyzed(conversationIds: string[]): Promise<void>;

  // Call Events operations
  createCallEvent(event: InsertCallEvent): Promise<CallEvent>;
  getCallEvents(conversationId: string): Promise<CallEvent[]>;

  // Call Campaigns operations
  createCallCampaign(campaign: InsertCallCampaign): Promise<CallCampaign>;
  getCallCampaign(id: string): Promise<CallCampaign | undefined>;
  getCallCampaigns(filters?: { createdByUserId?: string; status?: string }): Promise<CallCampaign[]>;
  updateCallCampaign(id: string, updates: Partial<InsertCallCampaign>): Promise<CallCampaign>;

  // Call Campaign Targets operations
  createCallCampaignTarget(target: InsertCallCampaignTarget): Promise<CallCampaignTarget>;
  getCallCampaignTarget(id: string): Promise<CallCampaignTarget | undefined>;
  getCallCampaignTargets(campaignId: string): Promise<CallCampaignTarget[]>;
  getCallTargetsBySession(conversationId: string): Promise<CallCampaignTarget[]>;
  getCallTargetsReadyForCalling(): Promise<CallCampaignTarget[]>;
  updateCallCampaignTarget(id: string, updates: Partial<InsertCallCampaignTarget>): Promise<CallCampaignTarget>;
  incrementCampaignCalls(campaignId: string, type: 'successful' | 'failed'): Promise<void>;

  // AI Insights operations
  saveAiInsight(insight: InsertAiInsight, objections: InsertAiInsightObjection[], patterns: InsertAiInsightPattern[], recommendations: InsertAiInsightRecommendation[]): Promise<AiInsight>;
  getAiInsightById(id: string): Promise<(AiInsight & { objections: AiInsightObjection[]; patterns: AiInsightPattern[]; recommendations: AiInsightRecommendation[] }) | undefined>;
  getAiInsightsHistory(filters?: { agentId?: string; startDate?: Date; endDate?: Date; limit?: number }): Promise<Array<AiInsight & { objections: AiInsightObjection[]; patterns: AiInsightPattern[]; recommendations: AiInsightRecommendation[] }>>;

  // KB Management operations
  getAllKbFiles(): Promise<KbFile[]>;
  getKbFileById(id: string): Promise<KbFile | undefined>;
  getKbFileByFilename(filename: string): Promise<KbFile | undefined>;
  getKbFileByElevenLabsDocId(docId: string): Promise<KbFile | undefined>;
  createKbFile(file: InsertKbFile): Promise<KbFile>;
  updateKbFile(id: string, updates: Partial<InsertKbFile>): Promise<KbFile>;
  createKbFileVersion(version: InsertKbFileVersion): Promise<KbFileVersion>;
  getKbFileVersions(fileId: string): Promise<KbFileVersion[]>;
  getKbFileVersion(id: string): Promise<KbFileVersion | undefined>;
  createKbProposal(proposal: InsertKbChangeProposal): Promise<KbChangeProposal>;
  getKbProposals(filters?: { status?: string; kbFileId?: string }): Promise<KbChangeProposal[]>;
  getKbProposalById(id: string): Promise<KbChangeProposal | undefined>;
  updateKbProposal(id: string, updates: Partial<InsertKbChangeProposal>): Promise<KbChangeProposal>;
  deleteKbProposal(id: string): Promise<boolean>;
  deleteAllKbProposals(): Promise<number>;

  // Analysis Jobs operations
  createAnalysisJob(job: InsertAnalysisJob): Promise<AnalysisJob>;
  getAnalysisJob(id: string): Promise<AnalysisJob | undefined>;
  getRunningAnalysisJob(): Promise<AnalysisJob | undefined>;
  getAnalysisJobs(filters?: { status?: string; agentId?: string; limit?: number }): Promise<AnalysisJob[]>;
  updateAnalysisJob(id: string, updates: Partial<InsertAnalysisJob>): Promise<AnalysisJob>;

  // OpenAI Assistant Management operations
  getAllAssistants(): Promise<any[]>;
  getAssistantById(id: string): Promise<any | undefined>;
  getAssistantBySlug(slug: string): Promise<any | undefined>;
  updateAssistant(id: string, updates: any): Promise<any>;
  getAssistantFiles(assistantId: string): Promise<any[]>;
  getAssistantFileById(id: string): Promise<any | undefined>;
  createAssistantFile(file: any): Promise<any>;
  // Scoped delete method enforces assistant ownership at storage layer
  deleteAssistantFileByAssistantId(fileId: string, assistantId: string): Promise<boolean>;
  
  // Non-duplicate operations
  markAsNotDuplicate(link1: string, link2: string, userId: string): Promise<NonDuplicate>;
  isMarkedAsNotDuplicate(link1: string, link2: string): Promise<boolean>;
  getAllNonDuplicates(): Promise<NonDuplicate[]>;
  removeNonDuplicateMark(link1: string, link2: string): Promise<void>;

  // Background Audio Settings operations
  getBackgroundAudioSettings(): Promise<BackgroundAudioSettings | undefined>;
  updateBackgroundAudioSettings(settings: InsertBackgroundAudioSettings): Promise<BackgroundAudioSettings>;
  
  // Voice Proxy Session operations
  createVoiceProxySession(session: InsertVoiceProxySession): Promise<VoiceProxySession>;
  getVoiceProxySession(streamSid: string): Promise<VoiceProxySession | undefined>;
  getActiveVoiceProxySessions(): Promise<VoiceProxySession[]>;
  updateVoiceProxySession(id: string, updates: Partial<InsertVoiceProxySession>): Promise<VoiceProxySession>;
  endVoiceProxySession(streamSid: string): Promise<void>;

  // E-Hub Settings operations
  getEhubSettings(): Promise<EhubSettings | undefined>;
  updateEhubSettings(updates: Partial<InsertEhubSettings>): Promise<EhubSettings>;
  
  // E-Hub Sequence operations
  createSequence(sequence: InsertSequence): Promise<Sequence>;
  getSequence(id: string): Promise<Sequence | undefined>;
  listSequences(filters?: { createdBy?: string; status?: string }): Promise<Sequence[]>;
  updateSequence(id: string, updates: Partial<InsertSequence>): Promise<Sequence | undefined>;
  deleteSequence(id: string): Promise<boolean>;
  updateSequenceStats(id: string, stats: { sentCount?: number; failedCount?: number; repliedCount?: number; lastSentAt?: Date }): Promise<Sequence>;

  // E-Hub Sequence Recipients operations
  addRecipients(recipients: InsertSequenceRecipient[]): Promise<SequenceRecipient[]>;
  getRecipients(sequenceId: string, filters?: { status?: string; limit?: number }): Promise<SequenceRecipient[]>;
  getRecipient(id: string): Promise<SequenceRecipient | undefined>;
  getNextRecipientsToSend(limit: number): Promise<SequenceRecipient[]>;
  getQueueView(): Promise<Array<SequenceRecipient & { sequenceName: string }>>;
  updateRecipientStatus(id: string, updates: Partial<InsertSequenceRecipient>): Promise<SequenceRecipient>;
  findRecipientByEmail(sequenceId: string, email: string): Promise<SequenceRecipient | undefined>;

  // E-Hub Sequence Steps operations
  createSequenceStep(step: InsertSequenceStep): Promise<SequenceStep>;
  getSequenceSteps(sequenceId: string): Promise<SequenceStep[]>;
  updateSequenceStep(id: string, updates: Partial<InsertSequenceStep>): Promise<SequenceStep>;
  deleteSequenceStep(id: string): Promise<boolean>;
  replaceSequenceSteps(sequenceId: string, stepDelays: number[]): Promise<SequenceStep[]>;

  // E-Hub Sequence Recipient Messages operations
  createRecipientMessage(message: InsertSequenceRecipientMessage): Promise<SequenceRecipientMessage>;
  getRecipientMessages(recipientId: string): Promise<SequenceRecipientMessage[]>;
  
  // E-Hub Strategy Chat operations
  appendSequenceStrategyMessages(sequenceId: string, messages: Array<{ role: 'user' | 'assistant'; content: string }>, threadId?: string): Promise<Sequence>;

  // Test Email Sends operations
  createTestEmailSend(testSend: InsertTestEmailSend): Promise<TestEmailSend>;
  updateTestEmailSendStatus(id: string, updates: Partial<InsertTestEmailSend>): Promise<TestEmailSend>;
  getTestEmailSendByThreadId(threadId: string): Promise<TestEmailSend | undefined>;
  getTestEmailSendById(id: string): Promise<TestEmailSend | undefined>;
  listTestEmailSendsForUser(userId: string): Promise<TestEmailSend[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async createUser(userData: Partial<UpsertUser>): Promise<User> {
    const [user] = await db.insert(users).values(userData as any).returning();
    return user;
  }

  async createPasswordUser(userData: any): Promise<User> {
    const [user] = await db.insert(users).values(userData).returning();
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUserRole(id: string, role: string): Promise<User> {
    const [updated] = await db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return updated;
  }

  async getAgents(): Promise<User[]> {
    return await db.select().from(users).where(eq(users.role, 'agent'));
  }

  async updateUser(id: string, updates: Partial<UpsertUser>): Promise<User> {
    const [updated] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return updated;
  }

  async deleteUser(id: string): Promise<void> {
    // Cascade delete all user data
    // Note: Most tables have ON DELETE CASCADE set, but we'll explicitly delete all for safety
    
    // Delete user integrations
    await db.delete(userIntegrations).where(eq(userIntegrations.userId, id));
    
    // Delete reminders
    await db.delete(reminders).where(eq(reminders.userId, id));
    
    // Delete conversations and their messages
    const userConversations = await db.select().from(conversations).where(eq(conversations.userId, id));
    for (const conv of userConversations) {
      await db.delete(chatMessages).where(eq(chatMessages.conversationId, conv.id));
    }
    await db.delete(conversations).where(eq(conversations.userId, id));
    
    // Delete templates
    await db.delete(templates).where(eq(templates.userId, id));
    
    // Delete user tags
    await db.delete(userTags).where(eq(userTags.userId, id));
    
    // Delete user preferences
    await db.delete(userPreferences).where(eq(userPreferences.userId, id));
    
    // Note: openaiSettings is a global admin table with no userId - don't delete it per user
    
    // Delete knowledge base files (metadata only - actual OpenAI files deleted in route handler)
    await db.delete(knowledgeBaseFiles).where(eq(knowledgeBaseFiles.uploadedBy, id));
    
    // Delete projects
    await db.delete(projects).where(eq(projects.userId, id));
    
    // Delete notifications
    await db.delete(notifications).where(eq(notifications.userId, id));
    
    // Delete widget layouts
    await db.delete(widgetLayouts).where(eq(widgetLayouts.userId, id));
    
    // Note: dashboardCards, savedExclusions, searchHistory, categories, statuses are global tables - don't delete
    
    // Delete support tickets and replies
    const userTickets = await db.select().from(tickets).where(eq(tickets.userId, id));
    for (const ticket of userTickets) {
      await db.delete(ticketReplies).where(eq(ticketReplies.ticketId, ticket.id));
    }
    await db.delete(tickets).where(eq(tickets.userId, id));
    
    // Finally, delete the user
    await db.delete(users).where(eq(users.id, id));
  }

  // System integrations operations
  async getSystemIntegration(provider: string): Promise<SystemIntegration | undefined> {
    const [integration] = await db
      .select()
      .from(systemIntegrations)
      .where(eq(systemIntegrations.provider, provider));
    return integration;
  }

  async updateSystemIntegration(provider: string, updates: Partial<InsertSystemIntegration>): Promise<SystemIntegration> {
    const existing = await this.getSystemIntegration(provider);

    if (existing) {
      const [updated] = await db
        .update(systemIntegrations)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(systemIntegrations.provider, provider))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(systemIntegrations)
        .values({ provider, ...updates })
        .returning();
      return created;
    }
  }

  async deleteSystemIntegration(provider: string): Promise<void> {
    await db
      .delete(systemIntegrations)
      .where(eq(systemIntegrations.provider, provider));
  }

  // User integrations operations
  async getUserIntegration(userId: string): Promise<UserIntegration | undefined> {
    const [integration] = await db
      .select()
      .from(userIntegrations)
      .where(eq(userIntegrations.userId, userId));
    return integration;
  }

  async getAllUserIntegrations(): Promise<UserIntegration[]> {
    // Only return integrations for active users
    const results = await db
      .select({
        integration: userIntegrations,
        user: users
      })
      .from(userIntegrations)
      .innerJoin(users, eq(userIntegrations.userId, users.id))
      .where(eq(users.isActive, true));
    
    return results.map(r => r.integration);
  }

  async updateUserIntegration(userId: string, updates: Partial<InsertUserIntegration>): Promise<UserIntegration> {
    // First check if integration exists
    const existing = await this.getUserIntegration(userId);

    if (existing) {
      const [updated] = await db
        .update(userIntegrations)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(userIntegrations.userId, userId))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(userIntegrations)
        .values({ userId, ...updates })
        .returning();
      return created;
    }
  }

  // User preferences operations
  async getUserPreferences(userId: string): Promise<UserPreferences | undefined> {
    const [preferences] = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, userId));
    return preferences;
  }

  async saveUserPreferences(userId: string, preferences: Partial<UserPreferences>) {
    const existing = await this.getUserPreferences(userId);

    // Ensure arrays are properly formatted for PostgreSQL
    const formattedPreferences = {
      ...preferences,
      selectedStates: preferences.selectedStates || existing?.selectedStates || [],
    };

    // Set override flags when custom colors are saved
    if (preferences.lightModeColors) {
      formattedPreferences.hasLightOverrides = true;
    }
    if (preferences.darkModeColors) {
      formattedPreferences.hasDarkOverrides = true;
    }

    if (existing) {
      const updated = await db
        .update(userPreferences)
        .set({
          ...formattedPreferences,
          updatedAt: new Date(),
        })
        .where(eq(userPreferences.userId, userId))
        .returning();
      return updated[0];
    } else {
      const created = await db
        .insert(userPreferences)
        .values({
          id: uuidv4(),
          userId,
          ...formattedPreferences,
        })
        .returning();
      return created[0];
    }
  }

  async getLastCategory(userId: string): Promise<string | null> {
    const preferences = await this.getUserPreferences(userId);
    return preferences?.lastCategory || null;
  }

  async setLastCategory(userId: string, category: string): Promise<UserPreferences> {
    return await this.saveUserPreferences(userId, { lastCategory: category });
  }

  async getSelectedCategory(userId: string): Promise<string | null> {
    const preferences = await this.getUserPreferences(userId);
    return preferences?.selectedCategory || null;
  }

  async setSelectedCategory(userId: string, category: string): Promise<UserPreferences> {
    return await this.saveUserPreferences(userId, { selectedCategory: category });
  }

  // Client operations
  async getAllClients(): Promise<Client[]> {
    return await db.select().from(clients).orderBy(clients.createdAt);
  }

  async getClientsByAgent(agentId: string): Promise<Client[]> {
    return await db
      .select()
      .from(clients)
      .where(eq(clients.assignedAgent, agentId))
      .orderBy(clients.createdAt);
  }

  async getFilteredClients(filters: { search?: string; nameFilter?: string; cityFilter?: string; states?: string[]; cities?: string[]; status?: string[]; showMyStoresOnly?: boolean; category?: string; agentId?: string }): Promise<Client[]> {
    let query = db.select().from(clients);
    const conditions: any[] = [];

    // Filter by agent (for agents seeing only their clients or when showMyStoresOnly is enabled)
    if (filters.agentId || filters.showMyStoresOnly) {
      const agentId = filters.agentId;
      if (agentId) {
        conditions.push(eq(clients.assignedAgent, agentId));
      }
    }

    // Filter by category
    if (filters.category) {
      conditions.push(eq(clients.category, filters.category));
    }

    // Filter by status (check JSONB data.Status field, handle as array)
    if (filters.status && Array.isArray(filters.status) && filters.status.length > 0) {
      const statusConditions = filters.status.map(status =>
        sql`${clients.data}->>'Status' = ${status} OR ${clients.data}->>'status' = ${status}`
      );
      conditions.push(sql`(${sql.join(statusConditions, sql` OR `)})`);
    }

    // Filter by states (check JSONB data.State field)
    if (filters.states && filters.states.length > 0) {
      const stateConditions = filters.states.map(state =>
        sql`${clients.data}->>'State' = ${state} OR ${clients.data}->>'state' = ${state}`
      );
      conditions.push(sql`(${sql.join(stateConditions, sql` OR `)})`);
    }

    // Filter by cities (check JSONB data.City field)
    if (filters.cities && filters.cities.length > 0) {
      const cityConditions = filters.cities.map(city =>
        sql`${clients.data}->>'City' = ${city} OR ${clients.data}->>'city' = ${city}`
      );
      conditions.push(sql`(${sql.join(cityConditions, sql` OR `)})`);
    }

    // Filter by name (check JSONB data.Name field)
    if (filters.nameFilter && filters.nameFilter.trim()) {
      const nameTerm = `%${filters.nameFilter.toLowerCase()}%`;
      conditions.push(
        sql`(
          LOWER(${clients.data}->>'Name') LIKE ${nameTerm} OR
          LOWER(${clients.data}->>'name') LIKE ${nameTerm}
        )`
      );
    }

    // Filter by city (check JSONB data.City field)
    if (filters.cityFilter && filters.cityFilter.trim()) {
      const cityTerm = `%${filters.cityFilter.toLowerCase()}%`;
      conditions.push(
        sql`(
          LOWER(${clients.data}->>'City') LIKE ${cityTerm} OR
          LOWER(${clients.data}->>'city') LIKE ${cityTerm}
        )`
      );
    }

    // Global search filter (check multiple JSONB fields)
    if (filters.search && filters.search.trim()) {
      const searchTerm = `%${filters.search.toLowerCase()}%`;
      conditions.push(
        sql`(
          LOWER(${clients.data}->>'Name') LIKE ${searchTerm} OR
          LOWER(${clients.data}->>'name') LIKE ${searchTerm} OR
          LOWER(${clients.data}->>'Email') LIKE ${searchTerm} OR
          LOWER(${clients.data}->>'email') LIKE ${searchTerm} OR
          LOWER(${clients.data}->>'Phone') LIKE ${searchTerm} OR
          LOWER(${clients.data}->>'phone') LIKE ${searchTerm} OR
          LOWER(${clients.data}->>'City') LIKE ${searchTerm} OR
          LOWER(${clients.data}->>'city') LIKE ${searchTerm}
        )`
      );
    }

    // Apply all conditions
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const results = await query.orderBy(clients.createdAt);
    
    return results;
  }

  async getClient(id: string): Promise<Client | undefined> {
    const [client] = await db.select().from(clients).where(eq(clients.id, id));
    return client;
  }

  async createClient(client: InsertClient): Promise<Client> {
    const [newClient] = await db.insert(clients).values(client).returning();
    return newClient;
  }

  async updateClient(id: string, updates: Partial<InsertClient>): Promise<Client> {
    const [updated] = await db
      .update(clients)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(clients.id, id))
      .returning();
    return updated;
  }

  async claimClient(clientId: string, agentId: string): Promise<Client> {
    const [updated] = await db
      .update(clients)
      .set({
        assignedAgent: agentId,
        claimDate: new Date(),
        status: 'claimed',
        updatedAt: new Date(),
      })
      .where(eq(clients.id, clientId))
      .returning();
    return updated;
  }

  async unclaimClient(clientId: string): Promise<Client> {
    const [updated] = await db
      .update(clients)
      .set({
        assignedAgent: null,
        claimDate: null,
        status: 'unassigned',
        updatedAt: new Date(),
      })
      .where(eq(clients.id, clientId))
      .returning();
    return updated;
  }

  async findClientByUniqueKey(key: string, value: string): Promise<Client | undefined> {
    const result = await db
      .select()
      .from(clients)
      .where(sql`${clients.data}->>${key} = ${value}`)
      .limit(1);
    return result[0];
  }

  async updateLastContactDate(clientId: string, contactDate?: Date): Promise<Client | undefined> {
    const newContactDate = contactDate || new Date();
    
    const [updated] = await db
      .update(clients)
      .set({
        lastContactDate: newContactDate,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(clients.id, clientId),
          or(
            isNull(clients.lastContactDate),
            sql`${clients.lastContactDate} < ${newContactDate}`
          )
        )
      )
      .returning();
    
    if (updated) {
      console.log(`[updateLastContactDate] Updated client ${clientId} lastContactDate to ${newContactDate}`);
    } else {
      console.log(`[updateLastContactDate] Skipped client ${clientId} - existing date is newer or client not found`);
    }
    
    return updated;
  }

  // Notes operations
  async getClientNotes(clientId: string): Promise<Note[]> {
    return await db
      .select()
      .from(notes)
      .where(eq(notes.clientId, clientId))
      .orderBy(notes.createdAt);
  }

  async createNote(note: InsertNote): Promise<Note> {
    const [newNote] = await db.insert(notes).values(note).returning();
    return newNote;
  }

  // Order operations
  async createOrder(order: InsertOrder): Promise<Order> {
    const [newOrder] = await db.insert(orders).values(order).returning();
    return newOrder;
  }

  async getOrderById(id: string): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    return order;
  }

  async updateOrder(id: string, updates: Partial<InsertOrder>): Promise<Order> {
    const [updated] = await db
      .update(orders)
      .set(updates)
      .where(eq(orders.id, id))
      .returning();
    return updated;
  }

  async getAllOrders(): Promise<Order[]> {
    return await db.select().from(orders).orderBy(orders.orderDate);
  }

  async deleteOrder(id: string): Promise<void> {
    await db.delete(orders).where(eq(orders.id, id));
  }

  // Commission operations
  async createCommission(commission: InsertCommission): Promise<Commission> {
    const [newCommission] = await db.insert(commissions).values(commission).returning();
    return newCommission;
  }

  async getCommissionsByAgent(agentId: string): Promise<Commission[]> {
    return await db
      .select()
      .from(commissions)
      .where(eq(commissions.agentId, agentId))
      .orderBy(desc(commissions.calculatedOn));
  }

  async getCommissionsByOrder(orderId: string): Promise<Commission[]> {
    return await db
      .select()
      .from(commissions)
      .where(eq(commissions.orderId, orderId));
  }

  async deleteCommissionsByOrder(orderId: string): Promise<void> {
    await db.delete(commissions).where(eq(commissions.orderId, orderId));
  }

  // CSV Upload operations
  async createCsvUpload(upload: InsertCsvUpload): Promise<CsvUpload> {
    const [newUpload] = await db.insert(csvUploads).values(upload).returning();
    return newUpload;
  }

  async getRecentCsvUploads(limit: number = 10): Promise<CsvUpload[]> {
    return await db
      .select()
      .from(csvUploads)
      .orderBy(csvUploads.uploadedAt)
      .limit(limit);
  }

  // Google Sheets operations
  async getAllActiveGoogleSheets(): Promise<GoogleSheet[]> {
    return await db
      .select()
      .from(googleSheets)
      .where(eq(googleSheets.syncStatus, 'active'))
      .orderBy(desc(googleSheets.createdAt));
  }

  async getGoogleSheetById(id: string): Promise<GoogleSheet | null> {
    const [sheet] = await db
      .select()
      .from(googleSheets)
      .where(eq(googleSheets.id, id))
      .limit(1);
    return sheet || null;
  }

  async getGoogleSheetByPurpose(purpose: string): Promise<GoogleSheet | null> {
    const [sheet] = await db
      .select()
      .from(googleSheets)
      .where(and(
        eq(googleSheets.sheetPurpose, purpose),
        eq(googleSheets.syncStatus, 'active')
      ))
      .limit(1);
    return sheet || null;
  }

  async createGoogleSheetConnection(connection: InsertGoogleSheet): Promise<GoogleSheet> {
    const [newConnection] = await db
      .insert(googleSheets)
      .values(connection)
      .returning();
    return newConnection;
  }

  async disconnectGoogleSheet(id: string): Promise<void> {
    await db
      .update(googleSheets)
      .set({ syncStatus: 'paused' })
      .where(eq(googleSheets.id, id));
  }

  async updateGoogleSheetLastSync(id: string): Promise<void> {
    await db
      .update(googleSheets)
      .set({ lastSyncedAt: new Date() })
      .where(eq(googleSheets.id, id));
  }

  async getClientByUniqueIdentifier(uniqueId: string): Promise<Client | undefined> {
    const [client] = await db
      .select()
      .from(clients)
      .where(eq(clients.uniqueIdentifier, uniqueId));
    return client;
  }

  // Dashboard operations
  async getDashboardCardsByRole(role: string): Promise<any[]> {
    const cards = await db
      .select()
      .from(dashboardCards)
      .where(eq(dashboardCards.role, role));
    return cards;
  }

  async getDashboardStats(userId: string, role: string): Promise<any> {
    if (role === 'admin') {
      const totalClients = await db.select().from(clients);
      const totalAgents = await db.select().from(users).where(eq(users.role, 'agent'));
      const totalOrders = await db.select().from(orders);
      
      return {
        totalClients: totalClients.length,
        totalAgents: totalAgents.length,
        totalOrders: totalOrders.length,
        unassignedClients: totalClients.filter(c => !c.assignedAgent).length,
      };
    } else if (role === 'agent') {
      const agentClients = await db
        .select()
        .from(clients)
        .where(eq(clients.assignedAgent, userId));
      
      const agentOrders = await db
        .select()
        .from(orders)
        .where(eq(orders.agentId, userId));
      
      return {
        myClients: agentClients.length,
        myOrders: agentOrders.length,
        claimedClients: agentClients.filter(c => c.status === 'claimed').length,
      };
    }
    
    return {};
  }

  // Helper methods
  async getUserById(id: string): Promise<User | undefined> {
    return this.getUser(id);
  }

  async getOrdersByClient(clientId: string): Promise<Order[]> {
    return await db
      .select()
      .from(orders)
      .where(eq(orders.clientId, clientId))
      .orderBy(desc(orders.orderDate));
  }

  // Reminder operations
  async getRemindersByUser(userId: string): Promise<Reminder[]> {
    return await db
      .select()
      .from(reminders)
      .where(eq(reminders.userId, userId))
      .orderBy(desc(reminders.nextTrigger));
  }

  async getRemindersByClient(clientId: string): Promise<Reminder[]> {
    return await db
      .select()
      .from(reminders)
      .where(eq(reminders.clientId, clientId))
      .orderBy(desc(reminders.nextTrigger));
  }

  async getReminderById(id: string): Promise<Reminder | undefined> {
    const [reminder] = await db
      .select()
      .from(reminders)
      .where(eq(reminders.id, id));
    return reminder;
  }

  async createReminder(reminder: InsertReminder): Promise<Reminder> {
    const [newReminder] = await db
      .insert(reminders)
      .values(reminder)
      .returning();
    return newReminder;
  }

  async updateReminder(id: string, updates: Partial<InsertReminder>): Promise<Reminder> {
    const [updated] = await db
      .update(reminders)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(reminders.id, id))
      .returning();
    return updated;
  }

  async deleteReminder(id: string): Promise<void> {
    await db
      .delete(reminders)
      .where(eq(reminders.id, id));
  }

  // Notification operations
  async getNotificationsByUser(userId: string): Promise<Notification[]> {
    return await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  }

  async getNotificationById(id: string): Promise<Notification | undefined> {
    const [notification] = await db
      .select()
      .from(notifications)
      .where(eq(notifications.id, id));
    return notification;
  }

  async markNotificationAsRead(id: string): Promise<Notification> {
    const [updated] = await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, id))
      .returning();
    return updated;
  }

  async markNotificationAsResolved(id: string): Promise<Notification> {
    const [updated] = await db
      .update(notifications)
      .set({ isResolved: true, resolvedAt: new Date() })
      .where(eq(notifications.id, id))
      .returning();
    return updated;
  }

  async deleteNotification(id: string): Promise<void> {
    await db
      .delete(notifications)
      .where(eq(notifications.id, id));
  }

  // Widget layout operations
  async getWidgetLayout(userId: string, dashboardType: string): Promise<WidgetLayout | undefined> {
    const [layout] = await db
      .select()
      .from(widgetLayouts)
      .where(and(
        eq(widgetLayouts.userId, userId),
        eq(widgetLayouts.dashboardType, dashboardType),
        eq(widgetLayouts.isDefault, true)
      ))
      .limit(1);
    return layout;
  }

  async saveWidgetLayout(layout: InsertWidgetLayout): Promise<WidgetLayout> {
    // If this is set as default, unset other defaults for this user/dashboard type
    if (layout.isDefault) {
      await db
        .update(widgetLayouts)
        .set({ isDefault: false })
        .where(and(
          eq(widgetLayouts.userId, layout.userId),
          eq(widgetLayouts.dashboardType, layout.dashboardType || 'sales')
        ));
    }

    // Check if a layout already exists for this user/dashboard type
    const [existing] = await db
      .select()
      .from(widgetLayouts)
      .where(and(
        eq(widgetLayouts.userId, layout.userId),
        eq(widgetLayouts.dashboardType, layout.dashboardType || 'sales'),
        eq(widgetLayouts.isDefault, true)
      ))
      .limit(1);

    if (existing) {
      // Update existing layout
      const [updated] = await db
        .update(widgetLayouts)
        .set({ ...layout, updatedAt: new Date() })
        .where(eq(widgetLayouts.id, existing.id))
        .returning();
      return updated;
    } else {
      // Create new layout
      const [newLayout] = await db
        .insert(widgetLayouts)
        .values(layout)
        .returning();
      return newLayout;
    }
  }

  // OpenAI operations
  async getOpenaiSettings(): Promise<OpenaiSettings | undefined> {
    const [settings] = await db
      .select()
      .from(openaiSettings)
      .where(eq(openaiSettings.isActive, true))
      .limit(1);
    return settings;
  }

  async saveOpenaiSettings(settings: Partial<InsertOpenaiSettings>): Promise<OpenaiSettings> {
    const existing = await this.getOpenaiSettings();
    
    if (existing) {
      const [updated] = await db
        .update(openaiSettings)
        .set({ ...settings, updatedAt: new Date() })
        .where(eq(openaiSettings.id, existing.id))
        .returning();
      return updated;
    } else {
      const [newSettings] = await db
        .insert(openaiSettings)
        .values(settings as InsertOpenaiSettings)
        .returning();
      return newSettings;
    }
  }

  // Knowledge base operations (OpenAI Sales Assistant)
  async getAllKnowledgeBaseFiles(): Promise<any[]> {
    const results = await db
      .select({
        id: knowledgeBaseFiles.id,
        originalName: knowledgeBaseFiles.originalName,
        openaiFileId: knowledgeBaseFiles.openaiFileId,
        category: knowledgeBaseFiles.category,
        productCategory: knowledgeBaseFiles.productCategory,
        description: knowledgeBaseFiles.description,
        fileSize: knowledgeBaseFiles.fileSize,
        processingStatus: knowledgeBaseFiles.processingStatus,
        uploadedAt: knowledgeBaseFiles.uploadedAt,
        isActive: knowledgeBaseFiles.isActive,
      })
      .from(knowledgeBaseFiles)
      .where(eq(knowledgeBaseFiles.isActive, true))
      .orderBy(desc(knowledgeBaseFiles.uploadedAt));
    
    return results;
  }

  async getKnowledgeBaseFile(id: string): Promise<KnowledgeBaseFile | undefined> {
    const [file] = await db
      .select()
      .from(knowledgeBaseFiles)
      .where(eq(knowledgeBaseFiles.id, id));
    return file;
  }

  async createKnowledgeBaseFile(file: InsertKnowledgeBaseFile): Promise<KnowledgeBaseFile> {
    const [newFile] = await db
      .insert(knowledgeBaseFiles)
      .values(file)
      .returning();
    return newFile;
  }

  async updateKnowledgeBaseFileStatus(id: string, status: string): Promise<KnowledgeBaseFile> {
    const [updated] = await db
      .update(knowledgeBaseFiles)
      .set({ processingStatus: status })
      .where(eq(knowledgeBaseFiles.id, id))
      .returning();
    return updated;
  }

  async updateKnowledgeBaseFile(id: string, updates: Partial<InsertKnowledgeBaseFile>): Promise<KnowledgeBaseFile> {
    const [updated] = await db
      .update(knowledgeBaseFiles)
      .set(updates)
      .where(eq(knowledgeBaseFiles.id, id))
      .returning();
    return updated;
  }

  async deleteKnowledgeBaseFile(id: string): Promise<void> {
    await db
      .update(knowledgeBaseFiles)
      .set({ isActive: false })
      .where(eq(knowledgeBaseFiles.id, id));
  }

  // Chat operations
  async getChatHistory(userId: string, limit: number = 50): Promise<ChatMessage[]> {
    return await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.userId, userId))
      .orderBy(desc(chatMessages.createdAt))
      .limit(limit);
  }

  async saveChatMessage(message: InsertChatMessage): Promise<ChatMessage> {
    const [newMessage] = await db
      .insert(chatMessages)
      .values(message)
      .returning();
    return newMessage;
  }

  async clearChatHistory(userId: string): Promise<void> {
    await db
      .delete(chatMessages)
      .where(eq(chatMessages.userId, userId));
  }

  async getConversationMessages(conversationId: string): Promise<ChatMessage[]> {
    return await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.conversationId, conversationId))
      .orderBy(chatMessages.createdAt);
  }

  // Project operations
  async getProjects(userId: string): Promise<Project[]> {
    return await db
      .select()
      .from(projects)
      .where(eq(projects.userId, userId))
      .orderBy(desc(projects.createdAt));
  }

  async createProject(project: InsertProject): Promise<Project> {
    const [newProject] = await db
      .insert(projects)
      .values(project)
      .returning();
    return newProject;
  }

  async updateProject(id: string, updates: Partial<InsertProject>): Promise<Project> {
    const [updated] = await db
      .update(projects)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();
    return updated;
  }

  async deleteProject(id: string): Promise<void> {
    await db
      .delete(projects)
      .where(eq(projects.id, id));
  }

  // Conversation operations
  async getConversations(userId: string): Promise<Conversation[]> {
    return await db
      .select()
      .from(conversations)
      .where(eq(conversations.userId, userId))
      .orderBy(desc(conversations.updatedAt));
  }

  async getConversation(id: string): Promise<Conversation | undefined> {
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, id));
    return conversation;
  }

  async createConversation(conversation: InsertConversation): Promise<Conversation> {
    const [newConversation] = await db
      .insert(conversations)
      .values(conversation)
      .returning();
    return newConversation;
  }

  async updateConversation(id: string, updates: Partial<InsertConversation>): Promise<Conversation> {
    const [updated] = await db
      .update(conversations)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(conversations.id, id))
      .returning();
    return updated;
  }

  async deleteConversation(id: string): Promise<void> {
    await db
      .delete(conversations)
      .where(eq(conversations.id, id));
  }

  async moveConversationToProject(conversationId: string, projectId: string | null): Promise<Conversation> {
    const [updated] = await db
      .update(conversations)
      .set({ projectId, updatedAt: new Date() })
      .where(eq(conversations.id, conversationId))
      .returning();
    return updated;
  }

  // Template operations
  async getUserTemplates(userId: string): Promise<Template[]> {
    return await db
      .select()
      .from(templates)
      .where(eq(templates.userId, userId))
      .orderBy(desc(templates.createdAt));
  }

  async getTemplate(id: string): Promise<Template | undefined> {
    const [template] = await db
      .select()
      .from(templates)
      .where(eq(templates.id, id));
    return template;
  }

  async createTemplate(template: InsertTemplate): Promise<Template> {
    const [newTemplate] = await db
      .insert(templates)
      .values(template)
      .returning();
    return newTemplate;
  }

  async updateTemplate(id: string, updates: Partial<InsertTemplate>): Promise<Template> {
    const [updated] = await db
      .update(templates)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(templates.id, id))
      .returning();
    return updated;
  }

  async deleteTemplate(id: string): Promise<void> {
    await db
      .delete(templates)
      .where(eq(templates.id, id));
  }

  async getAllTemplateTags(): Promise<string[]> {
    const allTemplates = await db.select().from(templates);
    const tagsSet = new Set<string>();
    
    allTemplates.forEach(template => {
      if (template.tags && Array.isArray(template.tags)) {
        template.tags.forEach(tag => {
          if (tag && tag.trim()) {
            tagsSet.add(tag.trim());
          }
        });
      }
    });
    
    return Array.from(tagsSet).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
  }

  // User Tag operations
  async getUserTags(userId: string): Promise<UserTag[]> {
    return await db
      .select()
      .from(userTags)
      .where(eq(userTags.userId, userId))
      .orderBy(userTags.tag);
  }

  async addUserTag(userId: string, tag: string): Promise<UserTag> {
    const trimmedTag = tag.trim().toLowerCase();
    
    const existing = await db
      .select()
      .from(userTags)
      .where(and(eq(userTags.userId, userId), eq(userTags.tag, trimmedTag)))
      .limit(1);
    
    if (existing.length > 0) {
      return existing[0];
    }
    
    const [newTag] = await db
      .insert(userTags)
      .values({ userId, tag: trimmedTag })
      .returning();
    return newTag;
  }

  async removeUserTag(userId: string, tag: string): Promise<void> {
    await db
      .delete(userTags)
      .where(and(eq(userTags.userId, userId), eq(userTags.tag, tag.trim().toLowerCase())));
  }

  async removeUserTagById(userId: string, id: string): Promise<void> {
    await db
      .delete(userTags)
      .where(and(eq(userTags.userId, userId), eq(userTags.id, id)));
  }

  // Category operations
  async getAllCategories(): Promise<Category[]> {
    return await db
      .select()
      .from(categories)
      .orderBy(categories.displayOrder, categories.name);
  }

  async getActiveCategories(): Promise<Category[]> {
    return await db
      .select()
      .from(categories)
      .where(eq(categories.isActive, true))
      .orderBy(categories.displayOrder, categories.name);
  }

  async getCategory(id: string): Promise<Category | undefined> {
    const [category] = await db
      .select()
      .from(categories)
      .where(eq(categories.id, id));
    return category;
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const [newCategory] = await db
      .insert(categories)
      .values(category)
      .returning();
    return newCategory;
  }

  async updateCategory(id: string, updates: Partial<InsertCategory>): Promise<Category> {
    const [updated] = await db
      .update(categories)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(categories.id, id))
      .returning();
    return updated;
  }

  async deleteCategory(id: string): Promise<void> {
    await db
      .delete(categories)
      .where(eq(categories.id, id));
  }

  // Imported Places operations - for duplicate detection in Map Search
  async checkImportedPlaces(placeIds: string[]): Promise<Set<string>> {
    if (placeIds.length === 0) return new Set();
    
    const results = await db
      .select({ placeId: importedPlaces.placeId })
      .from(importedPlaces)
      .where(inArray(importedPlaces.placeId, placeIds));
    
    return new Set(results.map(r => r.placeId));
  }

  async recordImportedPlace(placeId: string): Promise<void> {
    await db
      .insert(importedPlaces)
      .values({ placeId })
      .onConflictDoNothing(); // Ignore if already exists
  }

  // Search History operations - for Map Search
  async getAllSearchHistory(): Promise<SearchHistory[]> {
    const history = await db
      .select()
      .from(searchHistory)
      .orderBy(desc(searchHistory.searchedAt));
    return history;
  }

  async recordSearch(
    businessType: string, 
    city: string, 
    state: string, 
    country: string,
    excludedKeywords: string[] = [],
    excludedTypes: string[] = [],
    category?: string
  ): Promise<SearchHistory> {
    // Check if this exact search already exists
    const [existing] = await db
      .select()
      .from(searchHistory)
      .where(
        and(
          eq(searchHistory.businessType, businessType),
          eq(searchHistory.city, city),
          eq(searchHistory.state, state),
          eq(searchHistory.country, country)
        )
      );

    if (existing) {
      // Update existing entry: increment count, update timestamp, and update excluded keywords/types and category
      const [updated] = await db
        .update(searchHistory)
        .set({
          searchedAt: new Date(),
          searchCount: existing.searchCount + 1,
          excludedKeywords: excludedKeywords.length > 0 ? excludedKeywords : existing.excludedKeywords,
          excludedTypes: excludedTypes.length > 0 ? excludedTypes : existing.excludedTypes,
          category: category || existing.category,
        })
        .where(eq(searchHistory.id, existing.id))
        .returning();
      return updated;
    } else {
      // Create new entry
      const [newEntry] = await db
        .insert(searchHistory)
        .values({
          businessType,
          city,
          state,
          country,
          excludedKeywords,
          excludedTypes,
          category,
          searchCount: 1,
        })
        .returning();
      return newEntry;
    }
  }

  async deleteSearchHistory(id: string): Promise<void> {
    await db.delete(searchHistory).where(eq(searchHistory.id, id));
  }

  // Saved Exclusions operations
  async getAllSavedExclusions(): Promise<SavedExclusion[]> {
    const exclusions = await db
      .select()
      .from(savedExclusions)
      .orderBy(savedExclusions.type, savedExclusions.value);
    return exclusions;
  }

  async getSavedExclusionsByType(type: 'keyword' | 'place_type'): Promise<SavedExclusion[]> {
    const exclusions = await db
      .select()
      .from(savedExclusions)
      .where(eq(savedExclusions.type, type))
      .orderBy(savedExclusions.value);
    return exclusions;
  }

  async createSavedExclusion(exclusion: InsertSavedExclusion): Promise<SavedExclusion> {
    // Check if this exclusion already exists
    const [existing] = await db
      .select()
      .from(savedExclusions)
      .where(
        and(
          eq(savedExclusions.type, exclusion.type),
          eq(savedExclusions.value, exclusion.value)
        )
      );

    if (existing) {
      return existing;
    }

    const [newExclusion] = await db
      .insert(savedExclusions)
      .values(exclusion)
      .returning();
    return newExclusion;
  }

  async deleteSavedExclusion(id: string): Promise<void> {
    await db.delete(savedExclusions).where(eq(savedExclusions.id, id));
  }

  async updateUserActiveExclusions(userId: string, activeKeywords: string[], activeTypes: string[]): Promise<UserPreferences> {
    const [prefs] = await db
      .update(userPreferences)
      .set({
        activeExcludedKeywords: activeKeywords,
        activeExcludedTypes: activeTypes,
      })
      .where(eq(userPreferences.userId, userId))
      .returning();

    if (!prefs) {
      // Create new preferences if they don't exist
      const [newPrefs] = await db
        .insert(userPreferences)
        .values({
          userId,
          activeExcludedKeywords: activeKeywords,
          activeExcludedTypes: activeTypes,
        })
        .returning();
      return newPrefs;
    }

    return prefs;
  }

  // Status operations
  async getAllStatuses(): Promise<Status[]> {
    const allStatuses = await db
      .select()
      .from(statuses)
      .orderBy(statuses.displayOrder);
    return allStatuses;
  }

  async getActiveStatuses(): Promise<Status[]> {
    const activeStatuses = await db
      .select()
      .from(statuses)
      .where(eq(statuses.isActive, true))
      .orderBy(statuses.displayOrder);
    return activeStatuses;
  }

  async getStatus(id: string): Promise<Status | undefined> {
    const [status] = await db
      .select()
      .from(statuses)
      .where(eq(statuses.id, id));
    return status;
  }

  async createStatus(status: InsertStatus): Promise<Status> {
    const [newStatus] = await db
      .insert(statuses)
      .values(status)
      .returning();
    return newStatus;
  }

  async updateStatus(id: string, updates: Partial<InsertStatus>): Promise<Status> {
    const [updated] = await db
      .update(statuses)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(statuses.id, id))
      .returning();
    return updated;
  }

  async deleteStatus(id: string): Promise<void> {
    await db.delete(statuses).where(eq(statuses.id, id));
  }

  async reorderStatuses(updates: { id: string; displayOrder: number }[]): Promise<void> {
    // Update each status with its new display order
    for (const update of updates) {
      await db
        .update(statuses)
        .set({
          displayOrder: update.displayOrder,
          updatedAt: new Date(),
        })
        .where(eq(statuses.id, update.id));
    }
  }

  // Ticket operations
  async getAllTickets(): Promise<Ticket[]> {
    return await db
      .select()
      .from(tickets)
      .orderBy(desc(tickets.createdAt));
  }

  async getUserTickets(userId: string): Promise<Ticket[]> {
    return await db
      .select()
      .from(tickets)
      .where(eq(tickets.userId, userId))
      .orderBy(desc(tickets.createdAt));
  }

  async getTicket(id: string): Promise<Ticket | undefined> {
    const [ticket] = await db
      .select()
      .from(tickets)
      .where(eq(tickets.id, id));
    return ticket;
  }

  async createTicket(ticket: InsertTicket): Promise<Ticket> {
    const [newTicket] = await db
      .insert(tickets)
      .values(ticket)
      .returning();
    return newTicket;
  }

  async updateTicket(id: string, updates: Partial<InsertTicket>): Promise<Ticket> {
    const [updated] = await db
      .update(tickets)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(tickets.id, id))
      .returning();
    return updated;
  }

  async getUnreadAdminCount(): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(tickets)
      .where(eq(tickets.isUnreadByAdmin, true));
    return result[0]?.count || 0;
  }

  async markTicketReadByAdmin(id: string): Promise<Ticket> {
    const [updated] = await db
      .update(tickets)
      .set({ isUnreadByAdmin: false })
      .where(eq(tickets.id, id))
      .returning();
    return updated;
  }

  async markTicketReadByUser(id: string): Promise<Ticket> {
    const [updated] = await db
      .update(tickets)
      .set({ isUnreadByUser: false })
      .where(eq(tickets.id, id))
      .returning();
    return updated;
  }

  // Ticket Reply operations
  async getTicketReplies(ticketId: string): Promise<TicketReply[]> {
    return await db
      .select()
      .from(ticketReplies)
      .where(eq(ticketReplies.ticketId, ticketId))
      .orderBy(ticketReplies.createdAt);
  }

  async createTicketReply(reply: InsertTicketReply): Promise<TicketReply> {
    const [newReply] = await db
      .insert(ticketReplies)
      .values(reply)
      .returning();
    
    // Update the ticket's lastReplyAt and mark as replied
    await db
      .update(tickets)
      .set({
        lastReplyAt: new Date(),
        status: 'replied',
        updatedAt: new Date(),
      })
      .where(eq(tickets.id, reply.ticketId));
    
    return newReply;
  }

  // Call History operations
  async createCallHistory(callData: InsertCallHistory): Promise<CallHistory> {
    const [newCall] = await db
      .insert(callHistory)
      .values(callData)
      .returning();
    return newCall;
  }

  async getUserCallHistory(userId: string): Promise<CallHistory[]> {
    return await db
      .select()
      .from(callHistory)
      .where(eq(callHistory.agentId, userId))
      .orderBy(desc(callHistory.calledAt));
  }

  async getAllCallHistory(agentId?: string): Promise<CallHistory[]> {
    if (agentId) {
      return await db
        .select()
        .from(callHistory)
        .where(eq(callHistory.agentId, agentId))
        .orderBy(desc(callHistory.calledAt));
    }
    return await db
      .select()
      .from(callHistory)
      .orderBy(desc(callHistory.calledAt));
  }

  // Email Draft operations
  async createEmailDraft(draftData: InsertEmailDraft): Promise<EmailDraft> {
    const [newDraft] = await db
      .insert(emailDrafts)
      .values(draftData)
      .returning();
    return newDraft;
  }

  async getUserEmailDrafts(userId: string): Promise<EmailDraft[]> {
    return await db
      .select()
      .from(emailDrafts)
      .where(eq(emailDrafts.userId, userId))
      .orderBy(desc(emailDrafts.createdAt));
  }

  // Drive Folder operations
  async getAllDriveFolders(): Promise<DriveFolder[]> {
    return await db.select().from(driveFolders);
  }

  async getDriveFolder(id: string): Promise<DriveFolder | undefined> {
    const [folder] = await db.select().from(driveFolders).where(eq(driveFolders.id, id));
    return folder;
  }

  async getDriveFolderByName(name: string): Promise<DriveFolder | undefined> {
    const [folder] = await db.select().from(driveFolders).where(eq(driveFolders.name, name));
    return folder;
  }

  async createDriveFolder(folder: InsertDriveFolder): Promise<DriveFolder> {
    const [newFolder] = await db.insert(driveFolders).values(folder).returning();
    return newFolder;
  }

  async updateDriveFolder(id: string, updates: Partial<InsertDriveFolder>): Promise<DriveFolder> {
    const [updated] = await db
      .update(driveFolders)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(driveFolders.id, id))
      .returning();
    return updated;
  }

  async deleteDriveFolder(id: string): Promise<void> {
    await db.delete(driveFolders).where(eq(driveFolders.id, id));
  }
  
  async getFollowUpClients(userId: string, userRole: string): Promise<{
    claimedUntouched: Array<Client & { daysSinceContact: number }>;
    interestedGoingCold: Array<Client & { daysSinceContact: number }>;
    closedWonReorder: Array<Client & { daysSinceOrder: number }>;
  }> {
    const now = new Date();
    
    // Base query - get clients for this agent (or all if admin)
    const baseQuery = userRole === 'admin' 
      ? db.select().from(clients)
      : db.select().from(clients).where(eq(clients.assignedAgent, userId));
    
    const allClients = await baseQuery;
    
    // Filter 1: Claimed but never contacted OR contacted but ghosted (>7 days)
    const claimedUntouched = allClients
      .filter(c => {
        const status = (c.data?.Status || c.data?.status || '').toLowerCase();
        
        // Scenario 1: Status = 'claimed' and no contact yet
        if (status === 'claimed' && !c.lastContactDate) {
          return true;
        }
        
        // Scenario 2: Status = 'contacted' but last contact > 7 days ago
        if (status === 'contacted' && c.lastContactDate) {
          const daysSinceContact = Math.floor((now.getTime() - new Date(c.lastContactDate).getTime()) / (1000 * 60 * 60 * 24));
          return daysSinceContact > 7;
        }
        
        return false;
      })
      .map(c => ({
        ...c,
        daysSinceContact: c.lastContactDate 
          ? Math.floor((now.getTime() - new Date(c.lastContactDate).getTime()) / (1000 * 60 * 60 * 24))
          : (c.claimDate 
              ? Math.floor((now.getTime() - new Date(c.claimDate).getTime()) / (1000 * 60 * 60 * 24))
              : 0)
      }));
    
    // Filter 2: Interested leads going cold (interested, sample sent, follow up, warm)
    const interestedGoingCold = allClients
      .filter(c => {
        const status = (c.data?.Status || c.data?.status || '').toLowerCase();
        return c.lastContactDate && 
               !c.firstOrderDate && 
               (status === 'interested' || status === 'sample sent' || status === 'follow up' || status === 'warm');
      })
      .map(c => ({
        ...c,
        daysSinceContact: Math.floor((now.getTime() - new Date(c.lastContactDate!).getTime()) / (1000 * 60 * 60 * 24))
      }));
    
    // Filter 3: Closed-won but hasn't reordered
    const closedWonReorder = allClients
      .filter(c => c.firstOrderDate && c.firstOrderDate === c.lastOrderDate)
      .map(c => ({
        ...c,
        daysSinceOrder: Math.floor((now.getTime() - new Date(c.firstOrderDate!).getTime()) / (1000 * 60 * 60 * 24))
      }));
    
    return {
      claimedUntouched,
      interestedGoingCold,
      closedWonReorder
    };
  }

  // ElevenLabs settings operations
  async getElevenLabsConfig(): Promise<{ apiKey: string; twilioNumber?: string; webhookSecret?: string; phoneNumberId?: string } | undefined> {
    const [config] = await db.select().from(elevenLabsConfig).limit(1);
    if (!config) return undefined;
    return {
      apiKey: config.apiKey,
      twilioNumber: config.twilioNumber || undefined,
      webhookSecret: config.webhookSecret || undefined,
      phoneNumberId: config.phoneNumberId || undefined
    };
  }

  async updateElevenLabsConfig(configData: { apiKey?: string; twilioNumber?: string; webhookSecret?: string; phoneNumberId?: string }): Promise<void> {
    // Get existing config first to preserve values
    const existing = await this.getElevenLabsConfig();
    
    // Merge with existing values (only update provided fields)
    const merged = {
      apiKey: configData.apiKey !== undefined ? configData.apiKey : (existing?.apiKey ?? ''),
      twilioNumber: configData.twilioNumber !== undefined ? configData.twilioNumber : (existing?.twilioNumber ?? null),
      webhookSecret: configData.webhookSecret !== undefined ? configData.webhookSecret : (existing?.webhookSecret ?? null),
      phoneNumberId: configData.phoneNumberId !== undefined ? configData.phoneNumberId : (existing?.phoneNumberId ?? null)
    };
    
    // Delete old config and insert new (single row table)
    await db.delete(elevenLabsConfig);
    await db.insert(elevenLabsConfig).values(merged);
  }

  // ElevenLabs Phone Numbers operations
  async getAllElevenLabsPhoneNumbers(): Promise<ElevenLabsPhoneNumber[]> {
    return await db.select().from(elevenLabsPhoneNumbers);
  }

  async getElevenLabsPhoneNumber(phoneNumberId: string): Promise<ElevenLabsPhoneNumber | undefined> {
    const [phone] = await db.select().from(elevenLabsPhoneNumbers).where(eq(elevenLabsPhoneNumbers.phoneNumberId, phoneNumberId));
    return phone;
  }

  async upsertElevenLabsPhoneNumber(phoneData: InsertElevenLabsPhoneNumber): Promise<ElevenLabsPhoneNumber> {
    // Check if phone number already exists
    const existing = await this.getElevenLabsPhoneNumber(phoneData.phoneNumberId);
    
    if (existing) {
      // Update existing phone number
      const [updated] = await db.update(elevenLabsPhoneNumbers)
        .set({ ...phoneData, updatedAt: new Date() })
        .where(eq(elevenLabsPhoneNumbers.phoneNumberId, phoneData.phoneNumberId))
        .returning();
      return updated;
    } else {
      // Insert new phone number
      const [newPhone] = await db.insert(elevenLabsPhoneNumbers).values(phoneData).returning();
      return newPhone;
    }
  }

  async deleteElevenLabsPhoneNumber(phoneNumberId: string): Promise<void> {
    await db.delete(elevenLabsPhoneNumbers).where(eq(elevenLabsPhoneNumbers.phoneNumberId, phoneNumberId));
  }

  async getAllElevenLabsAgents(): Promise<ElevenLabsAgent[]> {
    return await db.select().from(elevenLabsAgents);
  }

  async getElevenLabsAgent(id: string): Promise<ElevenLabsAgent | undefined> {
    const [agent] = await db.select().from(elevenLabsAgents).where(eq(elevenLabsAgents.id, id));
    return agent;
  }

  async getDefaultElevenLabsAgent(): Promise<ElevenLabsAgent | undefined> {
    const [agent] = await db.select().from(elevenLabsAgents).where(eq(elevenLabsAgents.isDefault, true)).limit(1);
    return agent;
  }

  async createElevenLabsAgent(agent: InsertElevenLabsAgent): Promise<ElevenLabsAgent> {
    const [newAgent] = await db.insert(elevenLabsAgents).values(agent).returning();
    return newAgent;
  }

  async updateElevenLabsAgent(id: string, updates: Partial<InsertElevenLabsAgent>): Promise<ElevenLabsAgent> {
    const [updated] = await db.update(elevenLabsAgents)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(elevenLabsAgents.id, id))
      .returning();
    return updated;
  }

  async deleteElevenLabsAgent(id: string): Promise<void> {
    await db.delete(elevenLabsAgents).where(eq(elevenLabsAgents.id, id));
  }

  async setDefaultElevenLabsAgent(id: string): Promise<void> {
    // First, set all agents to non-default
    await db.update(elevenLabsAgents).set({ isDefault: false });
    // Then set the specified agent as default
    await db.update(elevenLabsAgents)
      .set({ isDefault: true })
      .where(eq(elevenLabsAgents.id, id));
  }

  // Voice AI Call Sessions operations
  async createCallSession(session: InsertCallSession): Promise<CallSession> {
    const [newSession] = await db.insert(callSessions).values(session).returning();
    return newSession;
  }

  async getCallSession(id: string): Promise<CallSession | undefined> {
    const [session] = await db.select().from(callSessions).where(eq(callSessions.id, id));
    return session;
  }

  async getCallSessionByConversationId(conversationId: string): Promise<CallSession | undefined> {
    const [session] = await db.select().from(callSessions).where(eq(callSessions.conversationId, conversationId));
    return session;
  }

  async getCallSessionByCallSid(callSid: string): Promise<CallSession | undefined> {
    const [session] = await db.select().from(callSessions).where(eq(callSessions.callSid, callSid));
    return session;
  }

  async getCallSessions(filters?: { clientId?: string; initiatedByUserId?: string; status?: string }): Promise<CallSession[]> {
    const conditions = [];
    if (filters?.clientId) conditions.push(eq(callSessions.clientId, filters.clientId));
    if (filters?.initiatedByUserId) conditions.push(eq(callSessions.initiatedByUserId, filters.initiatedByUserId));
    if (filters?.status) conditions.push(eq(callSessions.status, filters.status));

    if (conditions.length === 0) {
      return await db.select().from(callSessions).orderBy(desc(callSessions.startedAt));
    }
    return await db.select().from(callSessions).where(and(...conditions)).orderBy(desc(callSessions.startedAt));
  }

  async updateCallSession(id: string, updates: Partial<InsertCallSession>): Promise<CallSession> {
    const [updated] = await db.update(callSessions)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(callSessions.id, id))
      .returning();
    return updated;
  }

  async updateCallSessionByConversationId(conversationId: string, updates: Partial<InsertCallSession>): Promise<CallSession> {
    const [updated] = await db.update(callSessions)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(callSessions.conversationId, conversationId))
      .returning();
    return updated;
  }

  // Call Transcripts operations
  async createCallTranscript(transcript: InsertCallTranscript): Promise<CallTranscript> {
    const [newTranscript] = await db.insert(callTranscripts).values(transcript).returning();
    return newTranscript;
  }

  async getCallTranscripts(conversationId: string): Promise<CallTranscript[]> {
    return await db.select().from(callTranscripts)
      .where(eq(callTranscripts.conversationId, conversationId))
      .orderBy(callTranscripts.timeInCallSecs);
  }

  async bulkCreateCallTranscripts(transcripts: InsertCallTranscript[]): Promise<void> {
    if (transcripts.length === 0) return;
    await db.insert(callTranscripts).values(transcripts);
  }

  async deleteCallTranscripts(conversationId: string): Promise<void> {
    await db.delete(callTranscripts).where(eq(callTranscripts.conversationId, conversationId));
  }

  // AI Insights helper operations
  async getCallsWithTranscripts(filters: { startDate?: string; endDate?: string; agentId?: string; limit?: number; onlyUnanalyzed?: boolean; conversationIds?: string[] }): Promise<Array<{
    session: CallSession;
    transcripts: CallTranscript[];
    client: Client;
  }>> {
    const limit = filters.limit || 100;
    
    // Build query conditions
    const conditions = [
      eq(callSessions.status, 'completed')
    ];
    
    // If conversationIds provided, fetch those specific calls
    if (filters.conversationIds && filters.conversationIds.length > 0) {
      conditions.push(inArray(callSessions.conversationId, filters.conversationIds));
    } else {
      // Otherwise use date/agent/analyzed filters
      if (filters.startDate) {
        conditions.push(sql`${callSessions.startedAt} >= ${new Date(filters.startDate)}`);
      }
      if (filters.endDate) {
        conditions.push(sql`${callSessions.startedAt} <= ${new Date(filters.endDate)}`);
      }
      if (filters.agentId) {
        conditions.push(eq(callSessions.agentId, filters.agentId));
      }
      if (filters.onlyUnanalyzed) {
        conditions.push(sql`${callSessions.lastAnalyzedAt} IS NULL`);
      }
    }

    // Get call sessions (ordered oldest to newest for chronological batch analysis)
    const sessions = await db.select()
      .from(callSessions)
      .where(and(...conditions))
      .orderBy(callSessions.startedAt) // ASC for oldest-first analysis
      .limit(limit);

    // Get transcripts and clients for each session
    const results = await Promise.all(
      sessions.map(async (session) => {
        const transcripts = await this.getCallTranscripts(session.conversationId!);
        const client = await this.getClient(session.clientId);
        
        return {
          session,
          transcripts,
          client: client!,
        };
      })
    );

    return results;
  }

  async markCallsAsAnalyzed(conversationIds: string[]): Promise<void> {
    if (conversationIds.length === 0) return;
    
    await db.update(callSessions)
      .set({ lastAnalyzedAt: new Date() })
      .where(inArray(callSessions.conversationId, conversationIds));
  }

  async nukeAllAnalysis(): Promise<{ deletedInsights: number; deletedProposals: number; resetCalls: number }> {
    // Delete all KB change proposals
    const deletedProposals = await db.delete(kbChangeProposals).returning();
    
    // Delete all AI insights and related records (cascade will handle objections, patterns, recommendations)
    const deletedInsights = await db.delete(aiInsights).returning();
    
    // Reset all call sessions' last_analyzed_at to null so they can be re-analyzed
    const resetCalls = await db.update(callSessions)
      .set({ lastAnalyzedAt: null })
      .returning();
    
    return {
      deletedInsights: deletedInsights.length,
      deletedProposals: deletedProposals.length,
      resetCalls: resetCalls.length,
    };
  }

  // Call Events operations
  async createCallEvent(event: InsertCallEvent): Promise<CallEvent> {
    const [newEvent] = await db.insert(callEvents).values(event).returning();
    return newEvent;
  }

  async getCallEvents(conversationId: string): Promise<CallEvent[]> {
    return await db.select().from(callEvents)
      .where(eq(callEvents.conversationId, conversationId))
      .orderBy(callEvents.createdAt);
  }

  // Call Campaigns operations
  async createCallCampaign(campaign: InsertCallCampaign): Promise<CallCampaign> {
    const [newCampaign] = await db.insert(callCampaigns).values(campaign).returning();
    return newCampaign;
  }

  async getCallCampaign(id: string): Promise<CallCampaign | undefined> {
    const [campaign] = await db.select().from(callCampaigns).where(eq(callCampaigns.id, id));
    return campaign;
  }

  async getCallCampaigns(filters?: { createdByUserId?: string; status?: string }): Promise<CallCampaign[]> {
    const conditions = [];
    if (filters?.createdByUserId) conditions.push(eq(callCampaigns.createdByUserId, filters.createdByUserId));
    if (filters?.status) conditions.push(eq(callCampaigns.status, filters.status));

    if (conditions.length === 0) {
      return await db.select().from(callCampaigns).orderBy(desc(callCampaigns.createdAt));
    }
    return await db.select().from(callCampaigns).where(and(...conditions)).orderBy(desc(callCampaigns.createdAt));
  }

  async updateCallCampaign(id: string, updates: Partial<InsertCallCampaign>): Promise<CallCampaign> {
    const [updated] = await db.update(callCampaigns)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(callCampaigns.id, id))
      .returning();
    return updated;
  }

  // Call Campaign Targets operations
  async createCallCampaignTarget(target: InsertCallCampaignTarget): Promise<CallCampaignTarget> {
    const [newTarget] = await db.insert(callCampaignTargets).values(target).returning();
    return newTarget;
  }

  async getCallCampaignTarget(id: string): Promise<CallCampaignTarget | undefined> {
    const [target] = await db.select().from(callCampaignTargets).where(eq(callCampaignTargets.id, id));
    return target;
  }

  async getCallCampaignTargets(campaignId: string): Promise<CallCampaignTarget[]> {
    return await db.select().from(callCampaignTargets)
      .where(eq(callCampaignTargets.campaignId, campaignId));
  }

  async getCallTargetsBySession(conversationId: string): Promise<CallCampaignTarget[]> {
    return await db.select().from(callCampaignTargets)
      .where(eq(callCampaignTargets.externalConversationId, conversationId));
  }

  async getCallTargetsReadyForCalling(): Promise<CallCampaignTarget[]> {
    const now = new Date();
    return await db.select().from(callCampaignTargets)
      .where(
        and(
          eq(callCampaignTargets.targetStatus, 'pending'),
          or(
            lte(callCampaignTargets.nextAttemptAt, now),
            isNull(callCampaignTargets.nextAttemptAt)
          )
        )
      )
      .orderBy(callCampaignTargets.nextAttemptAt)
      .limit(50);
  }

  async updateCallCampaignTarget(id: string, updates: Partial<InsertCallCampaignTarget>): Promise<CallCampaignTarget> {
    const [updated] = await db.update(callCampaignTargets)
      .set(updates)
      .where(eq(callCampaignTargets.id, id))
      .returning();
    return updated;
  }

  async incrementCampaignCalls(campaignId: string, type: 'successful' | 'failed'): Promise<void> {
    const campaign = await this.getCallCampaign(campaignId);
    if (!campaign) return;

    const updates: any = {
      callsCompleted: (campaign.callsCompleted || 0) + 1,
      updatedAt: new Date(),
    };

    if (type === 'successful') {
      updates.callsSuccessful = (campaign.callsSuccessful || 0) + 1;
    } else {
      updates.callsFailed = (campaign.callsFailed || 0) + 1;
    }

    await db.update(callCampaigns)
      .set(updates)
      .where(eq(callCampaigns.id, campaignId));
  }

  // AI Insights operations
  async saveAiInsight(
    insight: InsertAiInsight, 
    objections: InsertAiInsightObjection[], 
    patterns: InsertAiInsightPattern[], 
    recommendations: InsertAiInsightRecommendation[]
  ): Promise<AiInsight> {
    const [savedInsight] = await db.insert(aiInsights).values(insight).returning();
    
    if (objections.length > 0) {
      await db.insert(aiInsightObjections).values(
        objections.map(obj => ({ ...obj, insightId: savedInsight.id }))
      );
    }
    
    if (patterns.length > 0) {
      await db.insert(aiInsightPatterns).values(
        patterns.map(pat => ({ ...pat, insightId: savedInsight.id }))
      );
    }
    
    if (recommendations.length > 0) {
      await db.insert(aiInsightRecommendations).values(
        recommendations.map(rec => ({ ...rec, insightId: savedInsight.id }))
      );
    }
    
    return savedInsight;
  }

  async getAiInsightById(id: string): Promise<(AiInsight & { 
    objections: AiInsightObjection[]; 
    patterns: AiInsightPattern[]; 
    recommendations: AiInsightRecommendation[] 
  }) | undefined> {
    const [insight] = await db.select().from(aiInsights).where(eq(aiInsights.id, id));
    if (!insight) {
      return undefined;
    }

    const [objections, patterns, recommendations] = await Promise.all([
      db.select().from(aiInsightObjections).where(eq(aiInsightObjections.insightId, insight.id)),
      db.select().from(aiInsightPatterns).where(eq(aiInsightPatterns.insightId, insight.id)),
      db.select().from(aiInsightRecommendations).where(eq(aiInsightRecommendations.insightId, insight.id))
    ]);

    return {
      ...insight,
      objections,
      patterns,
      recommendations
    };
  }

  async getAiInsightsHistory(filters?: { 
    agentId?: string; 
    startDate?: Date; 
    endDate?: Date; 
    limit?: number 
  }): Promise<Array<AiInsight & { 
    objections: AiInsightObjection[]; 
    patterns: AiInsightPattern[]; 
    recommendations: AiInsightRecommendation[] 
  }>> {
    let query = db.select().from(aiInsights);
    
    const conditions = [];
    if (filters?.agentId) {
      conditions.push(eq(aiInsights.agentId, filters.agentId));
    }
    if (filters?.startDate) {
      conditions.push(gte(aiInsights.dateRangeStart, filters.startDate));
    }
    if (filters?.endDate) {
      conditions.push(lte(aiInsights.dateRangeEnd, filters.endDate));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    const insights = await query.orderBy(desc(aiInsights.analyzedAt)).limit(filters?.limit || 50);
    
    const enrichedInsights = await Promise.all(
      insights.map(async (insight) => {
        const [objections, patterns, recommendations] = await Promise.all([
          db.select().from(aiInsightObjections).where(eq(aiInsightObjections.insightId, insight.id)),
          db.select().from(aiInsightPatterns).where(eq(aiInsightPatterns.insightId, insight.id)),
          db.select().from(aiInsightRecommendations).where(eq(aiInsightRecommendations.insightId, insight.id))
        ]);
        
        return {
          ...insight,
          objections,
          patterns,
          recommendations
        };
      })
    );
    
    return enrichedInsights;
  }

  // KB Management operations
  async getAllKbFiles(): Promise<KbFile[]> {
    return await db.select().from(kbFiles).orderBy(kbFiles.filename);
  }

  async getKbFileById(id: string): Promise<KbFile | undefined> {
    const [file] = await db.select().from(kbFiles).where(eq(kbFiles.id, id));
    return file;
  }

  async getKbFileByFilename(filename: string): Promise<KbFile | undefined> {
    const [file] = await db.select().from(kbFiles).where(eq(kbFiles.filename, filename));
    return file;
  }

  async getKbFileByElevenLabsDocId(docId: string): Promise<KbFile | undefined> {
    const [file] = await db.select().from(kbFiles).where(eq(kbFiles.elevenlabsDocId, docId));
    return file;
  }

  async createKbFile(file: InsertKbFile): Promise<KbFile> {
    const [created] = await db.insert(kbFiles).values(file).returning();
    return created;
  }

  async updateKbFile(id: string, updates: Partial<InsertKbFile>): Promise<KbFile> {
    const [updated] = await db
      .update(kbFiles)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(kbFiles.id, id))
      .returning();
    return updated;
  }

  async createKbFileVersion(version: InsertKbFileVersion): Promise<KbFileVersion> {
    const [created] = await db.insert(kbFileVersions).values(version).returning();
    return created;
  }

  async getKbFileVersions(fileId: string): Promise<KbFileVersion[]> {
    return await db
      .select()
      .from(kbFileVersions)
      .where(eq(kbFileVersions.kbFileId, fileId))
      .orderBy(desc(kbFileVersions.versionNumber));
  }

  async getKbFileVersion(id: string): Promise<KbFileVersion | undefined> {
    const [version] = await db.select().from(kbFileVersions).where(eq(kbFileVersions.id, id));
    return version;
  }

  async createKbProposal(proposal: InsertKbChangeProposal): Promise<KbChangeProposal> {
    const [created] = await db.insert(kbChangeProposals).values(proposal).returning();
    return created;
  }

  async getKbProposals(filters?: { status?: string; kbFileId?: string }): Promise<KbChangeProposal[]> {
    let query = db.select().from(kbChangeProposals);
    
    const conditions = [];
    if (filters?.status) {
      conditions.push(eq(kbChangeProposals.status, filters.status));
    }
    if (filters?.kbFileId) {
      conditions.push(eq(kbChangeProposals.kbFileId, filters.kbFileId));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    return await query.orderBy(desc(kbChangeProposals.createdAt));
  }

  async getKbProposalById(id: string): Promise<KbChangeProposal | undefined> {
    const [proposal] = await db.select().from(kbChangeProposals).where(eq(kbChangeProposals.id, id));
    return proposal;
  }

  async updateKbProposal(id: string, updates: Partial<InsertKbChangeProposal>): Promise<KbChangeProposal> {
    const [updated] = await db
      .update(kbChangeProposals)
      .set(updates)
      .where(eq(kbChangeProposals.id, id))
      .returning();
    return updated;
  }

  async deleteKbProposal(id: string): Promise<boolean> {
    const result = await db.delete(kbChangeProposals).where(eq(kbChangeProposals.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async deleteAllKbProposals(): Promise<number> {
    const result = await db.delete(kbChangeProposals);
    return result.rowCount ?? 0;
  }

  // Analysis Jobs operations
  async createAnalysisJob(job: InsertAnalysisJob): Promise<AnalysisJob> {
    const [newJob] = await db.insert(analysisJobs).values(job).returning();
    return newJob;
  }

  async getAnalysisJob(id: string): Promise<AnalysisJob | undefined> {
    const [job] = await db.select().from(analysisJobs).where(eq(analysisJobs.id, id));
    return job;
  }

  async getRunningAnalysisJob(): Promise<AnalysisJob | undefined> {
    const [job] = await db.select()
      .from(analysisJobs)
      .where(eq(analysisJobs.status, 'running'))
      .orderBy(analysisJobs.startedAt)
      .limit(1);
    return job;
  }

  async getAnalysisJobs(filters?: { 
    status?: string; 
    agentId?: string; 
    limit?: number 
  }): Promise<AnalysisJob[]> {
    let query = db.select().from(analysisJobs);

    if (filters?.status) {
      query = query.where(eq(analysisJobs.status, filters.status)) as any;
    }
    if (filters?.agentId) {
      query = query.where(eq(analysisJobs.agentId, filters.agentId)) as any;
    }

    query = query.orderBy(desc(analysisJobs.createdAt)) as any;

    if (filters?.limit) {
      query = query.limit(filters.limit) as any;
    }

    return await query;
  }

  async updateAnalysisJob(id: string, updates: Partial<InsertAnalysisJob>): Promise<AnalysisJob> {
    const [updated] = await db
      .update(analysisJobs)
      .set(updates)
      .where(eq(analysisJobs.id, id))
      .returning();
    return updated;
  }

  // OpenAI Assistant Management operations
  async getAllAssistants(): Promise<any[]> {
    return await db.select().from(openaiAssistants).where(eq(openaiAssistants.isActive, true));
  }

  async getAssistantById(id: string): Promise<any | undefined> {
    const [assistant] = await db.select().from(openaiAssistants).where(eq(openaiAssistants.id, id));
    return assistant;
  }

  async getAssistantBySlug(slug: string): Promise<any | undefined> {
    const [assistant] = await db.select().from(openaiAssistants).where(eq(openaiAssistants.slug, slug));
    return assistant;
  }

  async updateAssistant(id: string, updates: any): Promise<any> {
    const [updated] = await db
      .update(openaiAssistants)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(openaiAssistants.id, id))
      .returning();
    return updated;
  }

  async getAssistantFiles(assistantId: string): Promise<any[]> {
    return await db
      .select()
      .from(openaiAssistantFiles)
      .where(eq(openaiAssistantFiles.assistantId, assistantId))
      .orderBy(desc(openaiAssistantFiles.uploadedAt));
  }

  async getAssistantFileById(id: string): Promise<any | undefined> {
    const [file] = await db.select().from(openaiAssistantFiles).where(eq(openaiAssistantFiles.id, id));
    return file;
  }

  async createAssistantFile(file: any): Promise<any> {
    const [created] = await db.insert(openaiAssistantFiles).values(file).returning();
    return created;
  }

  async deleteAssistantFileByAssistantId(fileId: string, assistantId: string): Promise<boolean> {
    const result = await db
      .delete(openaiAssistantFiles)
      .where(
        and(
          eq(openaiAssistantFiles.id, fileId),
          eq(openaiAssistantFiles.assistantId, assistantId)
        )
      )
      .returning();
    return result.length > 0;
  }
  
  // Non-duplicate operations
  async markAsNotDuplicate(link1: string, link2: string, userId: string): Promise<NonDuplicate> {
    // Normalize order: always store smaller link first
    const [first, second] = link1 < link2 ? [link1, link2] : [link2, link1];
    
    const [result] = await db
      .insert(nonDuplicates)
      .values({
        link1: first,
        link2: second,
        markedByUserId: userId,
      })
      .onConflictDoNothing()
      .returning();
    
    if (!result) {
      // Already exists, fetch it
      const [existing] = await db
        .select()
        .from(nonDuplicates)
        .where(
          and(
            eq(nonDuplicates.link1, first),
            eq(nonDuplicates.link2, second)
          )
        );
      return existing;
    }
    
    return result;
  }

  async isMarkedAsNotDuplicate(link1: string, link2: string): Promise<boolean> {
    const [first, second] = link1 < link2 ? [link1, link2] : [link2, link1];
    
    const [result] = await db
      .select()
      .from(nonDuplicates)
      .where(
        and(
          eq(nonDuplicates.link1, first),
          eq(nonDuplicates.link2, second)
        )
      )
      .limit(1);
    
    return !!result;
  }

  async getAllNonDuplicates(): Promise<NonDuplicate[]> {
    return await db.select().from(nonDuplicates);
  }

  async removeNonDuplicateMark(link1: string, link2: string): Promise<void> {
    const [first, second] = link1 < link2 ? [link1, link2] : [link2, link1];
    
    await db
      .delete(nonDuplicates)
      .where(
        and(
          eq(nonDuplicates.link1, first),
          eq(nonDuplicates.link2, second)
        )
      );
  }

  // Background Audio Settings operations
  async getBackgroundAudioSettings(): Promise<BackgroundAudioSettings | undefined> {
    const [settings] = await db.select().from(backgroundAudioSettings).limit(1);
    return settings;
  }

  async updateBackgroundAudioSettings(settings: InsertBackgroundAudioSettings): Promise<BackgroundAudioSettings> {
    const existing = await this.getBackgroundAudioSettings();
    
    if (existing) {
      const [updated] = await db
        .update(backgroundAudioSettings)
        .set({ ...settings, updatedAt: new Date() })
        .where(eq(backgroundAudioSettings.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(backgroundAudioSettings)
        .values(settings)
        .returning();
      return created;
    }
  }

  // Voice Proxy Session operations
  async createVoiceProxySession(session: InsertVoiceProxySession): Promise<VoiceProxySession> {
    const [created] = await db
      .insert(voiceProxySessions)
      .values(session)
      .returning();
    return created;
  }

  async getVoiceProxySession(streamSid: string): Promise<VoiceProxySession | undefined> {
    const [session] = await db
      .select()
      .from(voiceProxySessions)
      .where(eq(voiceProxySessions.streamSid, streamSid))
      .limit(1);
    return session;
  }

  async getActiveVoiceProxySessions(): Promise<VoiceProxySession[]> {
    return await db
      .select()
      .from(voiceProxySessions)
      .where(eq(voiceProxySessions.status, 'active'));
  }

  async updateVoiceProxySession(id: string, updates: Partial<InsertVoiceProxySession>): Promise<VoiceProxySession> {
    const [updated] = await db
      .update(voiceProxySessions)
      .set(updates)
      .where(eq(voiceProxySessions.id, id))
      .returning();
    return updated;
  }

  async endVoiceProxySession(streamSid: string): Promise<void> {
    await db
      .update(voiceProxySessions)
      .set({ status: 'completed', endedAt: new Date() })
      .where(eq(voiceProxySessions.streamSid, streamSid));
  }

  // E-Hub Settings operations
  async getEhubSettings(): Promise<EhubSettings | undefined> {
    const [settings] = await db
      .select()
      .from(ehubSettings)
      .limit(1);
    return settings;
  }

  async updateEhubSettings(updates: Partial<InsertEhubSettings>): Promise<EhubSettings> {
    // Get existing settings or create if none exist
    const existing = await this.getEhubSettings();
    
    if (existing) {
      const [updated] = await db
        .update(ehubSettings)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(ehubSettings.id, existing.id))
        .returning();
      return updated;
    } else {
      // Create default settings with provided updates
      const [created] = await db
        .insert(ehubSettings)
        .values({
          minDelayMinutes: 1,
          maxDelayMinutes: 3,
          dailyEmailLimit: 200,
          sendingHoursStart: 9,
          sendingHoursEnd: 14,
          skipWeekends: true,
          ...updates,
        })
        .returning();
      return created;
    }
  }

  // E-Hub Sequence operations
  async createSequence(sequence: InsertSequence): Promise<Sequence> {
    const [created] = await db
      .insert(sequences)
      .values(sequence)
      .returning();
    return created;
  }

  async getSequence(id: string): Promise<Sequence | undefined> {
    const [sequence] = await db
      .select()
      .from(sequences)
      .where(eq(sequences.id, id))
      .limit(1);
    return sequence;
  }

  async listSequences(filters?: { createdBy?: string; status?: string }): Promise<Sequence[]> {
    let query = db.select().from(sequences);
    
    const conditions = [];
    if (filters?.createdBy) {
      conditions.push(eq(sequences.createdBy, filters.createdBy));
    }
    if (filters?.status) {
      conditions.push(eq(sequences.status, filters.status));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    return await query.orderBy(desc(sequences.createdAt));
  }

  async updateSequence(id: string, updates: Partial<InsertSequence>): Promise<Sequence | undefined> {
    const [updated] = await db
      .update(sequences)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(sequences.id, id))
      .returning();
    return updated;
  }

  async deleteSequence(id: string): Promise<boolean> {
    const result = await db.delete(sequences).where(eq(sequences.id, id)).returning();
    return result.length > 0;
  }

  async updateSequenceStats(id: string, stats: { sentCount?: number; failedCount?: number; repliedCount?: number; lastSentAt?: Date }): Promise<Sequence> {
    const [updated] = await db
      .update(sequences)
      .set({ ...stats, updatedAt: new Date() })
      .where(eq(sequences.id, id))
      .returning();
    return updated;
  }

  // E-Hub Sequence Recipients operations
  async addRecipients(recipients: InsertSequenceRecipient[]): Promise<SequenceRecipient[]> {
    if (recipients.length === 0) return [];
    
    const created = await db
      .insert(sequenceRecipients)
      .values(recipients)
      .returning();
    return created;
  }

  async getRecipients(sequenceId: string, filters?: { status?: string; limit?: number }): Promise<SequenceRecipient[]> {
    let query = db
      .select()
      .from(sequenceRecipients)
      .where(eq(sequenceRecipients.sequenceId, sequenceId));
    
    if (filters?.status) {
      query = query.where(
        and(
          eq(sequenceRecipients.sequenceId, sequenceId),
          eq(sequenceRecipients.status, filters.status)
        )
      ) as any;
    }
    
    if (filters?.limit) {
      query = query.limit(filters.limit) as any;
    }
    
    return await query.orderBy(desc(sequenceRecipients.createdAt));
  }

  async getRecipient(id: string): Promise<SequenceRecipient | undefined> {
    const [recipient] = await db
      .select()
      .from(sequenceRecipients)
      .where(eq(sequenceRecipients.id, id))
      .limit(1);
    return recipient;
  }

  async getNextRecipientsToSend(limit: number): Promise<SequenceRecipient[]> {
    const now = new Date();
    
    // Two-tier priority queue: follow-ups first, then fresh emails
    
    // Stage 1: Get all due follow-ups (currentStep > 0)
    const followUps = await db
      .select()
      .from(sequenceRecipients)
      .where(
        and(
          eq(sequenceRecipients.status, 'in_sequence'),
          gt(sequenceRecipients.currentStep, 0),
          or(
            isNull(sequenceRecipients.nextSendAt),
            lte(sequenceRecipients.nextSendAt, now)
          )
        )
      )
      .orderBy(sequenceRecipients.nextSendAt)
      .limit(limit);
    
    // Stage 2: If we haven't filled the quota, get fresh emails (currentStep = 0)
    const remaining = limit - followUps.length;
    let freshEmails: SequenceRecipient[] = [];
    
    if (remaining > 0) {
      freshEmails = await db
        .select()
        .from(sequenceRecipients)
        .where(
          and(
            eq(sequenceRecipients.status, 'pending'),
            eq(sequenceRecipients.currentStep, 0),
            or(
              isNull(sequenceRecipients.nextSendAt),
              lte(sequenceRecipients.nextSendAt, now)
            )
          )
        )
        .orderBy(sequenceRecipients.nextSendAt)
        .limit(remaining);
    }
    
    // Merge: follow-ups first, then fresh emails
    return [...followUps, ...freshEmails];
  }

  async getQueueView(): Promise<Array<SequenceRecipient & { sequenceName: string }>> {
    // Get all pending/in_sequence recipients with sequence name, ordered by nextSendAt
    const results = await db
      .select({
        id: sequenceRecipients.id,
        sequenceId: sequenceRecipients.sequenceId,
        sequenceName: sequences.name,
        email: sequenceRecipients.email,
        name: sequenceRecipients.name,
        status: sequenceRecipients.status,
        currentStep: sequenceRecipients.currentStep,
        nextSendAt: sequenceRecipients.nextSendAt,
        lastStepSentAt: sequenceRecipients.lastStepSentAt,
        sentAt: sequenceRecipients.sentAt,
        businessHours: sequenceRecipients.businessHours,
        timezone: sequenceRecipients.timezone,
        salesSummary: sequenceRecipients.salesSummary,
        threadId: sequenceRecipients.threadId,
        createdAt: sequenceRecipients.createdAt,
        updatedAt: sequenceRecipients.updatedAt,
      })
      .from(sequenceRecipients)
      .leftJoin(sequences, eq(sequenceRecipients.sequenceId, sequences.id))
      .where(
        or(
          eq(sequenceRecipients.status, 'pending'),
          eq(sequenceRecipients.status, 'in_sequence')
        )
      )
      .orderBy(sequenceRecipients.nextSendAt);
    
    return results as Array<SequenceRecipient & { sequenceName: string }>;
  }

  async updateRecipientStatus(id: string, updates: Partial<InsertSequenceRecipient>): Promise<SequenceRecipient> {
    const [updated] = await db
      .update(sequenceRecipients)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(sequenceRecipients.id, id))
      .returning();
    return updated;
  }

  async findRecipientByEmail(sequenceId: string, email: string): Promise<SequenceRecipient | undefined> {
    const [recipient] = await db
      .select()
      .from(sequenceRecipients)
      .where(
        and(
          eq(sequenceRecipients.sequenceId, sequenceId),
          eq(sequenceRecipients.email, email)
        )
      )
      .limit(1);
    return recipient;
  }

  // E-Hub Sequence Steps operations
  async createSequenceStep(step: InsertSequenceStep): Promise<SequenceStep> {
    const [created] = await db
      .insert(sequenceSteps)
      .values(step)
      .returning();
    return created;
  }

  async getSequenceSteps(sequenceId: string): Promise<SequenceStep[]> {
    return await db
      .select()
      .from(sequenceSteps)
      .where(eq(sequenceSteps.sequenceId, sequenceId))
      .orderBy(sequenceSteps.stepNumber);
  }

  async updateSequenceStep(id: string, updates: Partial<InsertSequenceStep>): Promise<SequenceStep> {
    const [updated] = await db
      .update(sequenceSteps)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(sequenceSteps.id, id))
      .returning();
    return updated;
  }

  async deleteSequenceStep(id: string): Promise<boolean> {
    const result = await db.delete(sequenceSteps).where(eq(sequenceSteps.id, id)).returning();
    return result.length > 0;
  }

  async replaceSequenceSteps(sequenceId: string, stepDelays: number[]): Promise<SequenceStep[]> {
    // Validate stepDelays: non-negative and ascending
    for (let i = 0; i < stepDelays.length; i++) {
      if (stepDelays[i] < 0) {
        throw new Error(`Invalid step delay at index ${i}: must be non-negative`);
      }
      if (i > 0 && stepDelays[i] <= stepDelays[i - 1]) {
        throw new Error(`Invalid step delays: must be strictly ascending (got ${stepDelays[i - 1]} then ${stepDelays[i]})`);
      }
    }

    // Use transaction to delete and recreate steps
    return await db.transaction(async (tx) => {
      // Delete existing steps
      await tx.delete(sequenceSteps).where(eq(sequenceSteps.sequenceId, sequenceId));

      // Create new steps from delays
      if (stepDelays.length === 0) {
        return [];
      }

      const newSteps = stepDelays.map((delayDays, index) => ({
        sequenceId,
        stepNumber: index + 1,
        delayDays,
      }));

      const created = await tx.insert(sequenceSteps).values(newSteps).returning();

      // Update sequence with new stepDelays array
      await tx
        .update(sequences)
        .set({ stepDelays, updatedAt: new Date() })
        .where(eq(sequences.id, sequenceId));

      return created;
    });
  }

  // E-Hub Sequence Recipient Messages operations
  async createRecipientMessage(message: InsertSequenceRecipientMessage): Promise<SequenceRecipientMessage> {
    const [created] = await db
      .insert(sequenceRecipientMessages)
      .values(message)
      .returning();
    return created;
  }

  async getRecipientMessages(recipientId: string): Promise<SequenceRecipientMessage[]> {
    return await db
      .select()
      .from(sequenceRecipientMessages)
      .where(eq(sequenceRecipientMessages.recipientId, recipientId))
      .orderBy(sequenceRecipientMessages.sentAt);
  }

  // E-Hub Strategy Chat operations
  async appendSequenceStrategyMessages(
    sequenceId: string,
    messages: Array<{ role: 'user' | 'assistant'; content: string; createdBy?: string }>,
    threadId?: string
  ): Promise<Sequence> {
    const timestamp = new Date().toISOString();
    
    // Generate message objects with IDs and timestamps
    const newMessages = messages.map(msg => ({
      id: crypto.randomUUID(),
      role: msg.role,
      content: msg.content,
      createdAt: timestamp,
      createdBy: msg.createdBy,
    }));

    // Update sequence with appended messages using raw SQL for JSONB manipulation
    // Preserve or update threadId
    const result = await db.execute(sql`
      UPDATE sequences
      SET 
        strategy_transcript = jsonb_build_object(
          'messages', 
          COALESCE(strategy_transcript->'messages', '[]'::jsonb) || ${JSON.stringify(newMessages)}::jsonb,
          'lastUpdatedAt',
          ${timestamp}::text,
          'summary',
          COALESCE(strategy_transcript->'summary', 'null'::jsonb),
          'threadId',
          ${threadId ? sql`to_jsonb(${threadId}::text)` : sql`COALESCE(strategy_transcript->'threadId', 'null'::jsonb)`}
        ),
        updated_at = NOW()
      WHERE id = ${sequenceId}
      RETURNING *
    `);

    if (!result || !result.rows || result.rows.length === 0) {
      throw new Error(`Sequence ${sequenceId} not found`);
    }

    return result.rows[0] as Sequence;
  }

  // Test Email Sends operations
  async createTestEmailSend(testSend: InsertTestEmailSend): Promise<TestEmailSend> {
    const [created] = await db.insert(testEmailSends).values(testSend).returning();
    return created;
  }

  async updateTestEmailSendStatus(id: string, updates: Partial<InsertTestEmailSend>): Promise<TestEmailSend> {
    const [updated] = await db
      .update(testEmailSends)
      .set(updates)
      .where(eq(testEmailSends.id, id))
      .returning();
    return updated;
  }

  async getTestEmailSendByThreadId(threadId: string): Promise<TestEmailSend | undefined> {
    const [testSend] = await db
      .select()
      .from(testEmailSends)
      .where(eq(testEmailSends.gmailThreadId, threadId))
      .limit(1);
    return testSend;
  }

  async getTestEmailSendById(id: string): Promise<TestEmailSend | undefined> {
    const [testSend] = await db
      .select()
      .from(testEmailSends)
      .where(eq(testEmailSends.id, id))
      .limit(1);
    return testSend;
  }

  async listTestEmailSendsForUser(userId: string): Promise<TestEmailSend[]> {
    return await db
      .select()
      .from(testEmailSends)
      .where(eq(testEmailSends.createdBy, userId))
      .orderBy(desc(testEmailSends.createdAt))
      .limit(50); // Limit to most recent 50 test sends
  }
}

export const storage = new DatabaseStorage();
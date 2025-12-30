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
  userTenants,
  tenants,
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
  type Tenant,
  type InsertTenant,
  tenantUserInvites,
  type TenantUserInvite,
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
  sequenceScheduledSends,
  sequenceRecipientMessages,
  testEmailSends,
  testDataNukeLog,
  dailySendSlots,
  type DailySendSlot,
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
  type SequenceScheduledSend,
  type InsertSequenceScheduledSend,
  type InsertTestEmailSend,
  type TestEmailSend,
  type InsertTestDataNukeLog,
  type TestDataNukeLog,
  noSendDates,
  type NoSendDate,
  type InsertNoSendDate,
  ignoredHolidays,
  type IgnoredHoliday,
  type InsertIgnoredHoliday,
  pipelines,
  pipelineStages,
  type Pipeline,
  type InsertPipeline,
  type PipelineStage,
  type InsertPipelineStage,
  tenantProjects,
  type TenantProject,
  type InsertTenantProject,
  assistantBlueprints,
  type AssistantBlueprint,
  type InsertAssistantBlueprint,
  qualificationCampaigns,
  qualificationLeads,
  type QualificationCampaign,
  type InsertQualificationCampaign,
  type QualificationLead,
  type InsertQualificationLead,
  emailAccounts,
  type EmailAccount,
  type InsertEmailAccount,
} from "@shared/schema";
import { db } from "./db";
import { eq, ne, and, or, inArray, sql, desc, lte, gte, gt, lt, isNull, isNotNull } from "drizzle-orm";
import { v4 as uuidv4 } from 'uuid';
import { addDays, addMilliseconds } from 'date-fns';

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

  // Tenant operations
  getUserDefaultTenant(userId: string): Promise<{ tenantId: string; roleInTenant: string } | undefined>;
  listTenants(): Promise<Array<Tenant & { userCount: number }>>;
  getTenantById(tenantId: string): Promise<Tenant | undefined>;
  getTenantByIdOrSlug(idOrSlug: string): Promise<Tenant | undefined>;
  createTenant(data: InsertTenant): Promise<Tenant>;
  updateTenant(tenantId: string, updates: Partial<InsertTenant>): Promise<Tenant>;
  getTenantStats(tenantId: string): Promise<{ userCount: number; clientCount: number; callCount: number }>;

  // Cross-tenant user operations (Super Admin)
  listUsersAcrossTenants(): Promise<Array<User & { tenantMemberships: Array<{ tenantId: string; tenantName: string; roleInTenant: string }> }>>;
  getUserTenantMemberships(userId: string): Promise<Array<{ tenantId: string; tenantName: string; tenantSlug: string; roleInTenant: string; isDefault: boolean }>>;
  getUserTenantRole(userId: string, tenantId: string): Promise<string | null>;
  addUserToTenant(userId: string, tenantId: string, roleInTenant: string, isDefault?: boolean): Promise<void>;
  removeUserFromTenant(userId: string, tenantId: string): Promise<void>;
  getPlatformMetrics(): Promise<{ totalTenants: number; totalUsers: number; totalClients: number; activeTenants: number }>;

  // Org Admin operations
  listTenantUsers(tenantId: string): Promise<Array<User & { roleInTenant: string; joinedAt: Date | null }>>;
  updateUserRoleInTenant(userId: string, tenantId: string, newRole: string): Promise<void>;
  getTenantSettings(tenantId: string): Promise<Tenant['settings']>;
  updateTenantSettings(tenantId: string, settings: Partial<Tenant['settings']>): Promise<Tenant>;

  // Tenant invite operations
  createTenantInvite(tenantId: string, email: string, role: string, invitedBy: string, expiresAt: Date): Promise<TenantUserInvite>;
  listTenantInvites(tenantId: string): Promise<TenantUserInvite[]>;
  getTenantInviteByToken(token: string): Promise<TenantUserInvite | undefined>;
  cancelTenantInvite(inviteId: string, tenantId: string): Promise<void>;
  acceptTenantInvite(token: string, userId: string): Promise<void>;

  // Pipeline operations
  listPipelines(tenantId: string, projectId?: string): Promise<Pipeline[]>;
  getPipelineById(pipelineId: string, tenantId: string): Promise<Pipeline | undefined>;
  getPipelineBySlug(slug: string, tenantId: string): Promise<Pipeline | undefined>;
  createPipeline(data: InsertPipeline): Promise<Pipeline>;
  updatePipeline(pipelineId: string, tenantId: string, updates: Partial<InsertPipeline>): Promise<Pipeline>;
  deletePipeline(pipelineId: string, tenantId: string): Promise<void>;
  
  // Pipeline stage operations
  listPipelineStages(pipelineId: string, tenantId: string): Promise<PipelineStage[]>;
  getPipelineStageById(stageId: string, tenantId: string): Promise<PipelineStage | undefined>;
  createPipelineStage(data: InsertPipelineStage): Promise<PipelineStage>;
  updatePipelineStage(stageId: string, tenantId: string, updates: Partial<InsertPipelineStage>): Promise<PipelineStage>;
  deletePipelineStage(stageId: string, tenantId: string): Promise<void>;
  reorderPipelineStages(pipelineId: string, tenantId: string, stageIds: string[]): Promise<void>;

  // Tenant Project operations (business projects/campaigns/cases)
  listTenantProjects(tenantId: string, status?: string): Promise<TenantProject[]>;
  getTenantProjectById(projectId: string, tenantId: string): Promise<TenantProject | undefined>;
  getTenantProjectBySlug(slug: string, tenantId: string): Promise<TenantProject | undefined>;
  getDefaultTenantProject(tenantId: string): Promise<TenantProject | undefined>;
  createTenantProject(data: InsertTenantProject): Promise<TenantProject>;
  updateTenantProject(projectId: string, tenantId: string, updates: Partial<InsertTenantProject>): Promise<TenantProject>;
  archiveTenantProject(projectId: string, tenantId: string, archivedBy: string): Promise<TenantProject>;
  restoreTenantProject(projectId: string, tenantId: string): Promise<TenantProject>;
  setDefaultTenantProject(projectId: string, tenantId: string): Promise<TenantProject>;
  deleteTenantProject(projectId: string, tenantId: string): Promise<void>;

  // Assistant Blueprint operations (reusable AI templates)
  listAssistantBlueprints(tenantId: string, blueprintType?: string): Promise<AssistantBlueprint[]>;
  getAssistantBlueprintById(blueprintId: string, tenantId: string): Promise<AssistantBlueprint | undefined>;
  createAssistantBlueprint(data: InsertAssistantBlueprint): Promise<AssistantBlueprint>;
  updateAssistantBlueprint(blueprintId: string, tenantId: string, updates: Partial<InsertAssistantBlueprint>): Promise<AssistantBlueprint>;
  deleteAssistantBlueprint(blueprintId: string, tenantId: string): Promise<void>;

  // System integrations operations
  getSystemIntegration(provider: string): Promise<SystemIntegration | undefined>;
  updateSystemIntegration(provider: string, updates: Partial<InsertSystemIntegration>): Promise<SystemIntegration>;
  deleteSystemIntegration(provider: string): Promise<void>;

  // User integrations operations
  getUserIntegration(userId: string): Promise<UserIntegration | undefined>;
  getAllUserIntegrations(): Promise<UserIntegration[]>;
  getUserIntegrationsWithGmailByTenant(tenantId: string): Promise<UserIntegration[]>;
  updateUserIntegration(userId: string, updates: Partial<InsertUserIntegration>): Promise<UserIntegration>;

  // User preferences operations
  getUserPreferences(userId: string, tenantId: string): Promise<UserPreferences | undefined>;
  saveUserPreferences(userId: string, tenantId: string, preferences: Partial<InsertUserPreferences>): Promise<UserPreferences>;
  getLastCategory(userId: string, tenantId: string): Promise<string | null>;
  setLastCategory(userId: string, tenantId: string, category: string): Promise<UserPreferences>;
  getSelectedCategory(userId: string, tenantId: string): Promise<string | null>;
  setSelectedCategory(userId: string, tenantId: string, category: string): Promise<UserPreferences>;

  // Client operations
  getAllClients(tenantId: string): Promise<Client[]>;
  getClientsByAgent(agentId: string, tenantId: string): Promise<Client[]>;
  getFilteredClients(tenantId: string, filters: { search?: string; nameFilter?: string; cityFilter?: string; states?: string[]; cities?: string[]; status?: string[]; showMyStoresOnly?: boolean; category?: string; agentId?: string; projectId?: string }): Promise<Client[]>;
  getClient(id: string, tenantId: string): Promise<Client | undefined>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: string, tenantId: string, updates: Partial<InsertClient>): Promise<Client>;
  claimClient(clientId: string, agentId: string): Promise<Client>;
  unclaimClient(clientId: string): Promise<Client>;
  findClientByUniqueKey(key: string, value: string): Promise<Client | undefined>;
  updateLastContactDate(clientId: string, contactDate?: Date): Promise<Client | undefined>;

  // Notes operations
  getClientNotes(clientId: string, tenantId: string): Promise<Note[]>;
  createNote(note: InsertNote): Promise<Note>;

  // Order operations
  createOrder(order: InsertOrder): Promise<Order>;
  getOrderById(id: string, tenantId: string): Promise<Order | undefined>;
  updateOrder(id: string, tenantId: string, updates: Partial<InsertOrder>): Promise<Order>;
  deleteOrder(id: string, tenantId: string): Promise<void>;
  getAllOrders(tenantId: string): Promise<Order[]>;

  // Commission operations
  createCommission(commission: InsertCommission): Promise<Commission>;
  getCommissionsByAgent(agentId: string, tenantId: string): Promise<Commission[]>;
  getCommissionsByOrder(orderId: string, tenantId: string): Promise<Commission[]>;
  deleteCommissionsByOrder(orderId: string, tenantId: string): Promise<void>;

  // CSV Upload operations
  createCsvUpload(upload: InsertCsvUpload): Promise<CsvUpload>;
  getRecentCsvUploads(limit: number): Promise<CsvUpload[]>;

  // Google Sheets operations
  getAllActiveGoogleSheets(tenantId: string): Promise<GoogleSheet[]>;
  getGoogleSheetById(id: string, tenantId: string): Promise<GoogleSheet | null>;
  getGoogleSheetByPurpose(purpose: string, tenantId: string): Promise<GoogleSheet | null>;
  createGoogleSheetConnection(connection: InsertGoogleSheet): Promise<GoogleSheet>;
  disconnectGoogleSheet(id: string): Promise<void>;
  updateGoogleSheetLastSync(id: string): Promise<void>;
  getClientByUniqueIdentifier(uniqueId: string): Promise<Client | undefined>;

  // Dashboard operations
  getDashboardCardsByRole(role: string): Promise<any[]>;
  getDashboardStats(userId: string, role: string): Promise<any>;

  // Helper methods
  getUserById(id: string): Promise<User | undefined>;
  getOrdersByClient(clientId: string, tenantId: string): Promise<Order[]>;

  // Reminder operations
  getRemindersByUser(userId: string, tenantId: string): Promise<Reminder[]>;
  getRemindersByClient(clientId: string, tenantId: string): Promise<Reminder[]>;
  getReminderById(id: string, tenantId: string): Promise<Reminder | undefined>;
  createReminder(reminder: InsertReminder): Promise<Reminder>;
  updateReminder(id: string, tenantId: string, updates: Partial<InsertReminder>): Promise<Reminder>;
  deleteReminder(id: string, tenantId: string): Promise<void>;

  // Notification operations
  getNotificationsByUser(userId: string, tenantId: string): Promise<Notification[]>;
  getNotificationById(id: string, tenantId: string): Promise<Notification | undefined>;
  markNotificationAsRead(id: string, tenantId: string): Promise<Notification>;
  markNotificationAsResolved(id: string, tenantId: string): Promise<Notification>;
  deleteNotification(id: string, tenantId: string): Promise<void>;

  // Widget layout operations
  getWidgetLayout(userId: string, dashboardType: string): Promise<WidgetLayout | undefined>;
  saveWidgetLayout(layout: InsertWidgetLayout): Promise<WidgetLayout>;

  // OpenAI operations
  getOpenaiSettings(tenantId: string): Promise<OpenaiSettings | undefined>;
  saveOpenaiSettings(tenantId: string, settings: Partial<InsertOpenaiSettings>): Promise<OpenaiSettings>;

  // Knowledge base operations
  getAllKnowledgeBaseFiles(tenantId: string): Promise<KnowledgeBaseFile[]>;
  getKnowledgeBaseFile(id: string, tenantId: string): Promise<KnowledgeBaseFile | undefined>;
  createKnowledgeBaseFile(file: InsertKnowledgeBaseFile): Promise<KnowledgeBaseFile>;
  updateKnowledgeBaseFileStatus(id: string, tenantId: string, status: string): Promise<KnowledgeBaseFile>;
  updateKnowledgeBaseFile(id: string, tenantId: string, updates: Partial<InsertKnowledgeBaseFile>): Promise<KnowledgeBaseFile>;
  deleteKnowledgeBaseFile(id: string, tenantId: string): Promise<void>;

  // Chat operations
  getChatHistory(userId: string, tenantId: string, limit?: number): Promise<ChatMessage[]>;
  getConversationMessages(conversationId: string, tenantId: string): Promise<ChatMessage[]>;
  saveChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  clearChatHistory(userId: string, tenantId: string): Promise<void>;

  // Project operations
  getProjects(userId: string, tenantId: string): Promise<Project[]>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: string, tenantId: string, updates: Partial<InsertProject>): Promise<Project>;
  deleteProject(id: string, tenantId: string): Promise<void>;

  // Conversation operations
  getConversations(userId: string, tenantId: string): Promise<Conversation[]>;
  getConversation(id: string, tenantId: string): Promise<Conversation | undefined>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  updateConversation(id: string, tenantId: string, updates: Partial<InsertConversation>): Promise<Conversation>;
  deleteConversation(id: string, tenantId: string): Promise<void>;
  moveConversationToProject(conversationId: string, tenantId: string, projectId: string | null): Promise<Conversation>;

  // Template operations
  getUserTemplates(userId: string, tenantId: string): Promise<Template[]>;  // Per-user templates
  getTemplate(id: string, tenantId: string): Promise<Template | undefined>;
  createTemplate(template: InsertTemplate): Promise<Template>;
  updateTemplate(id: string, tenantId: string, updates: Partial<InsertTemplate>): Promise<Template>;
  deleteTemplate(id: string, tenantId: string): Promise<void>;
  getAllTemplateTags(tenantId: string): Promise<string[]>; // Get all unique tags across all templates

  // User Tag operations
  getUserTags(userId: string): Promise<UserTag[]>;
  addUserTag(userId: string, tag: string): Promise<UserTag>;
  removeUserTag(userId: string, tag: string): Promise<void>;
  removeUserTagById(userId: string, id: string): Promise<void>;

  // Category operations
  getAllCategories(tenantId: string, projectId?: string): Promise<Category[]>;
  getActiveCategories(tenantId: string, projectId?: string): Promise<Category[]>;
  getCategory(id: string): Promise<Category | undefined>;
  getCategoryByName(tenantId: string, name: string, projectId?: string): Promise<Category | undefined>;
  getOrCreateCategoryByName(tenantId: string, name: string, projectId?: string): Promise<Category>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(id: string, updates: Partial<InsertCategory>): Promise<Category>;
  deleteCategory(id: string): Promise<void>;

  // Imported Places operations
  checkImportedPlaces(placeIds: string[]): Promise<Set<string>>;
  recordImportedPlace(placeId: string, tenantId: string): Promise<void>;

  // Search History operations
  getAllSearchHistory(): Promise<SearchHistory[]>;
  recordSearch(tenantId: string, businessType: string, city: string, state: string, country: string, excludedKeywords?: string[], excludedTypes?: string[], category?: string): Promise<SearchHistory>;
  deleteSearchHistory(id: string): Promise<void>;

  // Saved Exclusions operations
  getAllSavedExclusions(): Promise<SavedExclusion[]>;
  getSavedExclusionsByType(type: 'keyword' | 'place_type'): Promise<SavedExclusion[]>;
  createSavedExclusion(exclusion: InsertSavedExclusion): Promise<SavedExclusion>;
  deleteSavedExclusion(id: string): Promise<void>;
  updateUserActiveExclusions(userId: string, activeKeywords: string[], activeTypes: string[]): Promise<UserPreferences>;

  // Status operations
  getAllStatuses(tenantId: string): Promise<Status[]>;
  getActiveStatuses(tenantId: string): Promise<Status[]>;
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
  getUserCallHistory(userId: string, tenantId: string): Promise<CallHistory[]>;
  getAllCallHistory(tenantId: string, agentId?: string): Promise<CallHistory[]>;

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
  getElevenLabsConfig(tenantId: string): Promise<{ apiKey: string; twilioNumber?: string; webhookSecret?: string; phoneNumberId?: string; useDirectElevenLabs?: boolean } | undefined>;
  updateElevenLabsConfig(tenantId: string, config: { apiKey?: string; twilioNumber?: string; webhookSecret?: string; phoneNumberId?: string }): Promise<void>;
  updateElevenLabsConfigDirectMode(tenantId: string, useDirectElevenLabs: boolean): Promise<void>;

  // ElevenLabs Phone Numbers operations
  getAllElevenLabsPhoneNumbers(tenantId: string): Promise<ElevenLabsPhoneNumber[]>;
  getElevenLabsPhoneNumber(phoneNumberId: string, tenantId: string): Promise<ElevenLabsPhoneNumber | undefined>;
  upsertElevenLabsPhoneNumber(phoneData: InsertElevenLabsPhoneNumber): Promise<ElevenLabsPhoneNumber>;
  deleteElevenLabsPhoneNumber(phoneNumberId: string, tenantId: string): Promise<void>;

  getAllElevenLabsAgents(tenantId: string, projectId?: string): Promise<ElevenLabsAgent[]>;
  getElevenLabsAgent(id: string, tenantId: string): Promise<ElevenLabsAgent | undefined>;
  getDefaultElevenLabsAgent(tenantId: string): Promise<ElevenLabsAgent | undefined>;
  createElevenLabsAgent(agent: InsertElevenLabsAgent): Promise<ElevenLabsAgent>;
  updateElevenLabsAgent(id: string, tenantId: string, updates: Partial<InsertElevenLabsAgent>): Promise<ElevenLabsAgent>;
  deleteElevenLabsAgent(id: string, tenantId: string): Promise<void>;
  setDefaultElevenLabsAgent(id: string, tenantId: string): Promise<void>;

  // Voice AI Call Sessions operations
  createCallSession(session: InsertCallSession): Promise<CallSession>;
  getCallSession(id: string, tenantId: string): Promise<CallSession | undefined>;
  getCallSessionByConversationId(conversationId: string, tenantId: string): Promise<CallSession | undefined>;
  getCallSessionByCallSid(callSid: string, tenantId: string): Promise<CallSession | undefined>;
  getCallSessions(tenantId: string, filters?: { clientId?: string; initiatedByUserId?: string; status?: string }): Promise<CallSession[]>;
  updateCallSession(id: string, tenantId: string, updates: Partial<InsertCallSession>): Promise<CallSession>;
  updateCallSessionByConversationId(conversationId: string, tenantId: string, updates: Partial<InsertCallSession>): Promise<CallSession>;
  deleteCallSession(id: string, tenantId: string): Promise<void>;

  // Call Transcripts operations
  createCallTranscript(transcript: InsertCallTranscript): Promise<CallTranscript>;
  getCallTranscripts(conversationId: string): Promise<CallTranscript[]>;
  bulkCreateCallTranscripts(transcripts: InsertCallTranscript[]): Promise<void>;
  deleteCallTranscripts(conversationId: string): Promise<void>;

  // AI Insights helper operations
  getCallsWithTranscripts(filters: { startDate?: string; endDate?: string; agentId?: string; limit?: number; onlyUnanalyzed?: boolean; conversationIds?: string[] }): Promise<Array<{
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
  getCallCampaign(id: string, tenantId: string): Promise<CallCampaign | undefined>;
  getCallCampaigns(tenantId: string, filters?: { createdByUserId?: string; status?: string }): Promise<CallCampaign[]>;
  updateCallCampaign(id: string, tenantId: string, updates: Partial<InsertCallCampaign>): Promise<CallCampaign>;

  // Call Campaign Targets operations
  createCallCampaignTarget(target: InsertCallCampaignTarget): Promise<CallCampaignTarget>;
  getCallCampaignTarget(id: string, tenantId: string): Promise<CallCampaignTarget | undefined>;
  getCallCampaignTargets(campaignId: string, tenantId: string): Promise<CallCampaignTarget[]>;
  getCallTargetsBySession(conversationId: string, tenantId: string): Promise<CallCampaignTarget[]>;
  getCallTargetsReadyForCalling(): Promise<CallCampaignTarget[]>;
  updateCallCampaignTarget(id: string, tenantId: string, updates: Partial<InsertCallCampaignTarget>): Promise<CallCampaignTarget>;
  incrementCampaignCalls(campaignId: string, tenantId: string, type: 'successful' | 'failed'): Promise<void>;

  // Nuke call test data (for testing)
  nukeAllCallData(): Promise<{ sessionsDeleted: number; historyDeleted: number; transcriptsDeleted: number; eventsDeleted: number; targetsDeleted: number; campaignsDeleted: number }>;

  // AI Insights operations
  saveAiInsight(insight: InsertAiInsight, objections: InsertAiInsightObjection[], patterns: InsertAiInsightPattern[], recommendations: InsertAiInsightRecommendation[]): Promise<AiInsight>;
  getAiInsightById(id: string): Promise<(AiInsight & { objections: AiInsightObjection[]; patterns: AiInsightPattern[]; recommendations: AiInsightRecommendation[] }) | undefined>;
  getAiInsightsHistory(filters?: { agentId?: string; startDate?: Date; endDate?: Date; limit?: number }): Promise<Array<AiInsight & { objections: AiInsightObjection[]; patterns: AiInsightPattern[]; recommendations: AiInsightRecommendation[] }>>;

  // KB Management operations
  getAllKbFiles(tenantId: string, projectId?: string): Promise<KbFile[]>;
  getKbFileById(id: string, tenantId: string): Promise<KbFile | undefined>;
  getKbFileByFilename(filename: string, tenantId: string): Promise<KbFile | undefined>;
  getKbFileByElevenLabsDocId(docId: string, tenantId: string): Promise<KbFile | undefined>;
  createKbFile(file: InsertKbFile): Promise<KbFile>;
  updateKbFile(id: string, tenantId: string, updates: Partial<InsertKbFile>): Promise<KbFile>;
  deleteKbFile(id: string, tenantId: string): Promise<boolean>;
  createKbFileVersion(version: InsertKbFileVersion): Promise<KbFileVersion>;
  getKbFileVersions(fileId: string, tenantId: string): Promise<KbFileVersion[]>;
  getKbFileVersion(id: string, tenantId: string): Promise<KbFileVersion | undefined>;
  createKbProposal(proposal: InsertKbChangeProposal): Promise<KbChangeProposal>;
  getKbProposals(tenantId: string, filters?: { status?: string; kbFileId?: string }): Promise<KbChangeProposal[]>;
  getKbProposalById(id: string, tenantId: string): Promise<KbChangeProposal | undefined>;
  updateKbProposal(id: string, tenantId: string, updates: Partial<InsertKbChangeProposal>): Promise<KbChangeProposal>;
  deleteKbProposal(id: string, tenantId: string): Promise<boolean>;
  deleteAllKbProposals(tenantId: string): Promise<number>;

  // Analysis Jobs operations
  createAnalysisJob(job: InsertAnalysisJob): Promise<AnalysisJob>;
  getAnalysisJob(id: string): Promise<AnalysisJob | undefined>;
  getRunningAnalysisJob(): Promise<AnalysisJob | undefined>;
  getAnalysisJobs(filters?: { status?: string; agentId?: string; limit?: number }): Promise<AnalysisJob[]>;
  updateAnalysisJob(id: string, updates: Partial<InsertAnalysisJob>): Promise<AnalysisJob>;

  // OpenAI Assistant Management operations
  getAllAssistants(tenantId?: string): Promise<any[]>;
  getAssistantById(id: string): Promise<any | undefined>;
  getAssistantBySlug(slug: string, tenantId?: string): Promise<any | undefined>;
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

  // Stale target cleanup
  getStaleInProgressTargets(beforeDate: Date): Promise<any[]>;

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
  pauseRecipient(id: string): Promise<SequenceRecipient>;
  resumeRecipient(id: string): Promise<SequenceRecipient>; // Added this method to resume paused recipients
  getPausedRecipientsCount(): Promise<number>;
  getQueueTail(options?: { excludeRecipientId?: string }): Promise<Date | null>;
  getDailyScheduledCount(options?: { date?: Date; excludeRecipientId?: string }): Promise<number>;
  removeRecipient(id: string): Promise<SequenceRecipient>;
  sendRecipientNow(id: string): Promise<SequenceRecipient>;
  delayRecipient(id: string, hours: number): Promise<SequenceRecipient>;
  skipRecipientStep(id: string): Promise<SequenceRecipient>;

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
  replaceSequenceSteps(sequenceId: string, stepDelays: number[]): Promise<SequenceStep[]>;

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
  nukeTestData(userId: string, emailPattern?: string): Promise<{
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

  // Qualification Campaign operations
  listQualificationCampaigns(tenantId: string): Promise<QualificationCampaign[]>;
  getQualificationCampaign(id: string, tenantId: string): Promise<QualificationCampaign | undefined>;
  createQualificationCampaign(data: InsertQualificationCampaign): Promise<QualificationCampaign>;
  updateQualificationCampaign(id: string, tenantId: string, updates: Partial<InsertQualificationCampaign>): Promise<QualificationCampaign>;
  deleteQualificationCampaign(id: string, tenantId: string): Promise<boolean>;

  // Qualification Lead operations
  listQualificationLeads(tenantId: string, filters?: { campaignId?: string; status?: string; callStatus?: string; projectId?: string; limit?: number; offset?: number }): Promise<{ leads: QualificationLead[]; total: number }>;
  getQualificationLead(id: string, tenantId: string): Promise<QualificationLead | undefined>;
  findQualificationLeadBySourceId(tenantId: string, sourceId: string): Promise<QualificationLead | undefined>;
  createQualificationLead(data: InsertQualificationLead): Promise<QualificationLead>;
  createQualificationLeads(leads: InsertQualificationLead[]): Promise<QualificationLead[]>;
  updateQualificationLead(id: string, tenantId: string, updates: Partial<InsertQualificationLead>): Promise<QualificationLead>;
  deleteQualificationLead(id: string, tenantId: string): Promise<boolean>;
  deleteQualificationLeads(ids: string[], tenantId: string): Promise<number>;
  getQualificationLeadStats(tenantId: string, campaignId?: string, projectId?: string): Promise<{ total: number; byStatus: Record<string, number>; byCallStatus: Record<string, number>; averageScore: number | null }>;

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

  async getUserDefaultTenant(userId: string): Promise<{ tenantId: string; roleInTenant: string } | undefined> {
    // First try to find the default tenant for the user
    const [defaultTenant] = await db
      .select({ tenantId: userTenants.tenantId, roleInTenant: userTenants.roleInTenant })
      .from(userTenants)
      .where(and(eq(userTenants.userId, userId), eq(userTenants.isDefault, true)));

    if (defaultTenant) {
      return defaultTenant;
    }

    // If no default is set, return the first tenant the user belongs to
    const [firstTenant] = await db
      .select({ tenantId: userTenants.tenantId, roleInTenant: userTenants.roleInTenant })
      .from(userTenants)
      .where(eq(userTenants.userId, userId))
      .orderBy(userTenants.joinedAt);

    return firstTenant;
  }

  async listTenants(): Promise<Array<Tenant & { userCount: number }>> {
    const result = await db
      .select({
        id: tenants.id,
        name: tenants.name,
        slug: tenants.slug,
        ownerId: tenants.ownerId,
        status: tenants.status,
        settings: tenants.settings,
        createdAt: tenants.createdAt,
        updatedAt: tenants.updatedAt,
        userCount: sql<number>`CAST(COUNT(DISTINCT ${userTenants.userId}) AS INTEGER)`,
      })
      .from(tenants)
      .leftJoin(userTenants, eq(tenants.id, userTenants.tenantId))
      .groupBy(tenants.id)
      .orderBy(desc(tenants.createdAt));

    return result.map(row => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      ownerId: row.ownerId,
      status: row.status,
      settings: row.settings,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      userCount: row.userCount || 0,
    }));
  }

  async getTenantById(tenantId: string): Promise<Tenant | undefined> {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId));
    return tenant;
  }

  async getTenantByIdOrSlug(idOrSlug: string): Promise<Tenant | undefined> {
    const [tenant] = await db
      .select()
      .from(tenants)
      .where(or(eq(tenants.id, idOrSlug), eq(tenants.slug, idOrSlug)));
    return tenant;
  }

  async createTenant(data: InsertTenant): Promise<Tenant> {
    const slug = data.slug || this.generateSlugFromName(data.name);
    const [tenant] = await db
      .insert(tenants)
      .values({
        ...data,
        slug,
        status: data.status || 'active',
      })
      .returning();
    return tenant;
  }

  private generateSlugFromName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 100);
  }

  async updateTenant(tenantId: string, updates: Partial<InsertTenant>): Promise<Tenant> {
    const [tenant] = await db
      .update(tenants)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(tenants.id, tenantId))
      .returning();
    return tenant;
  }

  async getTenantStats(tenantId: string): Promise<{ userCount: number; clientCount: number; callCount: number }> {
    const [userCountResult] = await db
      .select({ count: sql<number>`CAST(COUNT(*) AS INTEGER)` })
      .from(userTenants)
      .where(eq(userTenants.tenantId, tenantId));

    const [clientCountResult] = await db
      .select({ count: sql<number>`CAST(COUNT(*) AS INTEGER)` })
      .from(clients)
      .where(eq(clients.tenantId, tenantId));

    const [callCountResult] = await db
      .select({ count: sql<number>`CAST(COUNT(*) AS INTEGER)` })
      .from(callHistory)
      .where(eq(callHistory.tenantId, tenantId));

    return {
      userCount: userCountResult?.count || 0,
      clientCount: clientCountResult?.count || 0,
      callCount: callCountResult?.count || 0,
    };
  }

  async listUsersAcrossTenants(): Promise<Array<User & { tenantMemberships: Array<{ tenantId: string; tenantName: string; roleInTenant: string }> }>> {
    const allUsers = await db
      .select()
      .from(users)
      .orderBy(desc(users.createdAt));

    const memberships = await db
      .select({
        userId: userTenants.userId,
        tenantId: userTenants.tenantId,
        tenantName: tenants.name,
        roleInTenant: userTenants.roleInTenant,
      })
      .from(userTenants)
      .innerJoin(tenants, eq(userTenants.tenantId, tenants.id));

    const membershipsByUser = new Map<string, Array<{ tenantId: string; tenantName: string; roleInTenant: string }>>();
    for (const m of memberships) {
      if (!membershipsByUser.has(m.userId)) {
        membershipsByUser.set(m.userId, []);
      }
      membershipsByUser.get(m.userId)!.push({
        tenantId: m.tenantId,
        tenantName: m.tenantName,
        roleInTenant: m.roleInTenant,
      });
    }

    return allUsers.map(user => ({
      ...user,
      tenantMemberships: membershipsByUser.get(user.id) || [],
    }));
  }

  async getUserTenantMemberships(userId: string): Promise<Array<{ tenantId: string; tenantName: string; tenantSlug: string; roleInTenant: string; isDefault: boolean }>> {
    const memberships = await db
      .select({
        tenantId: userTenants.tenantId,
        tenantName: tenants.name,
        tenantSlug: tenants.slug,
        roleInTenant: userTenants.roleInTenant,
        isDefault: userTenants.isDefault,
      })
      .from(userTenants)
      .innerJoin(tenants, eq(userTenants.tenantId, tenants.id))
      .where(eq(userTenants.userId, userId));

    return memberships.map(m => ({
      tenantId: m.tenantId,
      tenantName: m.tenantName,
      tenantSlug: m.tenantSlug,
      roleInTenant: m.roleInTenant,
      isDefault: m.isDefault ?? false,
    }));
  }

  async getUserTenantRole(userId: string, tenantId: string): Promise<string | null> {
    const [membership] = await db
      .select({ roleInTenant: userTenants.roleInTenant })
      .from(userTenants)
      .where(and(eq(userTenants.userId, userId), eq(userTenants.tenantId, tenantId)));
    return membership?.roleInTenant ?? null;
  }

  async addUserToTenant(userId: string, tenantId: string, roleInTenant: string, isDefault?: boolean): Promise<void> {
    await db
      .insert(userTenants)
      .values({
        userId,
        tenantId,
        roleInTenant,
        isDefault: isDefault ?? false,
      });
  }

  async removeUserFromTenant(userId: string, tenantId: string): Promise<void> {
    await db
      .delete(userTenants)
      .where(and(eq(userTenants.userId, userId), eq(userTenants.tenantId, tenantId)));
  }

  async getPlatformMetrics(): Promise<{ totalTenants: number; totalUsers: number; totalClients: number; activeTenants: number }> {
    const [totalTenantsResult] = await db
      .select({ count: sql<number>`CAST(COUNT(*) AS INTEGER)` })
      .from(tenants);

    const [totalUsersResult] = await db
      .select({ count: sql<number>`CAST(COUNT(*) AS INTEGER)` })
      .from(users);

    const [totalClientsResult] = await db
      .select({ count: sql<number>`CAST(COUNT(*) AS INTEGER)` })
      .from(clients);

    const [activeTenantsResult] = await db
      .select({ count: sql<number>`CAST(COUNT(*) AS INTEGER)` })
      .from(tenants)
      .where(eq(tenants.status, 'active'));

    return {
      totalTenants: totalTenantsResult?.count || 0,
      totalUsers: totalUsersResult?.count || 0,
      totalClients: totalClientsResult?.count || 0,
      activeTenants: activeTenantsResult?.count || 0,
    };
  }

  // Org Admin operations
  async listTenantUsers(tenantId: string): Promise<Array<User & { roleInTenant: string; joinedAt: Date | null }>> {
    const memberships = await db
      .select({
        userId: userTenants.userId,
        roleInTenant: userTenants.roleInTenant,
        joinedAt: userTenants.joinedAt,
      })
      .from(userTenants)
      .where(eq(userTenants.tenantId, tenantId));

    if (memberships.length === 0) return [];

    const userIds = memberships.map(m => m.userId);
    const tenantUsers = await db
      .select()
      .from(users)
      .where(inArray(users.id, userIds));

    const membershipMap = new Map(memberships.map(m => [m.userId, m]));
    return tenantUsers.map(user => ({
      ...user,
      roleInTenant: membershipMap.get(user.id)?.roleInTenant || 'agent',
      joinedAt: membershipMap.get(user.id)?.joinedAt || null,
    }));
  }

  async updateUserRoleInTenant(userId: string, tenantId: string, newRole: string): Promise<void> {
    await db
      .update(userTenants)
      .set({ roleInTenant: newRole })
      .where(and(
        eq(userTenants.userId, userId),
        eq(userTenants.tenantId, tenantId)
      ));
  }

  async getTenantSettings(tenantId: string): Promise<Tenant['settings']> {
    const [tenant] = await db
      .select({ settings: tenants.settings })
      .from(tenants)
      .where(eq(tenants.id, tenantId));
    return tenant?.settings || {};
  }

  async updateTenantSettings(tenantId: string, settings: Partial<Tenant['settings']>): Promise<Tenant> {
    const existing = await this.getTenantSettings(tenantId);
    const merged = { ...existing, ...settings };
    const [updated] = await db
      .update(tenants)
      .set({ settings: merged, updatedAt: new Date() })
      .where(eq(tenants.id, tenantId))
      .returning();
    return updated;
  }

  // Tenant invite operations
  async createTenantInvite(tenantId: string, email: string, role: string, invitedBy: string, expiresAt: Date): Promise<TenantUserInvite> {
    const inviteToken = uuidv4().replace(/-/g, '') + uuidv4().replace(/-/g, '').substring(0, 32);
    const [invite] = await db
      .insert(tenantUserInvites)
      .values({
        tenantId,
        email: email.toLowerCase(),
        role,
        inviteToken,
        invitedBy,
        expiresAt,
        status: 'pending',
      })
      .returning();
    return invite;
  }

  async listTenantInvites(tenantId: string): Promise<TenantUserInvite[]> {
    return await db
      .select()
      .from(tenantUserInvites)
      .where(eq(tenantUserInvites.tenantId, tenantId))
      .orderBy(desc(tenantUserInvites.createdAt));
  }

  async getTenantInviteByToken(token: string): Promise<TenantUserInvite | undefined> {
    const [invite] = await db
      .select()
      .from(tenantUserInvites)
      .where(eq(tenantUserInvites.inviteToken, token));
    return invite;
  }

  async cancelTenantInvite(inviteId: string, tenantId: string): Promise<void> {
    await db
      .update(tenantUserInvites)
      .set({ status: 'cancelled' })
      .where(and(
        eq(tenantUserInvites.id, inviteId),
        eq(tenantUserInvites.tenantId, tenantId)
      ));
  }

  async acceptTenantInvite(token: string, userId: string): Promise<void> {
    const invite = await this.getTenantInviteByToken(token);
    if (!invite || invite.status !== 'pending') {
      throw new Error('Invalid or expired invite');
    }
    if (new Date() > invite.expiresAt) {
      await db
        .update(tenantUserInvites)
        .set({ status: 'expired' })
        .where(eq(tenantUserInvites.id, invite.id));
      throw new Error('Invite has expired');
    }

    // Add user to tenant
    await this.addUserToTenant(userId, invite.tenantId, invite.role);

    // Mark invite as accepted
    await db
      .update(tenantUserInvites)
      .set({ status: 'accepted', acceptedAt: new Date() })
      .where(eq(tenantUserInvites.id, invite.id));
  }

  // Pipeline operations
  async listPipelines(tenantId: string, projectId?: string): Promise<Pipeline[]> {
    const conditions = [eq(pipelines.tenantId, tenantId)];
    if (projectId) {
      conditions.push(eq(pipelines.projectId, projectId));
    }
    return await db
      .select()
      .from(pipelines)
      .where(and(...conditions))
      .orderBy(pipelines.name);
  }

  async getPipelineById(pipelineId: string, tenantId: string): Promise<Pipeline | undefined> {
    const [pipeline] = await db
      .select()
      .from(pipelines)
      .where(and(eq(pipelines.id, pipelineId), eq(pipelines.tenantId, tenantId)));
    return pipeline;
  }

  async getPipelineBySlug(slug: string, tenantId: string): Promise<Pipeline | undefined> {
    const [pipeline] = await db
      .select()
      .from(pipelines)
      .where(and(eq(pipelines.slug, slug), eq(pipelines.tenantId, tenantId)));
    return pipeline;
  }

  async createPipeline(data: InsertPipeline): Promise<Pipeline> {
    const [pipeline] = await db
      .insert(pipelines)
      .values(data)
      .returning();
    return pipeline;
  }

  async updatePipeline(pipelineId: string, tenantId: string, updates: Partial<InsertPipeline>): Promise<Pipeline> {
    const [updated] = await db
      .update(pipelines)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(pipelines.id, pipelineId), eq(pipelines.tenantId, tenantId)))
      .returning();
    return updated;
  }

  async deletePipeline(pipelineId: string, tenantId: string): Promise<void> {
    await db
      .delete(pipelines)
      .where(and(eq(pipelines.id, pipelineId), eq(pipelines.tenantId, tenantId)));
  }

  // Pipeline stage operations
  async listPipelineStages(pipelineId: string, tenantId: string): Promise<PipelineStage[]> {
    return await db
      .select()
      .from(pipelineStages)
      .where(and(eq(pipelineStages.pipelineId, pipelineId), eq(pipelineStages.tenantId, tenantId)))
      .orderBy(pipelineStages.stageOrder);
  }

  async getPipelineStageById(stageId: string, tenantId: string): Promise<PipelineStage | undefined> {
    const [stage] = await db
      .select()
      .from(pipelineStages)
      .where(and(eq(pipelineStages.id, stageId), eq(pipelineStages.tenantId, tenantId)));
    return stage;
  }

  async createPipelineStage(data: InsertPipelineStage): Promise<PipelineStage> {
    const [stage] = await db
      .insert(pipelineStages)
      .values(data)
      .returning();
    return stage;
  }

  async updatePipelineStage(stageId: string, tenantId: string, updates: Partial<InsertPipelineStage>): Promise<PipelineStage> {
    const [updated] = await db
      .update(pipelineStages)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(pipelineStages.id, stageId), eq(pipelineStages.tenantId, tenantId)))
      .returning();
    return updated;
  }

  async deletePipelineStage(stageId: string, tenantId: string): Promise<void> {
    await db
      .delete(pipelineStages)
      .where(and(eq(pipelineStages.id, stageId), eq(pipelineStages.tenantId, tenantId)));
  }

  async reorderPipelineStages(pipelineId: string, tenantId: string, stageIds: string[]): Promise<void> {
    // Update stage order in a transaction
    for (let i = 0; i < stageIds.length; i++) {
      await db
        .update(pipelineStages)
        .set({ stageOrder: i + 1, updatedAt: new Date() })
        .where(and(
          eq(pipelineStages.id, stageIds[i]),
          eq(pipelineStages.pipelineId, pipelineId),
          eq(pipelineStages.tenantId, tenantId)
        ));
    }
  }

  // Tenant Project operations
  async listTenantProjects(tenantId: string, status?: string): Promise<TenantProject[]> {
    if (status) {
      return await db
        .select()
        .from(tenantProjects)
        .where(and(eq(tenantProjects.tenantId, tenantId), eq(tenantProjects.status, status)))
        .orderBy(desc(tenantProjects.createdAt));
    }
    return await db
      .select()
      .from(tenantProjects)
      .where(eq(tenantProjects.tenantId, tenantId))
      .orderBy(desc(tenantProjects.createdAt));
  }

  async getTenantProjectById(projectId: string, tenantId: string): Promise<TenantProject | undefined> {
    const [project] = await db
      .select()
      .from(tenantProjects)
      .where(and(eq(tenantProjects.id, projectId), eq(tenantProjects.tenantId, tenantId)));
    return project;
  }

  async getTenantProjectBySlug(slug: string, tenantId: string): Promise<TenantProject | undefined> {
    const [project] = await db
      .select()
      .from(tenantProjects)
      .where(and(eq(tenantProjects.slug, slug), eq(tenantProjects.tenantId, tenantId)));
    return project;
  }

  async getDefaultTenantProject(tenantId: string): Promise<TenantProject | undefined> {
    const [project] = await db
      .select()
      .from(tenantProjects)
      .where(and(eq(tenantProjects.tenantId, tenantId), eq(tenantProjects.isDefault, true)));
    return project;
  }

  async createTenantProject(data: InsertTenantProject): Promise<TenantProject> {
    const slug = data.slug || this.generateSlugFromName(data.name);
    const [project] = await db
      .insert(tenantProjects)
      .values({
        ...data,
        slug,
        status: data.status || 'active',
      })
      .returning();
    return project;
  }

  async updateTenantProject(projectId: string, tenantId: string, updates: Partial<InsertTenantProject>): Promise<TenantProject> {
    const [project] = await db
      .update(tenantProjects)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(tenantProjects.id, projectId), eq(tenantProjects.tenantId, tenantId)))
      .returning();
    return project;
  }

  async archiveTenantProject(projectId: string, tenantId: string, archivedBy: string): Promise<TenantProject> {
    const [project] = await db
      .update(tenantProjects)
      .set({
        status: 'archived',
        archivedAt: new Date(),
        archivedBy,
        updatedAt: new Date(),
      })
      .where(and(eq(tenantProjects.id, projectId), eq(tenantProjects.tenantId, tenantId)))
      .returning();
    return project;
  }

  async restoreTenantProject(projectId: string, tenantId: string): Promise<TenantProject> {
    const [project] = await db
      .update(tenantProjects)
      .set({
        status: 'active',
        archivedAt: null,
        archivedBy: null,
        updatedAt: new Date(),
      })
      .where(and(eq(tenantProjects.id, projectId), eq(tenantProjects.tenantId, tenantId)))
      .returning();
    return project;
  }

  async setDefaultTenantProject(projectId: string, tenantId: string): Promise<TenantProject> {
    // First, unset any existing default
    await db
      .update(tenantProjects)
      .set({ isDefault: false, updatedAt: new Date() })
      .where(and(eq(tenantProjects.tenantId, tenantId), eq(tenantProjects.isDefault, true)));
    
    // Set the new default
    const [project] = await db
      .update(tenantProjects)
      .set({ isDefault: true, updatedAt: new Date() })
      .where(and(eq(tenantProjects.id, projectId), eq(tenantProjects.tenantId, tenantId)))
      .returning();
    return project;
  }

  async deleteTenantProject(projectId: string, tenantId: string): Promise<void> {
    await db
      .delete(tenantProjects)
      .where(and(eq(tenantProjects.id, projectId), eq(tenantProjects.tenantId, tenantId)));
  }

  // Assistant Blueprint operations
  async listAssistantBlueprints(tenantId: string, blueprintType?: string): Promise<AssistantBlueprint[]> {
    if (blueprintType) {
      return await db
        .select()
        .from(assistantBlueprints)
        .where(and(eq(assistantBlueprints.tenantId, tenantId), eq(assistantBlueprints.blueprintType, blueprintType)))
        .orderBy(desc(assistantBlueprints.createdAt));
    }
    return await db
      .select()
      .from(assistantBlueprints)
      .where(eq(assistantBlueprints.tenantId, tenantId))
      .orderBy(desc(assistantBlueprints.createdAt));
  }

  async getAssistantBlueprintById(blueprintId: string, tenantId: string): Promise<AssistantBlueprint | undefined> {
    const [blueprint] = await db
      .select()
      .from(assistantBlueprints)
      .where(and(eq(assistantBlueprints.id, blueprintId), eq(assistantBlueprints.tenantId, tenantId)));
    return blueprint;
  }

  async createAssistantBlueprint(data: InsertAssistantBlueprint): Promise<AssistantBlueprint> {
    const slug = data.slug || this.generateSlugFromName(data.name);
    const [blueprint] = await db
      .insert(assistantBlueprints)
      .values({
        ...data,
        slug,
      })
      .returning();
    return blueprint;
  }

  async updateAssistantBlueprint(blueprintId: string, tenantId: string, updates: Partial<InsertAssistantBlueprint>): Promise<AssistantBlueprint> {
    const [blueprint] = await db
      .update(assistantBlueprints)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(assistantBlueprints.id, blueprintId), eq(assistantBlueprints.tenantId, tenantId)))
      .returning();
    return blueprint;
  }

  async deleteAssistantBlueprint(blueprintId: string, tenantId: string): Promise<void> {
    await db
      .delete(assistantBlueprints)
      .where(and(eq(assistantBlueprints.id, blueprintId), eq(assistantBlueprints.tenantId, tenantId)));
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

  async getUserIntegrationsWithGmailByTenant(tenantId: string): Promise<UserIntegration[]> {
    // Tenant-scoped query for users with Gmail credentials
    // Filters at database level for efficiency
    const results = await db
      .select({
        integration: userIntegrations,
        user: users
      })
      .from(userIntegrations)
      .innerJoin(users, eq(userIntegrations.userId, users.id))
      .where(and(
        eq(userIntegrations.tenantId, tenantId),
        eq(users.isActive, true),
        isNotNull(userIntegrations.googleCalendarEmail),
        isNotNull(userIntegrations.googleCalendarAccessToken)
      ));

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
  async getUserPreferences(userId: string, tenantId: string): Promise<UserPreferences | undefined> {
    const [preferences] = await db
      .select()
      .from(userPreferences)
      .where(and(eq(userPreferences.userId, userId), eq(userPreferences.tenantId, tenantId)));
    return preferences;
  }

  async saveUserPreferences(userId: string, tenantId: string, preferences: Partial<UserPreferences>) {
    const existing = await this.getUserPreferences(userId, tenantId);

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
        .where(and(eq(userPreferences.userId, userId), eq(userPreferences.tenantId, tenantId)))
        .returning();
      return updated[0];
    } else {
      const created = await db
        .insert(userPreferences)
        .values({
          id: uuidv4(),
          userId,
          tenantId,
          ...formattedPreferences,
        })
        .returning();
      return created[0];
    }
  }

  async getLastCategory(userId: string, tenantId: string): Promise<string | null> {
    const preferences = await this.getUserPreferences(userId, tenantId);
    return preferences?.lastCategory || null;
  }

  async setLastCategory(userId: string, tenantId: string, category: string): Promise<UserPreferences> {
    return await this.saveUserPreferences(userId, tenantId, { lastCategory: category });
  }

  async getSelectedCategory(userId: string, tenantId: string): Promise<string | null> {
    const preferences = await this.getUserPreferences(userId, tenantId);
    return preferences?.selectedCategory || null;
  }

  async setSelectedCategory(userId: string, tenantId: string, category: string): Promise<UserPreferences> {
    return await this.saveUserPreferences(userId, tenantId, { selectedCategory: category });
  }

  // Client operations
  async getAllClients(tenantId: string): Promise<Client[]> {
    return await db.select().from(clients).where(eq(clients.tenantId, tenantId)).orderBy(clients.createdAt);
  }

  async getClientsByAgent(agentId: string, tenantId: string): Promise<Client[]> {
    return await db
      .select()
      .from(clients)
      .where(and(eq(clients.assignedAgent, agentId), eq(clients.tenantId, tenantId)))
      .orderBy(clients.createdAt);
  }

  async getFilteredClients(tenantId: string, filters: { search?: string; nameFilter?: string; cityFilter?: string; states?: string[]; cities?: string[]; status?: string[]; showMyStoresOnly?: boolean; category?: string; agentId?: string; projectId?: string }): Promise<Client[]> {
    // If projectId is provided, filter by categories belonging to that project
    let allowedCategoryNames: string[] | null = null;
    if (filters.projectId) {
      const projectCategories = await db
        .select({ name: categories.name })
        .from(categories)
        .where(
          and(
            eq(categories.tenantId, tenantId),
            or(
              eq(categories.projectId, filters.projectId),
              isNull(categories.projectId)
            )
          )
        );
      allowedCategoryNames = projectCategories.map(c => c.name);
      
      // If project has no categories, return empty to prevent showing all data
      if (allowedCategoryNames.length === 0) {
        return [];
      }
    }
    
    let query = db.select().from(clients);
    const conditions: any[] = [eq(clients.tenantId, tenantId)];

    // Filter by agent (for agents seeing only their clients or when showMyStoresOnly is enabled)
    if (filters.agentId || filters.showMyStoresOnly) {
      const agentId = filters.agentId;
      if (agentId) {
        conditions.push(eq(clients.assignedAgent, agentId));
      }
    }

    // Filter by project's categories (if projectId was provided)
    if (allowedCategoryNames !== null) {
      conditions.push(inArray(clients.category, allowedCategoryNames));
    }

    // Filter by specific category (in addition to project filtering)
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

  async getClient(id: string, tenantId: string): Promise<Client | undefined> {
    const [client] = await db.select().from(clients).where(and(eq(clients.id, id), eq(clients.tenantId, tenantId)));
    return client;
  }

  async createClient(client: InsertClient): Promise<Client> {
    const [newClient] = await db.insert(clients).values(client).returning();
    return newClient;
  }

  async updateClient(id: string, tenantId: string, updates: Partial<InsertClient>): Promise<Client> {
    const [updated] = await db
      .update(clients)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(clients.id, id), eq(clients.tenantId, tenantId)))
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

    return updated;
  }

  // Notes operations
  async getClientNotes(clientId: string, tenantId: string): Promise<Note[]> {
    return await db
      .select()
      .from(notes)
      .where(and(eq(notes.clientId, clientId), eq(notes.tenantId, tenantId)))
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

  async getOrderById(id: string, tenantId: string): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(and(eq(orders.id, id), eq(orders.tenantId, tenantId)));
    return order;
  }

  async updateOrder(id: string, tenantId: string, updates: Partial<InsertOrder>): Promise<Order> {
    const [updated] = await db
      .update(orders)
      .set(updates)
      .where(and(eq(orders.id, id), eq(orders.tenantId, tenantId)))
      .returning();
    return updated;
  }

  async getAllOrders(tenantId: string): Promise<Order[]> {
    return await db.select().from(orders).where(eq(orders.tenantId, tenantId)).orderBy(orders.orderDate);
  }

  async deleteOrder(id: string, tenantId: string): Promise<void> {
    await db.delete(orders).where(and(eq(orders.id, id), eq(orders.tenantId, tenantId)));
  }

  // Commission operations
  async createCommission(commission: InsertCommission): Promise<Commission> {
    const [newCommission] = await db.insert(commissions).values(commission).returning();
    return newCommission;
  }

  async getCommissionsByAgent(agentId: string, tenantId: string): Promise<Commission[]> {
    return await db
      .select()
      .from(commissions)
      .where(and(eq(commissions.agentId, agentId), eq(commissions.tenantId, tenantId)))
      .orderBy(desc(commissions.calculatedOn));
  }

  async getCommissionsByOrder(orderId: string, tenantId: string): Promise<Commission[]> {
    return await db
      .select()
      .from(commissions)
      .where(and(eq(commissions.orderId, orderId), eq(commissions.tenantId, tenantId)));
  }

  async deleteCommissionsByOrder(orderId: string, tenantId: string): Promise<void> {
    await db.delete(commissions).where(and(eq(commissions.orderId, orderId), eq(commissions.tenantId, tenantId)));
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
  async getAllActiveGoogleSheets(tenantId: string): Promise<GoogleSheet[]> {
    return await db
      .select()
      .from(googleSheets)
      .where(and(eq(googleSheets.syncStatus, 'active'), eq(googleSheets.tenantId, tenantId)))
      .orderBy(desc(googleSheets.createdAt));
  }

  async getGoogleSheetById(id: string, tenantId: string): Promise<GoogleSheet | null> {
    const [sheet] = await db
      .select()
      .from(googleSheets)
      .where(and(eq(googleSheets.id, id), eq(googleSheets.tenantId, tenantId)))
      .limit(1);
    return sheet || null;
  }

  async getGoogleSheetByPurpose(purpose: string, tenantId: string): Promise<GoogleSheet | null> {
    const [sheet] = await db
      .select()
      .from(googleSheets)
      .where(and(
        eq(googleSheets.sheetPurpose, purpose),
        eq(googleSheets.syncStatus, 'active'),
        eq(googleSheets.tenantId, tenantId)
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

  async getOrdersByClient(clientId: string, tenantId: string): Promise<Order[]> {
    return await db
      .select()
      .from(orders)
      .where(and(eq(orders.clientId, clientId), eq(orders.tenantId, tenantId)))
      .orderBy(desc(orders.orderDate));
  }

  // Reminder operations
  async getRemindersByUser(userId: string, tenantId: string): Promise<Reminder[]> {
    return await db
      .select()
      .from(reminders)
      .where(and(eq(reminders.userId, userId), eq(reminders.tenantId, tenantId)))
      .orderBy(desc(reminders.nextTrigger));
  }

  async getRemindersByClient(clientId: string, tenantId: string): Promise<Reminder[]> {
    return await db
      .select()
      .from(reminders)
      .where(and(eq(reminders.clientId, clientId), eq(reminders.tenantId, tenantId)))
      .orderBy(desc(reminders.nextTrigger));
  }

  async getReminderById(id: string, tenantId: string): Promise<Reminder | undefined> {
    const [reminder] = await db
      .select()
      .from(reminders)
      .where(and(eq(reminders.id, id), eq(reminders.tenantId, tenantId)));
    return reminder;
  }

  async createReminder(reminder: InsertReminder): Promise<Reminder> {
    const [newReminder] = await db
      .insert(reminders)
      .values(reminder)
      .returning();
    return newReminder;
  }

  async updateReminder(id: string, tenantId: string, updates: Partial<InsertReminder>): Promise<Reminder> {
    const [updated] = await db
      .update(reminders)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(reminders.id, id), eq(reminders.tenantId, tenantId)))
      .returning();
    return updated;
  }

  async deleteReminder(id: string, tenantId: string): Promise<void> {
    await db
      .delete(reminders)
      .where(and(eq(reminders.id, id), eq(reminders.tenantId, tenantId)));
  }

  // Notification operations
  async getNotificationsByUser(userId: string, tenantId: string): Promise<Notification[]> {
    return await db
      .select()
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.tenantId, tenantId)))
      .orderBy(desc(notifications.createdAt));
  }

  async getNotificationById(id: string, tenantId: string): Promise<Notification | undefined> {
    const [notification] = await db
      .select()
      .from(notifications)
      .where(and(eq(notifications.id, id), eq(notifications.tenantId, tenantId)));
    return notification;
  }

  async markNotificationAsRead(id: string, tenantId: string): Promise<Notification> {
    const [updated] = await db
      .update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.id, id), eq(notifications.tenantId, tenantId)))
      .returning();
    return updated;
  }

  async markNotificationAsResolved(id: string, tenantId: string): Promise<Notification> {
    const [updated] = await db
      .update(notifications)
      .set({ isResolved: true, resolvedAt: new Date() })
      .where(and(eq(notifications.id, id), eq(notifications.tenantId, tenantId)))
      .returning();
    return updated;
  }

  async deleteNotification(id: string, tenantId: string): Promise<void> {
    await db
      .delete(notifications)
      .where(and(eq(notifications.id, id), eq(notifications.tenantId, tenantId)));
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
  async getOpenaiSettings(tenantId: string): Promise<OpenaiSettings | undefined> {
    const [settings] = await db
      .select()
      .from(openaiSettings)
      .where(and(eq(openaiSettings.tenantId, tenantId), eq(openaiSettings.isActive, true)))
      .limit(1);
    return settings;
  }

  async saveOpenaiSettings(tenantId: string, settings: Partial<InsertOpenaiSettings>): Promise<OpenaiSettings> {
    const existing = await this.getOpenaiSettings(tenantId);

    if (existing) {
      const [updated] = await db
        .update(openaiSettings)
        .set({ ...settings, updatedAt: new Date() })
        .where(and(eq(openaiSettings.id, existing.id), eq(openaiSettings.tenantId, tenantId)))
        .returning();
      return updated;
    } else {
      const [newSettings] = await db
        .insert(openaiSettings)
        .values({ ...settings, tenantId } as InsertOpenaiSettings)
        .returning();
      return newSettings;
    }
  }

  // Knowledge base operations (OpenAI Sales Assistant)
  async getAllKnowledgeBaseFiles(tenantId: string): Promise<any[]> {
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
      .where(and(eq(knowledgeBaseFiles.tenantId, tenantId), eq(knowledgeBaseFiles.isActive, true)))
      .orderBy(desc(knowledgeBaseFiles.uploadedAt));

    return results;
  }

  async getKnowledgeBaseFile(id: string, tenantId: string): Promise<KnowledgeBaseFile | undefined> {
    const [file] = await db
      .select()
      .from(knowledgeBaseFiles)
      .where(and(eq(knowledgeBaseFiles.id, id), eq(knowledgeBaseFiles.tenantId, tenantId)));
    return file;
  }

  async createKnowledgeBaseFile(file: InsertKnowledgeBaseFile): Promise<KnowledgeBaseFile> {
    const [newFile] = await db
      .insert(knowledgeBaseFiles)
      .values(file)
      .returning();
    return newFile;
  }

  async updateKnowledgeBaseFileStatus(id: string, tenantId: string, status: string): Promise<KnowledgeBaseFile> {
    const [updated] = await db
      .update(knowledgeBaseFiles)
      .set({ processingStatus: status })
      .where(and(eq(knowledgeBaseFiles.id, id), eq(knowledgeBaseFiles.tenantId, tenantId)))
      .returning();
    return updated;
  }

  async updateKnowledgeBaseFile(id: string, tenantId: string, updates: Partial<InsertKnowledgeBaseFile>): Promise<KnowledgeBaseFile> {
    const [updated] = await db
      .update(knowledgeBaseFiles)
      .set(updates)
      .where(and(eq(knowledgeBaseFiles.id, id), eq(knowledgeBaseFiles.tenantId, tenantId)))
      .returning();
    return updated;
  }

  async deleteKnowledgeBaseFile(id: string, tenantId: string): Promise<void> {
    await db
      .update(knowledgeBaseFiles)
      .set({ isActive: false })
      .where(and(eq(knowledgeBaseFiles.id, id), eq(knowledgeBaseFiles.tenantId, tenantId)));
  }

  // Chat operations
  async getChatHistory(userId: string, tenantId: string, limit: number = 50): Promise<ChatMessage[]> {
    return await db
      .select()
      .from(chatMessages)
      .where(and(eq(chatMessages.userId, userId), eq(chatMessages.tenantId, tenantId)))
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

  async clearChatHistory(userId: string, tenantId: string): Promise<void> {
    await db
      .delete(chatMessages)
      .where(and(eq(chatMessages.userId, userId), eq(chatMessages.tenantId, tenantId)));
  }

  async getConversationMessages(conversationId: string, tenantId: string): Promise<ChatMessage[]> {
    return await db
      .select()
      .from(chatMessages)
      .where(and(eq(chatMessages.conversationId, conversationId), eq(chatMessages.tenantId, tenantId)))
      .orderBy(chatMessages.createdAt);
  }

  // Project operations
  async getProjects(userId: string, tenantId: string): Promise<Project[]> {
    return await db
      .select()
      .from(projects)
      .where(and(eq(projects.userId, userId), eq(projects.tenantId, tenantId)))
      .orderBy(desc(projects.createdAt));
  }

  async createProject(project: InsertProject): Promise<Project> {
    const [newProject] = await db
      .insert(projects)
      .values(project)
      .returning();
    return newProject;
  }

  async updateProject(id: string, tenantId: string, updates: Partial<InsertProject>): Promise<Project> {
    const [updated] = await db
      .update(projects)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(projects.id, id), eq(projects.tenantId, tenantId)))
      .returning();
    return updated;
  }

  async deleteProject(id: string, tenantId: string): Promise<void> {
    await db
      .delete(projects)
      .where(and(eq(projects.id, id), eq(projects.tenantId, tenantId)));
  }

  // Conversation operations
  async getConversations(userId: string, tenantId: string): Promise<Conversation[]> {
    return await db
      .select()
      .from(conversations)
      .where(and(eq(conversations.userId, userId), eq(conversations.tenantId, tenantId)))
      .orderBy(desc(conversations.updatedAt));
  }

  async getConversation(id: string, tenantId: string): Promise<Conversation | undefined> {
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(and(eq(conversations.id, id), eq(conversations.tenantId, tenantId)));
    return conversation;
  }

  async createConversation(conversation: InsertConversation): Promise<Conversation> {
    const [newConversation] = await db
      .insert(conversations)
      .values(conversation)
      .returning();
    return newConversation;
  }

  async updateConversation(id: string, tenantId: string, updates: Partial<InsertConversation>): Promise<Conversation> {
    const [updated] = await db
      .update(conversations)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(conversations.id, id), eq(conversations.tenantId, tenantId)))
      .returning();
    return updated;
  }

  async deleteConversation(id: string, tenantId: string): Promise<void> {
    await db
      .delete(conversations)
      .where(and(eq(conversations.id, id), eq(conversations.tenantId, tenantId)));
  }

  async moveConversationToProject(conversationId: string, tenantId: string, projectId: string | null): Promise<Conversation> {
    const [updated] = await db
      .update(conversations)
      .set({ projectId, updatedAt: new Date() })
      .where(and(eq(conversations.id, conversationId), eq(conversations.tenantId, tenantId)))
      .returning();
    return updated;
  }

  // Template operations
  async getUserTemplates(userId: string, tenantId: string): Promise<Template[]> {
    return await db
      .select()
      .from(templates)
      .where(and(eq(templates.userId, userId), eq(templates.tenantId, tenantId)))
      .orderBy(desc(templates.createdAt));
  }

  async getTemplate(id: string, tenantId: string): Promise<Template | undefined> {
    const [template] = await db
      .select()
      .from(templates)
      .where(and(eq(templates.id, id), eq(templates.tenantId, tenantId)));
    return template;
  }

  async createTemplate(template: InsertTemplate): Promise<Template> {
    const [newTemplate] = await db
      .insert(templates)
      .values(template)
      .returning();
    return newTemplate;
  }

  async updateTemplate(id: string, tenantId: string, updates: Partial<InsertTemplate>): Promise<Template> {
    const [updated] = await db
      .update(templates)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(templates.id, id), eq(templates.tenantId, tenantId)))
      .returning();
    return updated;
  }

  async deleteTemplate(id: string, tenantId: string): Promise<void> {
    await db
      .delete(templates)
      .where(and(eq(templates.id, id), eq(templates.tenantId, tenantId)));
  }

  async getAllTemplateTags(tenantId: string): Promise<string[]> {
    const allTemplates = await db.select().from(templates).where(eq(templates.tenantId, tenantId));
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
  async getAllCategories(tenantId: string, projectId?: string): Promise<Category[]>{
    // When projectId is provided, include both project-specific AND shared (null projectId) categories
    if (projectId) {
      return await db
        .select()
        .from(categories)
        .where(and(
          eq(categories.tenantId, tenantId),
          or(eq(categories.projectId, projectId), isNull(categories.projectId))
        ))
        .orderBy(categories.displayOrder, categories.name);
    }
    // No projectId = return all categories for tenant
    return await db
      .select()
      .from(categories)
      .where(eq(categories.tenantId, tenantId))
      .orderBy(categories.displayOrder, categories.name);
  }

  async getActiveCategories(tenantId: string, projectId?: string): Promise<Category[]> {
    // When projectId is provided, include both project-specific AND shared (null projectId) categories
    if (projectId) {
      return await db
        .select()
        .from(categories)
        .where(and(
          eq(categories.isActive, true),
          eq(categories.tenantId, tenantId),
          or(eq(categories.projectId, projectId), isNull(categories.projectId))
        ))
        .orderBy(categories.displayOrder, categories.name);
    }
    // No projectId = return all active categories for tenant
    return await db
      .select()
      .from(categories)
      .where(and(eq(categories.isActive, true), eq(categories.tenantId, tenantId)))
      .orderBy(categories.displayOrder, categories.name);
  }

  async getCategory(id: string): Promise<Category | undefined> {
    const [category] = await db
      .select()
      .from(categories)
      .where(eq(categories.id, id));
    return category;
  }

  async getCategoryByName(tenantId: string, name: string, projectId?: string): Promise<Category | undefined> {
    // When projectId is provided, look for project-specific first, then shared
    if (projectId) {
      // Try project-specific first
      const [projectCategory] = await db
        .select()
        .from(categories)
        .where(and(
          eq(categories.tenantId, tenantId),
          eq(categories.name, name),
          eq(categories.projectId, projectId)
        ));
      if (projectCategory) return projectCategory;
      
      // Fall back to shared category (null projectId)
      const [sharedCategory] = await db
        .select()
        .from(categories)
        .where(and(
          eq(categories.tenantId, tenantId),
          eq(categories.name, name),
          isNull(categories.projectId)
        ));
      return sharedCategory;
    }
    
    // No projectId = look for any category with that name
    const [category] = await db
      .select()
      .from(categories)
      .where(and(eq(categories.tenantId, tenantId), eq(categories.name, name)));
    return category;
  }

  async getOrCreateCategoryByName(tenantId: string, name: string, projectId?: string): Promise<Category> {
    // First check if category exists (checks project-specific then shared)
    const existing = await this.getCategoryByName(tenantId, name, projectId);
    if (existing) {
      return existing;
    }
    // Create new category under the project if projectId provided
    const [newCategory] = await db
      .insert(categories)
      .values({ tenantId, name, isActive: true, ...(projectId ? { projectId } : {}) })
      .returning();
    return newCategory;
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

  async recordImportedPlace(placeId: string, tenantId: string): Promise<void> {
    await db
      .insert(importedPlaces)
      .values({ placeId, tenantId })
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
    tenantId: string,
    businessType: string, 
    city: string, 
    state: string, 
    country: string,
    excludedKeywords: string[] = [],
    excludedTypes: string[] = [],
    category?: string
  ): Promise<SearchHistory> {
    // Check if this exact search already exists for this tenant
    const [existing] = await db
      .select()
      .from(searchHistory)
      .where(
        and(
          eq(searchHistory.tenantId, tenantId),
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
          tenantId,
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
  async getAllStatuses(tenantId: string): Promise<Status[]> {
    const allStatuses = await db
      .select()
      .from(statuses)
      .where(eq(statuses.tenantId, tenantId))
      .orderBy(statuses.displayOrder);
    return allStatuses;
  }

  async getActiveStatuses(tenantId: string): Promise<Status[]> {
    const activeStatuses = await db
      .select()
      .from(statuses)
      .where(and(eq(statuses.isActive, true), eq(statuses.tenantId, tenantId)))
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

  async getUserCallHistory(userId: string, tenantId: string): Promise<CallHistory[]> {
    return await db
      .select()
      .from(callHistory)
      .where(and(eq(callHistory.agentId, userId), eq(callHistory.tenantId, tenantId)))
      .orderBy(desc(callHistory.calledAt));
  }

  async getAllCallHistory(tenantId: string, agentId?: string): Promise<CallHistory[]> {
    if (agentId) {
      return await db
        .select()
        .from(callHistory)
        .where(and(eq(callHistory.agentId, agentId), eq(callHistory.tenantId, tenantId)))
        .orderBy(desc(callHistory.calledAt));
    }
    return await db
      .select()
      .from(callHistory)
      .where(eq(callHistory.tenantId, tenantId))
      .orderBy(desc(callHistory.calledAt));
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
  async getElevenLabsConfig(tenantId: string): Promise<{ apiKey: string; twilioNumber?: string; webhookSecret?: string; phoneNumberId?: string; useDirectElevenLabs?: boolean } | undefined> {
    const [config] = await db.select().from(elevenLabsConfig).where(eq(elevenLabsConfig.tenantId, tenantId)).limit(1);
    if (!config) return undefined;
    return {
      apiKey: config.apiKey,
      twilioNumber: config.twilioNumber || undefined,
      webhookSecret: config.webhookSecret || undefined,
      phoneNumberId: config.phoneNumberId || undefined
    };
  }

  async updateElevenLabsConfig(tenantId: string, configData: { apiKey?: string; twilioNumber?: string; webhookSecret?: string; phoneNumberId?: string }): Promise<void> {
    // Get existing config first to preserve values
    const existing = await this.getElevenLabsConfig(tenantId);

    // Merge with existing values (only update provided fields)
    const merged = {
      tenantId,
      apiKey: configData.apiKey !== undefined ? configData.apiKey : (existing?.apiKey ?? ''),
      twilioNumber: configData.twilioNumber !== undefined ? configData.twilioNumber : (existing?.twilioNumber ?? null),
      webhookSecret: configData.webhookSecret !== undefined ? configData.webhookSecret : (existing?.webhookSecret ?? null),
      phoneNumberId: configData.phoneNumberId !== undefined ? configData.phoneNumberId : (existing?.phoneNumberId ?? null)
    };

    // Delete old config for this tenant and insert new
    await db.delete(elevenLabsConfig).where(eq(elevenLabsConfig.tenantId, tenantId));
    await db.insert(elevenLabsConfig).values(merged);
  }

  async updateElevenLabsConfigDirectMode(tenantId: string, useDirectElevenLabs: boolean): Promise<void> {
    await db.update(elevenLabsConfig)
      .set({ useDirectElevenLabs, updatedAt: new Date() })
      .where(eq(elevenLabsConfig.tenantId, tenantId));
  }

  // ElevenLabs Phone Numbers operations
  async getAllElevenLabsPhoneNumbers(tenantId: string): Promise<ElevenLabsPhoneNumber[]> {
    return await db.select().from(elevenLabsPhoneNumbers).where(eq(elevenLabsPhoneNumbers.tenantId, tenantId));
  }

  async getElevenLabsPhoneNumber(phoneNumberId: string, tenantId: string): Promise<ElevenLabsPhoneNumber | undefined> {
    // Strict tenant-scoped lookup - each tenant must have their own phone number record
    const [phone] = await db.select().from(elevenLabsPhoneNumbers).where(
      and(eq(elevenLabsPhoneNumbers.phoneNumberId, phoneNumberId), eq(elevenLabsPhoneNumbers.tenantId, tenantId))
    );
    return phone;
  }

  async upsertElevenLabsPhoneNumber(phoneData: InsertElevenLabsPhoneNumber): Promise<ElevenLabsPhoneNumber> {
    // Check if phone number already exists for this specific tenant
    const [existingForTenant] = await db.select().from(elevenLabsPhoneNumbers)
      .where(and(
        eq(elevenLabsPhoneNumbers.phoneNumberId, phoneData.phoneNumberId),
        eq(elevenLabsPhoneNumbers.tenantId, phoneData.tenantId)
      ));

    if (existingForTenant) {
      // Phone number exists for this tenant - update it
      const [updated] = await db.update(elevenLabsPhoneNumbers)
        .set({ 
          phoneNumber: phoneData.phoneNumber,
          label: phoneData.label,
          updatedAt: new Date() 
        })
        .where(and(
          eq(elevenLabsPhoneNumbers.phoneNumberId, phoneData.phoneNumberId),
          eq(elevenLabsPhoneNumbers.tenantId, phoneData.tenantId)
        ))
        .returning();
      return updated;
    } else {
      // Insert new phone number for this tenant (allows same phoneNumberId for different tenants)
      const [newPhone] = await db.insert(elevenLabsPhoneNumbers).values(phoneData).returning();
      return newPhone;
    }
  }

  async deleteElevenLabsPhoneNumber(phoneNumberId: string, tenantId: string): Promise<void> {
    await db.delete(elevenLabsPhoneNumbers).where(and(eq(elevenLabsPhoneNumbers.phoneNumberId, phoneNumberId), eq(elevenLabsPhoneNumbers.tenantId, tenantId)));
  }

  async getAllElevenLabsAgents(tenantId: string, projectId?: string): Promise<ElevenLabsAgent[]> {
    const conditions = [eq(elevenLabsAgents.tenantId, tenantId)];
    if (projectId) {
      conditions.push(eq(elevenLabsAgents.projectId, projectId));
    }
    return await db.select().from(elevenLabsAgents).where(and(...conditions));
  }

  async getElevenLabsAgent(id: string, tenantId: string): Promise<ElevenLabsAgent | undefined> {
    const [agent] = await db.select().from(elevenLabsAgents).where(and(eq(elevenLabsAgents.id, id), eq(elevenLabsAgents.tenantId, tenantId)));
    return agent;
  }

  async getDefaultElevenLabsAgent(tenantId: string): Promise<ElevenLabsAgent | undefined> {
    const [agent] = await db.select().from(elevenLabsAgents).where(and(eq(elevenLabsAgents.isDefault, true), eq(elevenLabsAgents.tenantId, tenantId))).limit(1);
    return agent;
  }

  async createElevenLabsAgent(agent: InsertElevenLabsAgent): Promise<ElevenLabsAgent> {
    const [newAgent] = await db.insert(elevenLabsAgents).values(agent).returning();
    return newAgent;
  }

  async updateElevenLabsAgent(id: string, tenantId: string, updates: Partial<InsertElevenLabsAgent>): Promise<ElevenLabsAgent> {
    const [updated] = await db.update(elevenLabsAgents)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(elevenLabsAgents.id, id), eq(elevenLabsAgents.tenantId, tenantId)))
      .returning();
    return updated;
  }

  async deleteElevenLabsAgent(id: string, tenantId: string): Promise<void> {
    await db.delete(elevenLabsAgents).where(and(eq(elevenLabsAgents.id, id), eq(elevenLabsAgents.tenantId, tenantId)));
  }

  async setDefaultElevenLabsAgent(id: string, tenantId: string): Promise<void> {
    // First, set all agents for this tenant to non-default
    await db.update(elevenLabsAgents).set({ isDefault: false }).where(eq(elevenLabsAgents.tenantId, tenantId));
    // Then set the specified agent as default
    await db.update(elevenLabsAgents)
      .set({ isDefault: true })
      .where(and(eq(elevenLabsAgents.id, id), eq(elevenLabsAgents.tenantId, tenantId)));
  }

  // Voice AI Call Sessions operations
  async createCallSession(session: InsertCallSession): Promise<CallSession> {
    const [newSession] = await db.insert(callSessions).values(session).returning();
    return newSession;
  }

  async getCallSession(id: string, tenantId: string): Promise<CallSession | undefined> {
    const [session] = await db.select().from(callSessions).where(and(eq(callSessions.id, id), eq(callSessions.tenantId, tenantId)));
    return session;
  }

  async getCallSessionByConversationId(conversationId: string, tenantId: string): Promise<CallSession | undefined> {
    const [session] = await db.select().from(callSessions).where(and(eq(callSessions.conversationId, conversationId), eq(callSessions.tenantId, tenantId)));
    return session;
  }

  async getCallSessionByCallSid(callSid: string, tenantId: string): Promise<CallSession | undefined> {
    const [session] = await db.select().from(callSessions).where(and(eq(callSessions.callSid, callSid), eq(callSessions.tenantId, tenantId)));
    return session;
  }

  async getCallSessions(tenantId: string, filters?: { clientId?: string; initiatedByUserId?: string; status?: string }): Promise<CallSession[]> {
    const conditions = [eq(callSessions.tenantId, tenantId)];
    if (filters?.clientId) conditions.push(eq(callSessions.clientId, filters.clientId));
    if (filters?.initiatedByUserId) conditions.push(eq(callSessions.initiatedByUserId, filters.initiatedByUserId));
    if (filters?.status) conditions.push(eq(callSessions.status, filters.status));

    return await db.select().from(callSessions).where(and(...conditions)).orderBy(desc(callSessions.startedAt));
  }

  async updateCallSession(id: string, tenantId: string, updates: Partial<InsertCallSession>): Promise<CallSession> {
    const [updated] = await db.update(callSessions)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(callSessions.id, id), eq(callSessions.tenantId, tenantId)))
      .returning();
    return updated;
  }

  async updateCallSessionByConversationId(conversationId: string, tenantId: string, updates: Partial<InsertCallSession>): Promise<CallSession> {
    const [updated] = await db.update(callSessions)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(callSessions.conversationId, conversationId), eq(callSessions.tenantId, tenantId)))
      .returning();
    return updated;
  }

  async deleteCallSession(id: string, tenantId: string): Promise<void> {
    await db.delete(callSessions).where(and(eq(callSessions.id, id), eq(callSessions.tenantId, tenantId)));
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

  async nukeAllCallData(): Promise<{ sessionsDeleted: number; historyDeleted: number; transcriptsDeleted: number; eventsDeleted: number; targetsDeleted: number; campaignsDeleted: number }> {
    // Delete all call campaign targets first (they reference campaigns)
    const deletedTargets = await db.delete(callCampaignTargets).returning();
    
    // Delete all call campaigns
    const deletedCampaigns = await db.delete(callCampaigns).returning();
    
    // Delete all call events
    const deletedEvents = await db.delete(callEvents).returning();
    
    // Delete all call transcripts
    const deletedTranscripts = await db.delete(callTranscripts).returning();
    
    // Delete all call history
    const deletedHistory = await db.delete(callHistory).returning();
    
    // Delete all call sessions
    const deletedSessions = await db.delete(callSessions).returning();
    
    return {
      sessionsDeleted: deletedSessions.length,
      historyDeleted: deletedHistory.length,
      transcriptsDeleted: deletedTranscripts.length,
      eventsDeleted: deletedEvents.length,
      targetsDeleted: deletedTargets.length,
      campaignsDeleted: deletedCampaigns.length,
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

  async getCallCampaign(id: string, tenantId: string): Promise<CallCampaign | undefined> {
    const [campaign] = await db.select().from(callCampaigns).where(and(eq(callCampaigns.id, id), eq(callCampaigns.tenantId, tenantId)));
    return campaign;
  }

  async getCallCampaigns(tenantId: string, filters?: { createdByUserId?: string; status?: string }): Promise<CallCampaign[]> {
    const conditions = [eq(callCampaigns.tenantId, tenantId)];
    if (filters?.createdByUserId) conditions.push(eq(callCampaigns.createdByUserId, filters.createdByUserId));
    if (filters?.status) conditions.push(eq(callCampaigns.status, filters.status));

    return await db.select().from(callCampaigns).where(and(...conditions)).orderBy(desc(callCampaigns.createdAt));
  }

  async updateCallCampaign(id: string, tenantId: string, updates: Partial<InsertCallCampaign>): Promise<CallCampaign> {
    const [updated] = await db.update(callCampaigns)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(callCampaigns.id, id), eq(callCampaigns.tenantId, tenantId)))
      .returning();
    return updated;
  }

  // Call Campaign Targets operations
  async createCallCampaignTarget(target: InsertCallCampaignTarget): Promise<CallCampaignTarget> {
    const [newTarget] = await db.insert(callCampaignTargets).values(target).returning();
    return newTarget;
  }

  async getCallCampaignTarget(id: string, tenantId: string): Promise<CallCampaignTarget | undefined> {
    const [target] = await db.select().from(callCampaignTargets).where(and(eq(callCampaignTargets.id, id), eq(callCampaignTargets.tenantId, tenantId)));
    return target;
  }

  async getCallCampaignTargets(campaignId: string, tenantId: string): Promise<CallCampaignTarget[]> {
    return await db.select().from(callCampaignTargets)
      .where(and(eq(callCampaignTargets.campaignId, campaignId), eq(callCampaignTargets.tenantId, tenantId)));
  }

  async getCallTargetsBySession(conversationId: string, tenantId: string): Promise<CallCampaignTarget[]> {
    return await db.select().from(callCampaignTargets)
      .where(and(eq(callCampaignTargets.externalConversationId, conversationId), eq(callCampaignTargets.tenantId, tenantId)));
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

  async updateCallCampaignTarget(id: string, tenantId: string, updates: Partial<InsertCallCampaignTarget>): Promise<CallCampaignTarget> {
    const [updated] = await db.update(callCampaignTargets)
      .set(updates)
      .where(and(eq(callCampaignTargets.id, id), eq(callCampaignTargets.tenantId, tenantId)))
      .returning();
    return updated;
  }

  async incrementCampaignCalls(campaignId: string, tenantId: string, type: 'successful' | 'failed'): Promise<void> {
    const campaign = await this.getCallCampaign(campaignId, tenantId);
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
      .where(and(eq(callCampaigns.id, campaignId), eq(callCampaigns.tenantId, tenantId)));
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
  async getAllKbFiles(tenantId: string, projectId?: string): Promise<KbFile[]> {
    const conditions = [eq(kbFiles.tenantId, tenantId)];
    if (projectId) {
      conditions.push(eq(kbFiles.projectId, projectId));
    }
    return await db.select().from(kbFiles).where(and(...conditions)).orderBy(kbFiles.filename);
  }

  async getKbFileById(id: string, tenantId: string): Promise<KbFile | undefined> {
    const [file] = await db.select().from(kbFiles).where(and(eq(kbFiles.id, id), eq(kbFiles.tenantId, tenantId)));
    return file;
  }

  async getKbFileByFilename(filename: string, tenantId: string): Promise<KbFile | undefined> {
    const [file] = await db.select().from(kbFiles).where(and(eq(kbFiles.filename, filename), eq(kbFiles.tenantId, tenantId)));
    return file;
  }

  async getKbFileByElevenLabsDocId(docId: string, tenantId: string): Promise<KbFile | undefined> {
    const [file] = await db.select().from(kbFiles).where(and(eq(kbFiles.elevenlabsDocId, docId), eq(kbFiles.tenantId, tenantId)));
    return file;
  }

  async createKbFile(file: InsertKbFile): Promise<KbFile> {
    const [created] = await db.insert(kbFiles).values(file).returning();
    return created;
  }

  async updateKbFile(id: string, tenantId: string, updates: Partial<InsertKbFile>): Promise<KbFile> {
    const [updated] = await db
      .update(kbFiles)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(kbFiles.id, id), eq(kbFiles.tenantId, tenantId)))
      .returning();
    return updated;
  }

  async deleteKbFile(id: string, tenantId: string): Promise<boolean> {
    const result = await db.delete(kbFiles).where(and(eq(kbFiles.id, id), eq(kbFiles.tenantId, tenantId)));
    return (result.rowCount || 0) > 0;
  }

  async createKbFileVersion(version: InsertKbFileVersion): Promise<KbFileVersion> {
    const [created] = await db.insert(kbFileVersions).values(version).returning();
    return created;
  }

  async getKbFileVersions(fileId: string, tenantId: string): Promise<KbFileVersion[]> {
    return await db
      .select()
      .from(kbFileVersions)
      .where(and(eq(kbFileVersions.kbFileId, fileId), eq(kbFileVersions.tenantId, tenantId)))
      .orderBy(desc(kbFileVersions.versionNumber));
  }

  async getKbFileVersion(id: string, tenantId: string): Promise<KbFileVersion | undefined> {
    const [version] = await db.select().from(kbFileVersions).where(and(eq(kbFileVersions.id, id), eq(kbFileVersions.tenantId, tenantId)));
    return version;
  }

  async createKbProposal(proposal: InsertKbChangeProposal): Promise<KbChangeProposal> {
    const [created] = await db.insert(kbChangeProposals).values(proposal).returning();
    return created;
  }

  async getKbProposals(tenantId: string, filters?: { status?: string; kbFileId?: string }): Promise<KbChangeProposal[]> {
    let query = db.select().from(kbChangeProposals);

    const conditions = [eq(kbChangeProposals.tenantId, tenantId)];
    if (filters?.status) {
      conditions.push(eq(kbChangeProposals.status, filters.status));
    }
    if (filters?.kbFileId) {
      conditions.push(eq(kbChangeProposals.kbFileId, filters.kbFileId));
    }

    query = query.where(and(...conditions)) as any;

    return await query.orderBy(desc(kbChangeProposals.createdAt));
  }

  async getKbProposalById(id: string, tenantId: string): Promise<KbChangeProposal | undefined> {
    const [proposal] = await db.select().from(kbChangeProposals).where(and(eq(kbChangeProposals.id, id), eq(kbChangeProposals.tenantId, tenantId)));
    return proposal;
  }

  async updateKbProposal(id: string, tenantId: string, updates: Partial<InsertKbChangeProposal>): Promise<KbChangeProposal> {
    const [updated] = await db
      .update(kbChangeProposals)
      .set(updates)
      .where(and(eq(kbChangeProposals.id, id), eq(kbChangeProposals.tenantId, tenantId)))
      .returning();
    return updated;
  }

  async deleteKbProposal(id: string, tenantId: string): Promise<boolean> {
    const result = await db.delete(kbChangeProposals).where(and(eq(kbChangeProposals.id, id), eq(kbChangeProposals.tenantId, tenantId))).returning();
    return (result.rowCount ?? 0) > 0;
  }

  async deleteAllKbProposals(tenantId: string): Promise<number> {
    const result = await db.delete(kbChangeProposals).where(eq(kbChangeProposals.tenantId, tenantId));
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
  async getAllAssistants(tenantId?: string): Promise<any[]> {
    if (tenantId) {
      return await db.select().from(openaiAssistants).where(and(eq(openaiAssistants.isActive, true), eq(openaiAssistants.tenantId, tenantId)));
    }
    return await db.select().from(openaiAssistants).where(eq(openaiAssistants.isActive, true));
  }

  async getAssistantById(id: string): Promise<any | undefined> {
    const [assistant] = await db.select().from(openaiAssistants).where(eq(openaiAssistants.id, id));
    return assistant;
  }

  async getAssistantBySlug(slug: string, tenantId?: string): Promise<any | undefined> {
    if (tenantId) {
      const [assistant] = await db.select().from(openaiAssistants).where(and(eq(openaiAssistants.slug, slug), eq(openaiAssistants.tenantId, tenantId)));
      return assistant;
    }
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

  async getStaleInProgressTargets(beforeDate: Date): Promise<any[]> {
    // Note: callCampaignTargets doesn't have updatedAt, using createdAt as fallback
    return await db
      .select()
      .from(callCampaignTargets)
      .where(
        and(
          eq(callCampaignTargets.targetStatus, 'in-progress'),
          lte(callCampaignTargets.createdAt, beforeDate)
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

  /**
   * Normalize E-Hub settings by converting PostgreSQL decimal types to numbers
   * PostgreSQL numeric/decimal columns return as strings, so we parse them here
   */
  private normalizeEhubSettings(settings: EhubSettings): EhubSettings {
    return {
      ...settings,
      clientWindowStartOffset: typeof settings.clientWindowStartOffset === 'string'
        ? parseFloat(settings.clientWindowStartOffset)
        : settings.clientWindowStartOffset,
    };
  }

  async getEhubSettings(tenantId: string): Promise<EhubSettings | undefined> {
    const [settings] = await db
      .select()
      .from(ehubSettings)
      .where(eq(ehubSettings.tenantId, tenantId))
      .limit(1);

    return settings ? this.normalizeEhubSettings(settings) : undefined;
  }

  async updateEhubSettings(tenantId: string, updates: Partial<InsertEhubSettings>): Promise<EhubSettings> {
    // Validate settings - skip end > start check when duration is provided (allows midnight wrap)
    if (updates.sendingHoursStart !== undefined && updates.sendingHoursEnd !== undefined && !updates.sendingHoursDuration) {
      if (updates.sendingHoursEnd <= updates.sendingHoursStart) {
        throw new Error('sendingHoursEnd must be greater than sendingHoursStart');
      }
    }

    if (updates.minDelayMinutes !== undefined && updates.maxDelayMinutes !== undefined) {
      if (updates.maxDelayMinutes < updates.minDelayMinutes) {
        throw new Error('maxDelayMinutes must be greater than or equal to minDelayMinutes');
      }
    }

    if (updates.dailyEmailLimit !== undefined) {
      if (updates.dailyEmailLimit < 1 || updates.dailyEmailLimit > 2000) {
        throw new Error('dailyEmailLimit must be between 1 and 2000');
      }
    }

    // Get existing settings for this tenant or create if none exist
    const existing = await this.getEhubSettings(tenantId);

    if (existing) {
      const [updated] = await db
        .update(ehubSettings)
        .set({ ...updates, updatedAt: new Date() })
        .where(and(eq(ehubSettings.id, existing.id), eq(ehubSettings.tenantId, tenantId)))
        .returning();
      return this.normalizeEhubSettings(updated);
    } else {
      // Create default settings with provided updates for this tenant
      const [created] = await db
        .insert(ehubSettings)
        .values({
          tenantId,
          minDelayMinutes: 1,
          maxDelayMinutes: 3,
          dailyEmailLimit: 200,
          sendingHoursStart: 9,
          sendingHoursEnd: 14,
          clientWindowStartOffset: '1.00',
          clientWindowEndHour: 14,
          excludedDays: [],
          ...updates,
        })
        .returning();
      return this.normalizeEhubSettings(created);
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

  async getSequence(id: string, tenantId: string): Promise<Sequence | undefined> {
    const [sequence] = await db
      .select()
      .from(sequences)
      .where(and(eq(sequences.id, id), eq(sequences.tenantId, tenantId)))
      .limit(1);
    return sequence;
  }

  async listSequences(tenantId: string, filters?: { createdBy?: string; status?: string; projectId?: string }): Promise<Sequence[]> {
    const conditions = [eq(sequences.tenantId, tenantId)];
    if (filters?.createdBy) {
      conditions.push(eq(sequences.createdBy, filters.createdBy));
    }
    if (filters?.status) {
      conditions.push(eq(sequences.status, filters.status));
    }
    if (filters?.projectId) {
      conditions.push(eq(sequences.projectId, filters.projectId));
    }

    return await db.select().from(sequences).where(and(...conditions)).orderBy(desc(sequences.createdAt));
  }

  async updateSequence(id: string, tenantId: string, updates: Partial<InsertSequence>): Promise<Sequence | undefined> {
    const [updated] = await db
      .update(sequences)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(sequences.id, id), eq(sequences.tenantId, tenantId)))
      .returning();
    return updated;
  }

  async deleteSequence(id: string, tenantId: string): Promise<boolean> {
    const result = await db.delete(sequences).where(and(eq(sequences.id, id), eq(sequences.tenantId, tenantId))).returning();
    return result.length > 0;
  }

  async getOrCreateManualFollowUpsSequence(tenantId: string): Promise<Sequence> {
    // Try to find existing "Manual Follow-Ups" system sequence for this tenant
    const [existing] = await db
      .select()
      .from(sequences)
      .where(and(eq(sequences.isSystem, true), eq(sequences.tenantId, tenantId)))
      .limit(1);

    if (existing) {
      return existing;
    }

    // Create the system sequence for this tenant
    const adminUser = await this.getAdminUserForSequences();
    if (!adminUser) {
      throw new Error('No admin user found to create system sequence');
    }

    const [created] = await db
      .insert(sequences)
      .values({
        tenantId,
        name: 'Manual Follow-Ups',
        isSystem: true,
        status: 'paused', // Start paused - user will activate after adding campaign strategy
        createdBy: adminUser.id,
        stepDelays: ['3', '7', '14'], // 3, 7, 14 days between steps
        // No finalizedStrategy - user will program this themselves
      })
      .returning();

    return created;
  }

  async getAdminUserForSequences(): Promise<{ id: string; name: string } | undefined> {
    const adminUsers = await db
      .select()
      .from(users)
      .where(eq(users.role, 'admin'))
      .limit(1);
    return adminUsers[0];
  }

  async updateSequenceStats(id: string, tenantId: string, stats: { sentCount?: number; failedCount?: number; repliedCount?: number; lastSentAt?: Date }): Promise<Sequence> {
    const [updated] = await db
      .update(sequences)
      .set({ ...stats, updatedAt: new Date() })
      .where(and(eq(sequences.id, id), eq(sequences.tenantId, tenantId)))
      .returning();
    return updated;
  }

  async incrementSequenceSentCount(id: string, tenantId: string): Promise<void> {
    await db.execute(sql`
      UPDATE sequences 
      SET 
        sent_count = sent_count + 1,
        last_sent_at = NOW(),
        updated_at = NOW()
      WHERE id = ${id} AND tenant_id = ${tenantId}
    `);
  }

  async syncSequenceRecipientCounts(tenantId: string): Promise<{ updated: number; sequences: Array<{ id: string; name: string; oldCount: number; newCount: number }> }> {
    // Get all sequences for this tenant
    const allSequences = await db.select().from(sequences).where(eq(sequences.tenantId, tenantId));
    
    const results = [];
    let updated = 0;

    for (const sequence of allSequences) {
      // Count actual recipients (excluding 'removed' status)
      const recipientCount = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(sequenceRecipients)
        .where(
          and(
            eq(sequenceRecipients.sequenceId, sequence.id),
            sql`${sequenceRecipients.status} != 'removed'`
          )
        );

      const actualCount = recipientCount[0]?.count || 0;
      const oldCount = sequence.totalRecipients || 0;

      // Update if counts don't match
      if (actualCount !== oldCount) {
        await db
          .update(sequences)
          .set({ 
            totalRecipients: actualCount,
            updatedAt: new Date()
          })
          .where(and(eq(sequences.id, sequence.id), eq(sequences.tenantId, tenantId)));

        results.push({
          id: sequence.id,
          name: sequence.name,
          oldCount,
          newCount: actualCount
        });
        updated++;
      }
    }

    return { updated, sequences: results };
  }

  // E-Hub Sequence Recipients operations
  async addRecipients(recipients: InsertSequenceRecipient[]): Promise<SequenceRecipient[]> {
    if (recipients.length === 0) return [];

    const created = await db
      .insert(sequenceRecipients)
      .values(recipients)
      .returning();
    
    // Update totalRecipients counter for each affected sequence
    if (created.length > 0) {
      // Group by sequenceId to handle multiple sequences in one batch
      const countsBySequence = created.reduce((acc, recipient) => {
        acc[recipient.sequenceId] = (acc[recipient.sequenceId] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Update each sequence's counter
      for (const [sequenceId, count] of Object.entries(countsBySequence)) {
        await db
          .update(sequences)
          .set({ 
            totalRecipients: sql`${sequences.totalRecipients} + ${count}`,
            updatedAt: new Date()
          })
          .where(eq(sequences.id, sequenceId));
      }
    }
    
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
    // IMPORTANT: Exclude recipients who have replied
    const followUps = await db
      .select()
      .from(sequenceRecipients)
      .where(
        and(
          eq(sequenceRecipients.status, 'in_sequence'),
          gt(sequenceRecipients.currentStep, 0),
          isNull(sequenceRecipients.repliedAt), // Don't send to recipients who have replied
          or(
            isNull(sequenceRecipients.nextSendAt),
            lte(sequenceRecipients.nextSendAt, now)
          )
        )
      )
      .orderBy(sequenceRecipients.nextSendAt)
      .limit(limit);

    // Stage 2: If we haven't filled the quota, get fresh emails (currentStep = 0)
    // Include both 'pending' AND 'in_sequence' status (resumed recipients before step 1)
    // IMPORTANT: Exclude recipients who have replied (shouldn't happen for currentStep=0 but being safe)
    const remaining = limit - followUps.length;
    let freshEmails: SequenceRecipient[] = [];

    if (remaining > 0) {
      freshEmails = await db
        .select()
        .from(sequenceRecipients)
        .where(
          and(
            inArray(sequenceRecipients.status, ['pending', 'in_sequence']),
            eq(sequenceRecipients.currentStep, 0),
            isNull(sequenceRecipients.repliedAt), // Don't send to recipients who have replied
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
    // Note: Timezone balancing removed - Matrix2 uses slot-based scheduling
    return [...followUps, ...freshEmails];
  }

  async getAllPendingRecipients(): Promise<SequenceRecipient[]> {
    // Get ALL in_sequence and pending recipients (no time filter)
    // Used for queue recalculation to ensure all recipients get updated
    return await db
      .select()
      .from(sequenceRecipients)
      .where(
        inArray(sequenceRecipients.status, ['in_sequence', 'pending'])
      )
      .orderBy(sequenceRecipients.nextSendAt);
  }

  async getActiveRecipientsWithThreads(): Promise<SequenceRecipient[]> {
    // Get all recipients with:
    // - status 'in_sequence' (actively receiving emails)
    // - threadId exists (has sent at least one email)
    // - repliedAt is null (hasn't replied yet)
    return await db
      .select()
      .from(sequenceRecipients)
      .where(
        and(
          eq(sequenceRecipients.status, 'in_sequence'),
          isNotNull(sequenceRecipients.threadId),
          isNull(sequenceRecipients.repliedAt)
        )
      );
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

  async getIndividualSendsQueue(options: { search?: string; statusFilter?: 'active' | 'paused' }): Promise<Array<{
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
  }>> {
    const { search, statusFilter = 'active' } = options;

    const now = new Date();

    // Build where conditions based on statusFilter
    const whereConditions: any[] = [
      statusFilter === 'paused'
        ? eq(sequenceRecipients.status, 'paused')
        : or(
            eq(sequenceRecipients.status, 'pending'),
            eq(sequenceRecipients.status, 'in_sequence')
          )
    ];

    // Add search filter if provided
    if (search && search.trim()) {
      const searchLower = search.trim().toLowerCase();
      whereConditions.push(
        or(
          sql`LOWER(${sequenceRecipients.email}) LIKE ${`%${searchLower}%`}`,
          sql`LOWER(${sequenceRecipients.name}) LIKE ${`%${searchLower}%`}`
        )
      );
    }

    // For active recipients, also require nextSendAt to be set
    if (statusFilter === 'active') {
      whereConditions.push(isNotNull(sequenceRecipients.nextSendAt));
    }

    // Get all active recipients with sequence info
    const recipients = await db
      .select({
        id: sequenceRecipients.id,
        sequenceId: sequenceRecipients.sequenceId,
        sequenceName: sql<string>`COALESCE(${sequences.name}, '[Unnamed Sequence]')`.as('sequence_name'),
        email: sequenceRecipients.email,
        name: sequenceRecipients.name,
        status: sequenceRecipients.status,
        currentStep: sequenceRecipients.currentStep,
        nextSendAt: sequenceRecipients.nextSendAt,
        lastStepSentAt: sequenceRecipients.lastStepSentAt,
        threadId: sequenceRecipients.threadId,
        stepDelays: sequences.stepDelays,
        repeatLastStep: sequences.repeatLastStep,
      })
      .from(sequenceRecipients)
      .leftJoin(sequences, eq(sequenceRecipients.sequenceId, sequences.id))
      .where(and(...whereConditions));

    // Build individual send records
    const individualSends: Array<{
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
    }> = [];

    for (const recipient of recipients) {
      // Get sent messages for this recipient
      const sentMessages = await db
        .select()
        .from(sequenceRecipientMessages)
        .where(eq(sequenceRecipientMessages.recipientId, recipient.id))
        .orderBy(sequenceRecipientMessages.stepNumber);

      // Add ALL sent messages (no time window filter for audit history)
      for (const message of sentMessages) {
        individualSends.push({
          recipientId: recipient.id,
          recipientEmail: recipient.email,
          recipientName: recipient.name || '',
          sequenceId: recipient.sequenceId,
          sequenceName: recipient.sequenceName || '',
          stepNumber: message.stepNumber,
          scheduledAt: null, // Sent messages don't have scheduled time
          sentAt: message.sentAt,
          status: 'sent',
          subject: message.subject,
          threadId: message.threadId,
          messageId: message.messageId,
        });
      }

      // For paused recipients, only show sent message history (no future sends)
      if (statusFilter === 'paused') {
        continue; // Skip future send calculations for paused recipients
      }

      // Add the immediate next send for this recipient (active recipients only)
      if (recipient.nextSendAt) {
        const currentStep = recipient.currentStep || 0;
        const nextStep = currentStep + 1;
        const status: 'scheduled' | 'overdue' = recipient.nextSendAt < now ? 'overdue' : 'scheduled';

        individualSends.push({
          recipientId: recipient.id,
          recipientEmail: recipient.email,
          recipientName: recipient.name || '',
          sequenceId: recipient.sequenceId,
          sequenceName: recipient.sequenceName || '',
          stepNumber: nextStep,
          scheduledAt: recipient.nextSendAt,
          sentAt: null,
          status,
          subject: null, // Future sends don't have subject yet
          threadId: recipient.threadId,
          messageId: null,
        });
      }
    }

    // Sort chronologically by scheduled/sent time (deterministic ordering)
    individualSends.sort((a, b) => {
      const timeA = a.sentAt || a.scheduledAt;
      const timeB = b.sentAt || b.scheduledAt;

      if (!timeA && !timeB) return a.recipientId.localeCompare(b.recipientId); // Tie-breaker
      if (!timeA) return 1;
      if (!timeB) return -1;

      const timeDiff = timeA.getTime() - timeB.getTime();
      if (timeDiff !== 0) return timeDiff;

      // Tie-breaker for same time: use recipient ID for stability
      return a.recipientId.localeCompare(b.recipientId);
    });

    // Return next 50 sends chronologically
    return individualSends.slice(0, 50);
  }

  async getPausedRecipients(): Promise<Array<{
    recipientId: string;
    recipientEmail: string;
    recipientName: string;
    sequenceId: string;
    sequenceName: string;
    currentStep: number;
    totalSteps: number;
    lastStepSentAt: Date | null;
    pausedAt: Date | null;
    messageHistory: Array<{
      stepNumber: number;
      subject: string | null;
      sentAt: Date | null;
      threadId: string | null;
      messageId: string | null;
    }>;
  }>> {
    // Fetch all paused recipients with sequence info
    const pausedRecipients = await db
      .select({
        id: sequenceRecipients.id,
        email: sequenceRecipients.email,
        name: sequenceRecipients.name,
        sequenceId: sequenceRecipients.sequenceId,
        currentStep: sequenceRecipients.currentStep,
        lastStepSentAt: sequenceRecipients.lastStepSentAt,
        updatedAt: sequenceRecipients.updatedAt, // pausedAt
        sequenceName: sequences.name,
        stepDelays: sequences.stepDelays,
      })
      .from(sequenceRecipients)
      .leftJoin(sequences, eq(sequenceRecipients.sequenceId, sequences.id))
      .where(eq(sequenceRecipients.status, 'paused'));

    // Build result with message history
    const result = [];

    for (const recipient of pausedRecipients) {
      // Get message history for this recipient
      const messages = await db
        .select({
          stepNumber: sequenceRecipientMessages.stepNumber,
          subject: sequenceRecipientMessages.subject,
          sentAt: sequenceRecipientMessages.sentAt,
          threadId: sequenceRecipientMessages.threadId,
          messageId: sequenceRecipientMessages.messageId,
        })
        .from(sequenceRecipientMessages)
        .where(eq(sequenceRecipientMessages.recipientId, recipient.id))
        .orderBy(sequenceRecipientMessages.stepNumber);

      const totalSteps = recipient.stepDelays ? recipient.stepDelays.length : 0;

      result.push({
        recipientId: recipient.id,
        recipientEmail: recipient.email,
        recipientName: recipient.name || '',
        sequenceId: recipient.sequenceId,
        sequenceName: recipient.sequenceName || '',
        currentStep: recipient.currentStep || 0,
        totalSteps,
        lastStepSentAt: recipient.lastStepSentAt,
        pausedAt: recipient.updatedAt, // updatedAt tracks when paused
        messageHistory: messages,
      });
    }

    // Sort by most recently paused
    result.sort((a, b) => {
      if (!a.pausedAt && !b.pausedAt) return 0;
      if (!a.pausedAt) return 1;
      if (!b.pausedAt) return -1;
      return b.pausedAt.getTime() - a.pausedAt.getTime();
    });

    return result;
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

  async pauseRecipient(id: string): Promise<SequenceRecipient> {
    // Release any Matrix2 slots before pausing
    const { releaseAllRecipientSlots } = await import('./services/Matrix2/matrix2Helper');
    await releaseAllRecipientSlots(id);

    const [updated] = await db
      .update(sequenceRecipients)
      .set({ 
        status: 'paused',
        nextSendAt: null,
        updatedAt: new Date()
      })
      .where(eq(sequenceRecipients.id, id))
      .returning();
    return updated;
  }

  async resumeRecipient(id: string): Promise<SequenceRecipient> {
    // Get recipient with sequence info for validation
    const [result] = await db
      .select({
        recipient: sequenceRecipients,
        sequence: sequences,
      })
      .from(sequenceRecipients)
      .leftJoin(sequences, eq(sequenceRecipients.sequenceId, sequences.id))
      .where(eq(sequenceRecipients.id, id))
      .limit(1);

    if (!result || !result.sequence) {
      throw new Error(`Recipient ${id} or sequence not found`);
    }

    const recipient = result.recipient;
    const sequence = result.sequence;
    const stepDelays = (sequence.stepDelays || []).map((d: string) => parseFloat(d));
    const currentStep = recipient.currentStep || 0;

    // Check if sequence is complete (shouldn't resume if beyond sequence length)
    if (currentStep >= stepDelays.length && !sequence.repeatLastStep) {
      throw new Error(`Recipient ${id} has completed sequence and cannot be resumed`);
    }

    // Matrix2 Note: Set status to 'in_sequence' and clear nextSendAt
    // The Matrix2 slotAssigner will handle scheduling on next cycle

    const [updated] = await db
      .update(sequenceRecipients)
      .set({ 
        status: 'in_sequence',
        nextSendAt: null, // Matrix2 slotAssigner will assign slot
        updatedAt: new Date()
      })
      .where(eq(sequenceRecipients.id, id))
      .returning();
    return updated;
  }

  async getPausedRecipientsCount(): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(sequenceRecipients)
      .where(eq(sequenceRecipients.status, 'paused'));

    return Number(result[0]?.count || 0);
  }

  async getQueueTail(options?: { excludeRecipientId?: string }): Promise<Date | null> {
    // Get the latest scheduled send time from active recipients (across ALL dates)
    // This represents the "tail" of the entire queue
    const conditions = [
      inArray(sequenceRecipients.status, ['pending', 'in_sequence']),
      isNotNull(sequenceRecipients.nextSendAt),
    ];

    if (options?.excludeRecipientId) {
      conditions.push(ne(sequenceRecipients.id, options.excludeRecipientId));
    }

    try {
      const [result] = await db
        .select({ maxSendAt: sql<Date>`MAX(${sequenceRecipients.nextSendAt})` })
        .from(sequenceRecipients)
        .where(and(...conditions));

      return result?.maxSendAt || null;
    } catch (error) {
      console.error('[getQueueTail] Error querying queue tail:', error);
      return null;
    }
  }

  async getDailyScheduledCount(options?: { date?: Date; excludeRecipientId?: string }): Promise<number> {
    // Count recipients scheduled to send within the next 24 hours from now
    // (or from a specific date if provided)
    const now = options?.date || new Date();
    const next24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const conditions = [
      inArray(sequenceRecipients.status, ['pending', 'in_sequence']),
      isNotNull(sequenceRecipients.nextSendAt),
      gte(sequenceRecipients.nextSendAt, now),
      lt(sequenceRecipients.nextSendAt, next24Hours),
    ];

    if (options?.excludeRecipientId) {
      conditions.push(ne(sequenceRecipients.id, options.excludeRecipientId));
    }

    try {
      const [result] = await db
        .select({ count: sql<number>`count(*)` })
        .from(sequenceRecipients)
        .where(and(...conditions));

      return Number(result?.count || 0);
    } catch (error) {
      console.error('[getDailyScheduledCount] Error counting scheduled sends:', error);
      return 0;
    }
  }

  async removeRecipient(id: string): Promise<SequenceRecipient> {
    // Get the recipient first to know which sequence to update
    const [recipient] = await db
      .select()
      .from(sequenceRecipients)
      .where(eq(sequenceRecipients.id, id))
      .limit(1);

    if (!recipient) {
      throw new Error('Recipient not found');
    }

    // Matrix2: Release all slots for this recipient before deletion
    const { releaseAllRecipientSlots } = await import('./services/Matrix2/matrix2Helper');
    await releaseAllRecipientSlots(id);

    // Delete all messages for this recipient
    await db
      .delete(sequenceRecipientMessages)
      .where(eq(sequenceRecipientMessages.recipientId, id));

    // Delete the recipient itself (hard delete, not soft delete)
    await db
      .delete(sequenceRecipients)
      .where(eq(sequenceRecipients.id, id));
    
    // Decrement totalRecipients counter
    await db
      .update(sequences)
      .set({ 
        totalRecipients: sql`GREATEST(${sequences.totalRecipients} - 1, 0)`,
        updatedAt: new Date()
      })
      .where(eq(sequences.id, recipient.sequenceId));
    
    return recipient;
  }

  async sendRecipientNow(id: string): Promise<SequenceRecipient> {
    // Get current recipient to validate
    const [recipient] = await db
      .select()
      .from(sequenceRecipients)
      .where(eq(sequenceRecipients.id, id))
      .limit(1);

    if (!recipient) {
      throw new Error(`Recipient ${id} not found`);
    }

    // Only allow sending for pending/in_sequence recipients
    if (recipient.status !== 'pending' && recipient.status !== 'in_sequence') {
      throw new Error(`Cannot send: recipient status is ${recipient.status}`);
    }

    // Matrix2: Get the recipient's current slot
    const { getRecipientSlot, forceSendNow } = await import('./services/Matrix2/matrix2Helper');
    const slot = await getRecipientSlot(id);

    if (!slot) {
      throw new Error('No slot assigned for this recipient');
    }

    // Force immediate send by setting slot_time_utc to 1 second ago
    await forceSendNow(slot.id);

    // Trigger immediate queue processing instead of waiting 60 seconds
    const { triggerImmediateQueueProcess } = await import('./services/emailQueue');
    triggerImmediateQueueProcess().catch(err => {
      console.error('[Storage] Error triggering immediate queue process:', err);
    });

    // Return updated recipient
    const [updated] = await db
      .select()
      .from(sequenceRecipients)
      .where(eq(sequenceRecipients.id, id))
      .limit(1);

    return updated!;
  }

  async delayRecipient(id: string, hours: number): Promise<SequenceRecipient> {
    // Validate hours input
    if (!Number.isFinite(hours) || hours <= 0 || hours > 720) {
      throw new Error('Hours must be a finite number between 0 and 720 (30 days)');
    }

    // Get current recipient
    const [recipient] = await db
      .select()
      .from(sequenceRecipients)
      .where(eq(sequenceRecipients.id, id))
      .limit(1);

    if (!recipient) {
      throw new Error(`Recipient ${id} not found`);
    }

    // Only allow delaying for pending/in_sequence recipients
    if (recipient.status !== 'pending' && recipient.status !== 'in_sequence') {
      throw new Error(`Cannot delay: recipient status is ${recipient.status}`);
    }

    // Matrix2: Get the recipient's current slot and reschedule it
    const { getRecipientSlot, updateSlotTime } = await import('./services/Matrix2/matrix2Helper');
    const slot = await getRecipientSlot(id);

    if (!slot) {
      throw new Error('No slot assigned for this recipient');
    }

    // Calculate new slot time by adding hours to current slot time
    const delayMs = hours * 60 * 60 * 1000;
    const newSlotTime = new Date(slot.slotTimeUtc.getTime() + delayMs);
    
    // Update slot with new time
    await updateSlotTime(slot.id, newSlotTime);

    // Return updated recipient
    const [updated] = await db
      .select()
      .from(sequenceRecipients)
      .where(eq(sequenceRecipients.id, id))
      .limit(1);

    return updated!;
  }

  async skipRecipientStep(id: string): Promise<SequenceRecipient> {
    // Get recipient with sequence info
    const [recipientData] = await db
      .select({
        recipient: sequenceRecipients,
        stepDelays: sequences.stepDelays,
        repeatLastStep: sequences.repeatLastStep,
      })
      .from(sequenceRecipients)
      .leftJoin(sequences, eq(sequenceRecipients.sequenceId, sequences.id))
      .where(eq(sequenceRecipients.id, id))
      .limit(1);

    if (!recipientData) {
      throw new Error(`Recipient ${id} not found`);
    }

    const { recipient, stepDelays, repeatLastStep } = recipientData;
    const oldCurrentStep = recipient.currentStep || 0;
    const newStep = oldCurrentStep + 1;
    const delays = stepDelays ? stepDelays.map((d: string) => parseFloat(d)) : [];
    const now = new Date();

    // Matrix2: Release current slot before advancing step
    const { releaseAllRecipientSlots } = await import('./services/Matrix2/matrix2Helper');
    await releaseAllRecipientSlots(id);

    // Determine status based on sequence completion
    let recipientStatus = 'in_sequence';
    if (newStep >= delays.length && !repeatLastStep) {
      recipientStatus = 'completed';
    }

    // With Matrix2: clear nextSendAt and let slotAssigner schedule it on next cycle
    const [updated] = await db
      .update(sequenceRecipients)
      .set({ 
        currentStep: newStep,
        nextSendAt: null, // Matrix2 will assign slot on next cycle
        status: recipientStatus,
        updatedAt: now
      })
      .where(eq(sequenceRecipients.id, id))
      .returning();

    return updated;
  }

  // E-Hub Sequence Scheduled Sends operations
  async insertScheduledSends(sends: InsertSequenceScheduledSend[]): Promise<SequenceScheduledSend[]> {
    if (sends.length === 0) return [];

    const created = await db
      .insert(sequenceScheduledSends)
      .values(sends)
      .returning();
    return created;
  }

  async getNextScheduledSends(limit: number): Promise<SequenceScheduledSend[]> {
    const now = new Date();

    // Single query with conditional ordering: step 1 emails first, then by scheduled time
    // Uses CASE expression to prioritize stepNumber = 1, then orders by scheduledAt
    // Manual overrides (Send Now) bypass sequence pause status
    const results = await db
      .select()
      .from(sequenceScheduledSends)
      .innerJoin(sequences, eq(sequenceScheduledSends.sequenceId, sequences.id))
      .where(
        and(
          eq(sequenceScheduledSends.status, 'pending'),
          lte(sequenceScheduledSends.scheduledAt, now),
          or(
            eq(sequences.status, 'active'), // Normal sends from active sequences
            eq(sequenceScheduledSends.manualOverride, true) // Manual "Send Now" bypasses pause
          )
        )
      )
      .orderBy(
        sql`CASE WHEN ${sequenceScheduledSends.stepNumber} = 1 THEN 0 ELSE 1 END`,
        sequenceScheduledSends.scheduledAt
      )
      .limit(limit);

    return results.map(row => row.sequenceScheduledSends);
  }

  async getUpcomingScheduledSends(limit: number): Promise<SequenceScheduledSend[]> {
    // Get upcoming pending sends for queue view - no time filter
    return await db
      .select()
      .from(sequenceScheduledSends)
      .where(eq(sequenceScheduledSends.status, 'pending'))
      .orderBy(sequenceScheduledSends.scheduledAt)
      .limit(limit);
  }

  async getLastScheduledSendForUser(userId: string): Promise<SequenceScheduledSend | null> {
    // Get the latest scheduledAt time for this user's sequences (FIFO queue tail)
    // Used to enforce queue ordering when scheduling new sends
    const results = await db
      .select()
      .from(sequenceScheduledSends)
      .innerJoin(sequences, eq(sequenceScheduledSends.sequenceId, sequences.id))
      .where(
        and(
          eq(sequences.createdBy, userId),
          isNotNull(sequenceScheduledSends.scheduledAt)
        )
      )
      .orderBy(desc(sequenceScheduledSends.scheduledAt))
      .limit(1);

    return results.length > 0 ? results[0].sequenceScheduledSends : null;
  }

  async clearScheduledAtForPendingSends(imminentThreshold: Date): Promise<number> {
    // Clear scheduled_at for all pending sends (except imminent ones)
    // This allows coordinator to reschedule them with new settings
    // Preserves eligible_at (sequence logic intact)

    // Step 1: Clear scheduled sends
    const updated = await db
      .update(sequenceScheduledSends)
      .set({ 
        scheduledAt: null,
        jitterMinutes: null
      })
      .where(and(
        eq(sequenceScheduledSends.status, 'pending'),
        or(
          isNull(sequenceScheduledSends.scheduledAt),
          gte(sequenceScheduledSends.scheduledAt, imminentThreshold)
        )
      ))
      .returning({ recipientId: sequenceScheduledSends.recipientId });

    // Step 2: Clear nextSendAt for affected recipients (critical for coordinator to reschedule)
    if (updated.length > 0) {
      const recipientIds = [...new Set(updated.map(r => r.recipientId))];
      await db
        .update(sequenceRecipients)
        .set({ nextSendAt: null })
        .where(inArray(sequenceRecipients.id, recipientIds));
    }

    return updated.length;
  }

  async deleteRecipientScheduledSends(recipientId: string): Promise<number> {
    // Only delete pending sends - preserve sent records for audit trail
    const deleted = await db
      .delete(sequenceScheduledSends)
      .where(and(
        eq(sequenceScheduledSends.recipientId, recipientId),
        eq(sequenceScheduledSends.status, 'pending')
      ))
      .returning();
    return deleted.length;
  }

  async deleteAllPendingScheduledSends(sequenceId?: string): Promise<number> {
    const conditions = [eq(sequenceScheduledSends.status, 'pending')];

    if (sequenceId) {
      conditions.push(eq(sequenceScheduledSends.sequenceId, sequenceId));
    }

    const deleted = await db
      .delete(sequenceScheduledSends)
      .where(and(...conditions))
      .returning();
    return deleted.length;
  }

  async updateScheduledSend(id: string, updates: Partial<InsertSequenceScheduledSend>): Promise<SequenceScheduledSend> {
    const [updated] = await db
      .update(sequenceScheduledSends)
      .set(updates)
      .where(eq(sequenceScheduledSends.id, id))
      .returning();
    return updated;
  }

  async claimScheduledSend(id: string): Promise<boolean> {
    // Atomically claim a scheduled send by setting status='processing'
    // Only updates if status is currently 'pending' (prevents double-processing)
    const [updated] = await db
      .update(sequenceScheduledSends)
      .set({ status: 'processing' })
      .where(and(
        eq(sequenceScheduledSends.id, id),
        eq(sequenceScheduledSends.status, 'pending')
      ))
      .returning();
    return !!updated;
  }

  async getScheduledSendsByRecipient(recipientId: string): Promise<SequenceScheduledSend[]> {
    return await db
      .select()
      .from(sequenceScheduledSends)
      .where(eq(sequenceScheduledSends.recipientId, recipientId))
      .orderBy(sequenceScheduledSends.scheduledAt);
  }

  async getScheduledSendsQueue(options: { search?: string; statusFilter?: 'active' | 'paused'; limit: number; timeWindowDays?: number }): Promise<Array<{
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
  }>> {
    const { search, statusFilter = 'active', limit, timeWindowDays = 3 } = options;

    const now = new Date();
    const endTime = new Date(now.getTime() + timeWindowDays * 24 * 60 * 60 * 1000);
    const nowUtc = now.toISOString();

    // Build base query joining scheduled sends with recipients and sequences
    const whereConditions: any[] = [];

    // Filter by recipient status (active or paused)
    if (statusFilter === 'paused') {
      whereConditions.push(eq(sequenceRecipients.status, 'paused'));
    } else {
      // Active: pending or in_sequence recipients
      whereConditions.push(
        or(
          eq(sequenceRecipients.status, 'pending'),
          eq(sequenceRecipients.status, 'in_sequence')
        )
      );
    }

    // Filter by scheduled send status - ONLY pending for both active and paused
    // Exclude sent/cancelled to ensure limit covers future work
    whereConditions.push(eq(sequenceScheduledSends.status, 'pending'));

    // Add search filter if provided
    if (search && search.trim()) {
      const searchLower = search.trim().toLowerCase();
      whereConditions.push(
        or(
          sql`LOWER(${sequenceRecipients.email}) LIKE ${`%${searchLower}%`}`,
          sql`LOWER(${sequenceRecipients.name}) LIKE ${`%${searchLower}%`}`
        )
      );
    }

    // Add time window filter for active searches
    if (statusFilter === 'active') {
      whereConditions.push(
        and(
          isNotNull(sequenceScheduledSends.scheduledAt),
          lte(sequenceScheduledSends.scheduledAt, endTime)
        )
      );
    }

    // Query scheduled sends with recipient and sequence info
    const query = db
      .select({
        id: sequenceScheduledSends.id,
        recipientId: sequenceScheduledSends.recipientId,
        recipientEmail: sequenceRecipients.email,
        recipientName: sequenceRecipients.name,
        sequenceId: sequenceScheduledSends.sequenceId,
        sequenceName: sql<string>`COALESCE(${sequences.name}, '[Unnamed Sequence]')`.as('sequence_name'),
        stepNumber: sequenceScheduledSends.stepNumber,
        scheduledAt: sequenceScheduledSends.scheduledAt,
        sentAt: sequenceScheduledSends.sentAt,
        sendStatus: sequenceScheduledSends.status,
        subject: sequenceScheduledSends.subject,
        threadId: sequenceScheduledSends.threadId,
        messageId: sequenceScheduledSends.messageId,
      })
      .from(sequenceScheduledSends)
      .innerJoin(sequenceRecipients, eq(sequenceScheduledSends.recipientId, sequenceRecipients.id))
      .leftJoin(sequences, eq(sequenceScheduledSends.sequenceId, sequences.id))
      .where(and(...whereConditions))
      .orderBy(sequenceScheduledSends.scheduledAt)
      .limit(limit);

    const results = await db.execute(query);

    // Transform to expected format with status calculation
    return results.map((row: any) => ({
      recipientId: row.recipientId,
      recipientEmail: row.recipientEmail,
      recipientName: row.recipientName,
      sequenceId: row.sequenceId,
      sequenceName: row.sequenceName,
      stepNumber: row.stepNumber,
      scheduledAt: row.scheduledAt,
      sentAt: row.sentAt,
      status: row.sendStatus === 'sent' 
        ? 'sent' 
        : (row.scheduledAt && row.scheduledAt < now ? 'overdue' : 'scheduled'),
      subject: row.subject,
      threadId: row.threadId,
      messageId: row.messageId,
    }));
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

  async deleteRecipientMessages(recipientId: string): Promise<void> {
    await db
      .delete(sequenceRecipientMessages)
      .where(eq(sequenceRecipientMessages.recipientId, recipientId));
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

  // Test Data Nuke operations
  async getTestDataNukeCounts(emailPattern?: string): Promise<{
    recipientsCount: number;
    messagesCount: number;
    testEmailsCount: number;
    slotsCount: number;
  }> {
    // Build email filter - if pattern provided, match it; otherwise match all (%)
    const buildEmailFilter = (emailColumn: any) => {
      if (!emailPattern) {
        return sql`1=1`; // Match all
      }
      // Sanitize pattern: if it doesn't contain wildcards, add them for domain matching
      const sanitizedPattern = emailPattern.includes('%') || emailPattern.includes('_')
        ? emailPattern
        : `%${emailPattern}%`;
      return sql`${emailColumn} ILIKE ${sanitizedPattern}`;
    };

    // Count recipients
    const [recipientsResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(sequenceRecipients)
      .where(buildEmailFilter(sequenceRecipients.email));

    const recipientsCount = recipientsResult?.count || 0;

    // Count messages for matching recipients
    const [messagesResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(sequenceRecipientMessages)
      .where(sql`${sequenceRecipientMessages.recipientId} IN (
        SELECT ${sequenceRecipients.id} 
        FROM ${sequenceRecipients} 
        WHERE ${buildEmailFilter(sequenceRecipients.email)}
      )`);

    const messagesCount = messagesResult?.count || 0;

    // Count test emails
    const [testEmailsResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(testEmailSends)
      .where(buildEmailFilter(testEmailSends.recipientEmail));

    const testEmailsCount = testEmailsResult?.count || 0;

    // Count daily send slots for matching recipients
    const [slotsResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(dailySendSlots)
      .where(sql`${dailySendSlots.recipientId} IN (
        SELECT CAST(${sequenceRecipients.id} AS uuid) 
        FROM ${sequenceRecipients} 
        WHERE ${buildEmailFilter(sequenceRecipients.email)}
      )`);

    const slotsCount = slotsResult?.count || 0;

    return {
      recipientsCount,
      messagesCount,
      testEmailsCount,
      slotsCount,
    };
  }

  async nukeTestData(userId: string, emailPattern?: string): Promise<{
    recipientsDeleted: number;
    messagesDeleted: number;
    testEmailsDeleted: number;
    slotsDeleted: number;
  }> {
    return await db.transaction(async (tx) => {
      // Build email filter - reuse same logic as counts
      const buildEmailFilter = (emailColumn: any) => {
        if (!emailPattern) {
          return sql`1=1`; // Match all
        }
        const sanitizedPattern = emailPattern.includes('%') || emailPattern.includes('_')
          ? emailPattern
          : `%${emailPattern}%`;
        return sql`${emailColumn} ILIKE ${sanitizedPattern}`;
      };

      // Step 0: Collect affected sequence IDs before deletion
      const affectedRecipients = await tx
        .select({ sequenceId: sequenceRecipients.sequenceId })
        .from(sequenceRecipients)
        .where(buildEmailFilter(sequenceRecipients.email));

      const affectedSequenceIds = [...new Set(affectedRecipients.map(r => r.sequenceId))];

      // Step 1: Delete messages first (child records)
      const deletedMessages = await tx
        .delete(sequenceRecipientMessages)
        .where(sql`${sequenceRecipientMessages.recipientId} IN (
          SELECT ${sequenceRecipients.id} 
          FROM ${sequenceRecipients} 
          WHERE ${buildEmailFilter(sequenceRecipients.email)}
        )`)
        .returning({ id: sequenceRecipientMessages.id });

      const messagesDeleted = deletedMessages.length;

      // Step 2: Delete daily send slots (child records - must happen BEFORE deleting recipients)
      const deletedSlots = await tx
        .delete(dailySendSlots)
        .where(sql`${dailySendSlots.recipientId} IN (
          SELECT CAST(${sequenceRecipients.id} AS uuid) 
          FROM ${sequenceRecipients} 
          WHERE ${buildEmailFilter(sequenceRecipients.email)}
        )`)
        .returning({ id: dailySendSlots.id });

      const slotsDeleted = deletedSlots.length;

      // Step 3: Delete recipients (parent records)
      const deletedRecipients = await tx
        .delete(sequenceRecipients)
        .where(buildEmailFilter(sequenceRecipients.email))
        .returning({ id: sequenceRecipients.id });

      const recipientsDeleted = deletedRecipients.length;

      // Step 4: Delete test emails (independent table)
      const deletedTestEmails = await tx
        .delete(testEmailSends)
        .where(buildEmailFilter(testEmailSends.recipientEmail))
        .returning({ id: testEmailSends.id });

      const testEmailsDeleted = deletedTestEmails.length;

      // Step 5: Recalculate stats for affected sequences AND fix any orphaned sequences
      // Find all sequences with non-zero counts
      const sequencesWithCounts = await tx
        .select({ id: sequences.id })
        .from(sequences)
        .where(
          or(
            gt(sequences.totalRecipients, 0),
            gt(sequences.sentCount, 0),
            gt(sequences.repliedCount, 0),
            gt(sequences.failedCount, 0),
            gt(sequences.bouncedCount, 0)
          )
        );

      // Combine affected sequences with sequences that have stale counts
      const allSequenceIdsToFix = [...new Set([
        ...affectedSequenceIds,
        ...sequencesWithCounts.map(s => s.id)
      ])];

      for (const sequenceId of allSequenceIdsToFix) {
        // Count remaining recipients for this sequence
        const [recipientCount] = await tx
          .select({ count: sql<number>`count(*)::int` })
          .from(sequenceRecipients)
          .where(eq(sequenceRecipients.sequenceId, sequenceId));

        const remainingRecipients = recipientCount?.count || 0;

        if (remainingRecipients === 0) {
          // No recipients left - reset all stats to 0
          await tx
            .update(sequences)
            .set({
              totalRecipients: 0,
              sentCount: 0,
              failedCount: 0,
              repliedCount: 0,
              bouncedCount: 0,
              lastSentAt: null,
              updatedAt: new Date(),
            })
            .where(eq(sequences.id, sequenceId));
        } else {
          // Has remaining recipients - recalculate stats from actual data
          const [stats] = await tx
            .select({
              sent: sql<number>`count(*) filter (where ${sequenceRecipientMessages.sentAt} is not null)::int`,
              replied: sql<number>`count(distinct ${sequenceRecipients.id}) filter (where ${sequenceRecipients.repliedAt} is not null)::int`,
              failed: sql<number>`count(distinct ${sequenceRecipients.id}) filter (where ${sequenceRecipients.status} = 'failed')::int`,
              bounced: sql<number>`count(distinct ${sequenceRecipients.id}) filter (where ${sequenceRecipients.bounceType} is not null)::int`,
              lastSent: sql<Date>`max(${sequenceRecipientMessages.sentAt})`,
            })
            .from(sequenceRecipients)
            .leftJoin(sequenceRecipientMessages, eq(sequenceRecipients.id, sequenceRecipientMessages.recipientId))
            .where(eq(sequenceRecipients.sequenceId, sequenceId));

          await tx
            .update(sequences)
            .set({
              totalRecipients: remainingRecipients,
              sentCount: stats?.sent || 0,
              repliedCount: stats?.replied || 0,
              failedCount: stats?.failed || 0,
              bouncedCount: stats?.bounced || 0,
              lastSentAt: stats?.lastSent || null,
              updatedAt: new Date(),
            })
            .where(eq(sequences.id, sequenceId));
        }
      }

      // Step 6: Log the nuke operation (in-transaction)
      await tx.insert(testDataNukeLog).values({
        executedBy: userId,
        emailPattern: emailPattern || null,
        recipientsDeleted,
        messagesDeleted,
        testEmailsDeleted,
      });

      return {
        recipientsDeleted,
        messagesDeleted,
        testEmailsDeleted,
        slotsDeleted,
      };
    });
  }

  async logTestDataNuke(log: InsertTestDataNukeLog): Promise<TestDataNukeLog> {
    const [created] = await db.insert(testDataNukeLog).values(log).returning();
    return created;
  }

  // Matrix2 Email Sender: Get recipient by ID (used in email sending)
  async getRecipientById(recipientId: string): Promise<any | null> {
    try {
      const { sql } = await import('drizzle-orm');
      const result = await db.execute(sql`
        SELECT 
          sr.id,
          sr.email,
          sr.name,
          sr.link,
          sr.sales_summary as "salesSummary",
          sr.sequence_id as "sequenceId",
          sr.current_step as "currentStep",
          sr.timezone,
          sr.business_hours,
          sr.state,
          sr.status,
          sr.last_step_sent_at as "lastStepSentAt",
          s.id as "seqId",
          s.step_delays as "stepDelays"
        FROM sequence_recipients sr
        LEFT JOIN sequences s ON sr.sequence_id = s.id
        WHERE sr.id = ${recipientId}
        LIMIT 1
      `);
      return (result as any).rows?.[0] || null;
    } catch (error) {
      console.error(`[Storage] Error fetching recipient ${recipientId}:`, error);
      return null;
    }
  }

  // Get sequence by ID (used in email sending)
  async getSequenceById(sequenceId: string): Promise<any | null> {
    try {
      const { sql } = await import('drizzle-orm');
      const result = await db.execute(sql`
        SELECT 
          id,
          name,
          tenant_id as "tenantId",
          created_by as "createdBy",
          strategy_transcript as "strategyTranscript",
          finalized_strategy as "finalizedStrategy",
          step_delays as "stepDelays",
          repeat_last_step as "repeatLastStep",
          status
        FROM sequences
        WHERE id = ${sequenceId}
        LIMIT 1
      `);
      return (result as any).rows?.[0] || null;
    } catch (error) {
      console.error(`[Storage] Error fetching sequence ${sequenceId}:`, error);
      return null;
    }
  }

  // Get admin user (used in email sending)
  async getAdminUser(): Promise<any | null> {
    try {
      const { sql } = await import('drizzle-orm');
      const result = await db.execute(sql`
        SELECT 
          id,
          email,
          first_name as "firstName",
          last_name as "lastName"
        FROM users
        WHERE role = 'admin'
        ORDER BY created_at ASC
        LIMIT 1
      `);
      const adminUser = (result as any).rows?.[0] || null;
      return adminUser;
    } catch (error) {
      console.error(`[Storage] Error fetching admin user:`, error);
      return null;
    }
  }

  // Get admin user's default tenantId (for background services)
  async getAdminTenantId(): Promise<string | null> {
    try {
      const { sql } = await import('drizzle-orm');
      const result = await db.execute(sql`
        SELECT ut.tenant_id as "tenantId"
        FROM users u
        JOIN user_tenants ut ON u.id = ut.user_id
        WHERE u.role = 'admin'
          AND ut.is_default = TRUE
        ORDER BY u.created_at ASC
        LIMIT 1
      `);
      return (result as any).rows?.[0]?.tenantId || null;
    } catch (error) {
      console.error(`[Storage] Error fetching admin tenant:`, error);
      return null;
    }
  }

  // Update recipient after email sent (used in email sender)
  async updateRecipient(recipientId: string, updates: any): Promise<any> {
    try {
      const { sql } = await import('drizzle-orm');
      const result = await db.execute(sql`
        UPDATE sequence_recipients
        SET
          current_step = ${updates.currentStep || sql`current_step`},
          last_step_sent_at = ${updates.lastStepSentAt || sql`last_step_sent_at`},
          status = ${updates.status || sql`status`},
          thread_id = ${updates.threadId || sql`thread_id`},
          updated_at = NOW()
        WHERE id = ${recipientId}
        RETURNING *
      `);
      return (result as any).rows?.[0] || null;
    } catch (error) {
      console.error(`[Storage] Error updating recipient ${recipientId}:`, error);
      return null;
    }
  }

  // Insert recipient message record (used in email sender)
  async insertRecipientMessage(message: any): Promise<any> {
    try {
      const { sql } = await import('drizzle-orm');
      // Store RFC822 Message-ID (for threading) - falls back to Gmail ID if not available
      const messageIdToStore = message.rfc822MessageId || message.gmailMessageId || null;
      const result = await db.execute(sql`
        INSERT INTO sequence_recipient_messages (
          id,
          recipient_id,
          step_number,
          subject,
          body,
          sent_at,
          message_id,
          thread_id
        )
        VALUES (
          ${message.id},
          ${message.recipientId},
          ${message.stepNumber},
          ${message.subject || null},
          ${message.body || null},
          ${message.sentAt || sql`NOW()`},
          ${messageIdToStore},
          ${message.gmailThreadId || null}
        )
        RETURNING *
      `);
      return (result as any).rows?.[0] || null;
    } catch (error) {
      console.error(`[Storage] Error inserting recipient message:`, error);
      return null;
    }
  }

  // No-Send Dates operations
  async getNoSendDates(): Promise<NoSendDate[]> {
    return await db.select().from(noSendDates).orderBy(noSendDates.date);
  }

  async getNoSendDate(id: string): Promise<NoSendDate | undefined> {
    const [noSendDate] = await db.select().from(noSendDates).where(eq(noSendDates.id, id));
    return noSendDate;
  }

  async createNoSendDate(data: InsertNoSendDate): Promise<NoSendDate> {
    const [created] = await db.insert(noSendDates).values(data).returning();
    return created;
  }

  async deleteNoSendDate(id: string): Promise<void> {
    await db.delete(noSendDates).where(eq(noSendDates.id, id));
  }

  // Ignored Holidays operations (tenant-aware)
  async getIgnoredHolidays(tenantId: string): Promise<IgnoredHoliday[]> {
    return await db.select().from(ignoredHolidays).where(eq(ignoredHolidays.tenantId, tenantId));
  }

  async getIgnoredHolidayByHolidayId(tenantId: string, holidayId: string): Promise<IgnoredHoliday | undefined> {
    const [holiday] = await db.select().from(ignoredHolidays).where(
      and(eq(ignoredHolidays.tenantId, tenantId), eq(ignoredHolidays.holidayId, holidayId))
    );
    return holiday;
  }

  async createIgnoredHoliday(data: InsertIgnoredHoliday): Promise<IgnoredHoliday> {
    const [created] = await db.insert(ignoredHolidays).values(data).returning();
    return created;
  }

  async deleteIgnoredHoliday(tenantId: string, holidayId: string): Promise<void> {
    await db.delete(ignoredHolidays).where(
      and(eq(ignoredHolidays.tenantId, tenantId), eq(ignoredHolidays.holidayId, holidayId))
    );
  }

  // Qualification Campaign operations
  async listQualificationCampaigns(tenantId: string): Promise<QualificationCampaign[]> {
    return await db.select()
      .from(qualificationCampaigns)
      .where(eq(qualificationCampaigns.tenantId, tenantId))
      .orderBy(desc(qualificationCampaigns.createdAt));
  }

  async getQualificationCampaign(id: string, tenantId: string): Promise<QualificationCampaign | undefined> {
    const [campaign] = await db.select()
      .from(qualificationCampaigns)
      .where(and(eq(qualificationCampaigns.id, id), eq(qualificationCampaigns.tenantId, tenantId)));
    return campaign;
  }

  async createQualificationCampaign(data: InsertQualificationCampaign): Promise<QualificationCampaign> {
    const [created] = await db.insert(qualificationCampaigns).values(data).returning();
    return created;
  }

  async updateQualificationCampaign(id: string, tenantId: string, updates: Partial<InsertQualificationCampaign>): Promise<QualificationCampaign> {
    const [updated] = await db.update(qualificationCampaigns)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(qualificationCampaigns.id, id), eq(qualificationCampaigns.tenantId, tenantId)))
      .returning();
    return updated;
  }

  async deleteQualificationCampaign(id: string, tenantId: string): Promise<boolean> {
    const result = await db.delete(qualificationCampaigns)
      .where(and(eq(qualificationCampaigns.id, id), eq(qualificationCampaigns.tenantId, tenantId)));
    return (result as any).rowCount > 0;
  }

  // Qualification Lead operations
  async listQualificationLeads(tenantId: string, filters?: { campaignId?: string; status?: string; callStatus?: string; projectId?: string; limit?: number; offset?: number }): Promise<{ leads: QualificationLead[]; total: number }> {
    const conditions = [eq(qualificationLeads.tenantId, tenantId)];
    
    if (filters?.campaignId) {
      conditions.push(eq(qualificationLeads.campaignId, filters.campaignId));
    }
    if (filters?.status) {
      conditions.push(eq(qualificationLeads.status, filters.status));
    }
    if (filters?.callStatus) {
      conditions.push(eq(qualificationLeads.callStatus, filters.callStatus));
    }

    // Project filtering: filter leads by direct project_id column
    // Fallback to category-based matching ONLY for leads without a project_id (legacy leads)
    if (filters?.projectId) {
      // Get categories for this project for backwards compatibility with legacy leads
      const projectCategories = await db
        .select({ name: categories.name })
        .from(categories)
        .where(and(
          eq(categories.tenantId, tenantId),
          or(eq(categories.projectId, filters.projectId), isNull(categories.projectId))
        ));
      const categoryNames = projectCategories.map(c => c.name.toLowerCase());
      
      // Match leads with direct projectId, OR legacy leads (no projectId) that match category
      if (categoryNames.length > 0) {
        conditions.push(or(
          eq(qualificationLeads.projectId, filters.projectId),
          and(
            isNull(qualificationLeads.projectId),
            inArray(sql`LOWER(${qualificationLeads.category})`, categoryNames)
          )
        ));
      } else {
        // No categories for project - only match leads with direct projectId
        conditions.push(eq(qualificationLeads.projectId, filters.projectId));
      }
    }

    const limit = filters?.limit || 100;
    const offset = filters?.offset || 0;

    const leads = await db.select()
      .from(qualificationLeads)
      .where(and(...conditions))
      .orderBy(desc(qualificationLeads.createdAt))
      .limit(limit)
      .offset(offset);

    const [{ count }] = await db.select({ count: sql<number>`count(*)` })
      .from(qualificationLeads)
      .where(and(...conditions));

    return { leads, total: Number(count) };
  }

  async getQualificationLead(id: string, tenantId: string): Promise<QualificationLead | undefined> {
    const [lead] = await db.select()
      .from(qualificationLeads)
      .where(and(eq(qualificationLeads.id, id), eq(qualificationLeads.tenantId, tenantId)));
    return lead;
  }

  async findQualificationLeadBySourceId(tenantId: string, sourceId: string): Promise<QualificationLead | undefined> {
    const [lead] = await db.select()
      .from(qualificationLeads)
      .where(and(
        eq(qualificationLeads.tenantId, tenantId),
        eq(qualificationLeads.sourceId, sourceId)
      ));
    return lead;
  }

  async createQualificationLead(data: InsertQualificationLead): Promise<QualificationLead> {
    const [created] = await db.insert(qualificationLeads).values(data).returning();
    return created;
  }

  async createQualificationLeads(leads: InsertQualificationLead[]): Promise<QualificationLead[]> {
    if (leads.length === 0) return [];
    return await db.insert(qualificationLeads).values(leads).returning();
  }

  async updateQualificationLead(id: string, tenantId: string, updates: Partial<InsertQualificationLead>): Promise<QualificationLead> {
    const [updated] = await db.update(qualificationLeads)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(qualificationLeads.id, id), eq(qualificationLeads.tenantId, tenantId)))
      .returning();
    return updated;
  }

  async deleteQualificationLead(id: string, tenantId: string): Promise<boolean> {
    const result = await db.delete(qualificationLeads)
      .where(and(eq(qualificationLeads.id, id), eq(qualificationLeads.tenantId, tenantId)));
    return (result as any).rowCount > 0;
  }

  async deleteQualificationLeads(ids: string[], tenantId: string): Promise<number> {
    if (ids.length === 0) return 0;
    const result = await db.delete(qualificationLeads)
      .where(and(inArray(qualificationLeads.id, ids), eq(qualificationLeads.tenantId, tenantId)));
    return (result as any).rowCount || 0;
  }

  async getQualificationLeadStats(tenantId: string, campaignId?: string, projectId?: string): Promise<{ total: number; byStatus: Record<string, number>; byCallStatus: Record<string, number>; averageScore: number | null }> {
    const conditions = [eq(qualificationLeads.tenantId, tenantId)];
    if (campaignId) {
      conditions.push(eq(qualificationLeads.campaignId, campaignId));
    }

    // Project filtering: filter leads by direct project_id column
    // Fallback to category-based matching ONLY for leads without a project_id (legacy leads)
    if (projectId) {
      const projectCategories = await db
        .select({ name: categories.name })
        .from(categories)
        .where(and(
          eq(categories.tenantId, tenantId),
          or(eq(categories.projectId, projectId), isNull(categories.projectId))
        ));
      const categoryNames = projectCategories.map(c => c.name.toLowerCase());
      
      // Match leads with direct projectId, OR legacy leads (no projectId) that match category
      if (categoryNames.length > 0) {
        conditions.push(or(
          eq(qualificationLeads.projectId, projectId),
          and(
            isNull(qualificationLeads.projectId),
            inArray(sql`LOWER(${qualificationLeads.category})`, categoryNames)
          )
        ));
      } else {
        // No categories for project - only match leads with direct projectId
        conditions.push(eq(qualificationLeads.projectId, projectId));
      }
    }

    const leads = await db.select()
      .from(qualificationLeads)
      .where(and(...conditions));

    const byStatus: Record<string, number> = {};
    const byCallStatus: Record<string, number> = {};
    let scoreSum = 0;
    let scoreCount = 0;

    for (const lead of leads) {
      const status = lead.status || 'new';
      const callStatus = lead.callStatus || 'pending';
      byStatus[status] = (byStatus[status] || 0) + 1;
      byCallStatus[callStatus] = (byCallStatus[callStatus] || 0) + 1;
      if (lead.score !== null) {
        scoreSum += lead.score;
        scoreCount++;
      }
    }

    return {
      total: leads.length,
      byStatus,
      byCallStatus,
      averageScore: scoreCount > 0 ? Math.round(scoreSum / scoreCount) : null
    };
  }

  // Email Accounts Pool operations
  async listEmailAccounts(tenantId: string): Promise<EmailAccount[]> {
    return await db.select()
      .from(emailAccounts)
      .where(eq(emailAccounts.tenantId, tenantId))
      .orderBy(desc(emailAccounts.createdAt));
  }

  async getEmailAccount(id: string, tenantId: string): Promise<EmailAccount | undefined> {
    const [account] = await db.select()
      .from(emailAccounts)
      .where(and(eq(emailAccounts.id, id), eq(emailAccounts.tenantId, tenantId)));
    return account;
  }

  async getEmailAccountByEmail(tenantId: string, email: string): Promise<EmailAccount | undefined> {
    const [account] = await db.select()
      .from(emailAccounts)
      .where(and(eq(emailAccounts.tenantId, tenantId), eq(emailAccounts.email, email)));
    return account;
  }

  async createEmailAccount(data: InsertEmailAccount): Promise<EmailAccount> {
    const [created] = await db.insert(emailAccounts).values(data).returning();
    return created;
  }

  async updateEmailAccount(id: string, tenantId: string, updates: Partial<InsertEmailAccount>): Promise<EmailAccount> {
    const [updated] = await db.update(emailAccounts)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(emailAccounts.id, id), eq(emailAccounts.tenantId, tenantId)))
      .returning();
    return updated;
  }

  async deleteEmailAccount(id: string, tenantId: string): Promise<boolean> {
    const result = await db.delete(emailAccounts)
      .where(and(eq(emailAccounts.id, id), eq(emailAccounts.tenantId, tenantId)));
    return (result as any).rowCount > 0;
  }

  async incrementEmailAccountDailySendCount(id: string, tenantId: string): Promise<EmailAccount> {
    const today = new Date().toISOString().split('T')[0];
    const account = await this.getEmailAccount(id, tenantId);
    if (!account) throw new Error('Email account not found');

    const lastReset = account.lastSendCountReset;
    const needsReset = !lastReset || lastReset !== today;

    const [updated] = await db.update(emailAccounts)
      .set({
        dailySendCount: needsReset ? 1 : (account.dailySendCount || 0) + 1,
        lastSendCountReset: today,
        lastUsedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(emailAccounts.id, id), eq(emailAccounts.tenantId, tenantId)))
      .returning();
    return updated;
  }

  async getAvailableEmailAccount(tenantId: string, maxDailyLimit: number): Promise<EmailAccount | undefined> {
    const today = new Date().toISOString().split('T')[0];
    const accounts = await db.select()
      .from(emailAccounts)
      .where(and(
        eq(emailAccounts.tenantId, tenantId),
        eq(emailAccounts.status, 'active')
      ))
      .orderBy(emailAccounts.dailySendCount);

    for (const account of accounts) {
      const lastReset = account.lastSendCountReset;
      const needsReset = !lastReset || lastReset !== today;
      const currentCount = needsReset ? 0 : (account.dailySendCount || 0);
      if (currentCount < maxDailyLimit) {
        return account;
      }
    }
    return undefined;
  }

  async getActiveEmailAccounts(tenantId: string): Promise<EmailAccount[]> {
    return await db.select()
      .from(emailAccounts)
      .where(and(
        eq(emailAccounts.tenantId, tenantId),
        eq(emailAccounts.status, 'active')
      ))
      .orderBy(emailAccounts.email);
  }
}

export const storage = new DatabaseStorage();
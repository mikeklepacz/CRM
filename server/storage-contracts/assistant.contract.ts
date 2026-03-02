import type {
  User,
  OpenaiSettings,
  InsertOpenaiSettings,
  KnowledgeBaseFile,
  InsertKnowledgeBaseFile,
  ChatMessage,
  InsertChatMessage,
  Project,
  InsertProject,
  Conversation,
  InsertConversation,
  Template,
  InsertTemplate,
  UserTag,
  AssistantBlueprint,
  InsertAssistantBlueprint,
  EmailImage,
  InsertEmailImage,
} from "./shared-types";

export interface AssistantStorageContract {
  // Assistant Blueprint operations (reusable AI templates)
  listAssistantBlueprints(tenantId: string, blueprintType?: string): Promise<AssistantBlueprint[]>;
  getAssistantBlueprintById(blueprintId: string, tenantId: string): Promise<AssistantBlueprint | undefined>;
  createAssistantBlueprint(data: InsertAssistantBlueprint): Promise<AssistantBlueprint>;
  updateAssistantBlueprint(blueprintId: string, tenantId: string, updates: Partial<InsertAssistantBlueprint>): Promise<AssistantBlueprint>;
  deleteAssistantBlueprint(blueprintId: string, tenantId: string): Promise<void>;

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
  addUserTag(userId: string, tag: string, tenantId: string): Promise<UserTag>;
  removeUserTag(userId: string, tag: string): Promise<void>;
  removeUserTagById(userId: string, id: string): Promise<void>;

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

  // Email Image Library operations
  listEmailImages(tenantId: string): Promise<EmailImage[]>;
  createEmailImage(data: InsertEmailImage): Promise<EmailImage>;
  deleteEmailImage(id: string, tenantId: string): Promise<boolean>;

}

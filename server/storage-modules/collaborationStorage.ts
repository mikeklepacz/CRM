import {
  chatMessages,
  conversations,
  projects,
  type ChatMessage,
  type Conversation,
  type InsertChatMessage,
  type InsertConversation,
  type InsertProject,
  type Project,
} from "@shared/schema";
import { db } from "../db";
import { and, desc, eq } from "drizzle-orm";

export async function getChatHistoryStorage(
  userId: string,
  tenantId: string,
  limit: number = 50
): Promise<ChatMessage[]> {
  return await db
    .select()
    .from(chatMessages)
    .where(and(eq(chatMessages.userId, userId), eq(chatMessages.tenantId, tenantId)))
    .orderBy(desc(chatMessages.createdAt))
    .limit(limit);
}

export async function saveChatMessageStorage(message: InsertChatMessage): Promise<ChatMessage> {
  const [newMessage] = await db.insert(chatMessages).values(message as any).returning();
  return newMessage;
}

export async function clearChatHistoryStorage(userId: string, tenantId: string): Promise<void> {
  await db.delete(chatMessages).where(and(eq(chatMessages.userId, userId), eq(chatMessages.tenantId, tenantId)));
}

export async function getConversationMessagesStorage(
  conversationId: string,
  tenantId: string
): Promise<ChatMessage[]> {
  return await db
    .select()
    .from(chatMessages)
    .where(and(eq(chatMessages.conversationId, conversationId), eq(chatMessages.tenantId, tenantId)))
    .orderBy(chatMessages.createdAt);
}

export async function getProjectsStorage(userId: string, tenantId: string): Promise<Project[]> {
  return await db
    .select()
    .from(projects)
    .where(and(eq(projects.userId, userId), eq(projects.tenantId, tenantId)))
    .orderBy(desc(projects.createdAt));
}

export async function createProjectStorage(project: InsertProject): Promise<Project> {
  const [newProject] = await db.insert(projects).values(project).returning();
  return newProject;
}

export async function updateProjectStorage(
  id: string,
  tenantId: string,
  updates: Partial<InsertProject>
): Promise<Project> {
  const [updated] = await db
    .update(projects)
    .set({ ...updates, updatedAt: new Date() })
    .where(and(eq(projects.id, id), eq(projects.tenantId, tenantId)))
    .returning();
  return updated;
}

export async function deleteProjectStorage(id: string, tenantId: string): Promise<void> {
  await db.delete(projects).where(and(eq(projects.id, id), eq(projects.tenantId, tenantId)));
}

export async function getConversationsStorage(userId: string, tenantId: string): Promise<Conversation[]> {
  return await db
    .select()
    .from(conversations)
    .where(and(eq(conversations.userId, userId), eq(conversations.tenantId, tenantId)))
    .orderBy(desc(conversations.updatedAt));
}

export async function getConversationStorage(id: string, tenantId: string): Promise<Conversation | undefined> {
  const [conversation] = await db
    .select()
    .from(conversations)
    .where(and(eq(conversations.id, id), eq(conversations.tenantId, tenantId)));
  return conversation;
}

export async function createConversationStorage(conversation: InsertConversation): Promise<Conversation> {
  const [newConversation] = await db.insert(conversations).values(conversation as any).returning();
  return newConversation;
}

export async function updateConversationStorage(
  id: string,
  tenantId: string,
  updates: Partial<InsertConversation>
): Promise<Conversation> {
  const [updated] = await db
    .update(conversations)
    .set({ ...updates, updatedAt: new Date() } as any)
    .where(and(eq(conversations.id, id), eq(conversations.tenantId, tenantId)))
    .returning();
  return updated;
}

export async function deleteConversationStorage(id: string, tenantId: string): Promise<void> {
  await db.delete(conversations).where(and(eq(conversations.id, id), eq(conversations.tenantId, tenantId)));
}

export async function moveConversationToProjectStorage(
  conversationId: string,
  tenantId: string,
  projectId: string | null
): Promise<Conversation> {
  const [updated] = await db
    .update(conversations)
    .set({ projectId, updatedAt: new Date() })
    .where(and(eq(conversations.id, conversationId), eq(conversations.tenantId, tenantId)))
    .returning();
  return updated;
}

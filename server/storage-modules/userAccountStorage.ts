import {
  chatMessages,
  conversations,
  knowledgeBaseFiles,
  notifications,
  projects,
  reminders,
  templates,
  ticketReplies,
  tickets,
  userIntegrations,
  userPreferences,
  userTags,
  userTenants,
  users,
  widgetLayouts,
  type UpsertUser,
  type User,
} from "@shared/schema";
import { db } from "../db";
import { and, eq } from "drizzle-orm";

export async function getUserStorage(id: string): Promise<User | undefined> {
  const [user] = await db.select().from(users).where(eq(users.id, id));
  return user;
}

export async function getUserByUsernameStorage(username: string): Promise<User | undefined> {
  const [user] = await db.select().from(users).where(eq(users.username, username));
  return user;
}

export async function getUserByEmailStorage(email: string): Promise<User | undefined> {
  const [user] = await db.select().from(users).where(eq(users.email, email));
  return user;
}

export async function getAllUsersStorage(): Promise<User[]> {
  return await db.select().from(users);
}

export async function createUserStorage(userData: Partial<UpsertUser>): Promise<User> {
  const [user] = await db.insert(users).values(userData as any).returning();
  return user;
}

export async function createPasswordUserStorage(userData: any): Promise<User> {
  const [user] = await db.insert(users).values(userData).returning();
  return user;
}

export async function upsertUserStorage(userData: UpsertUser): Promise<User> {
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

export async function updateUserRoleStorage(id: string, role: string): Promise<User> {
  const [updated] = await db.update(users).set({ role, updatedAt: new Date() }).where(eq(users.id, id)).returning();
  return updated;
}

export async function getAgentsStorage(): Promise<User[]> {
  return await db.select().from(users).where(eq(users.role, "agent"));
}

export async function getUserDefaultTenantStorage(
  userId: string
): Promise<{ tenantId: string; roleInTenant: string } | undefined> {
  const [defaultTenant] = await db
    .select({ tenantId: userTenants.tenantId, roleInTenant: userTenants.roleInTenant })
    .from(userTenants)
    .where(and(eq(userTenants.userId, userId), eq(userTenants.isDefault, true)));

  if (defaultTenant) {
    return defaultTenant;
  }

  const [firstTenant] = await db
    .select({ tenantId: userTenants.tenantId, roleInTenant: userTenants.roleInTenant })
    .from(userTenants)
    .where(eq(userTenants.userId, userId))
    .orderBy(userTenants.joinedAt);

  return firstTenant;
}

export async function updateUserStorage(id: string, updates: Partial<UpsertUser>): Promise<User> {
  const [updated] = await db
    .update(users)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(users.id, id))
    .returning();
  return updated;
}

export async function deleteUserStorage(id: string): Promise<void> {
  await db.delete(userIntegrations).where(eq(userIntegrations.userId, id));

  await db.delete(reminders).where(eq(reminders.userId, id));

  const userConversations = await db.select().from(conversations).where(eq(conversations.userId, id));
  for (const conv of userConversations) {
    await db.delete(chatMessages).where(eq(chatMessages.conversationId, conv.id));
  }
  await db.delete(conversations).where(eq(conversations.userId, id));

  await db.delete(templates).where(eq(templates.userId, id));

  await db.delete(userTags).where(eq(userTags.userId, id));

  await db.delete(userPreferences).where(eq(userPreferences.userId, id));

  await db.delete(knowledgeBaseFiles).where(eq(knowledgeBaseFiles.uploadedBy, id));

  await db.delete(projects).where(eq(projects.userId, id));

  await db.delete(notifications).where(eq(notifications.userId, id));

  await db.delete(widgetLayouts).where(eq(widgetLayouts.userId, id));

  const userTickets = await db.select().from(tickets).where(eq(tickets.userId, id));
  for (const ticket of userTickets) {
    await db.delete(ticketReplies).where(eq(ticketReplies.ticketId, ticket.id));
  }
  await db.delete(tickets).where(eq(tickets.userId, id));

  await db.delete(users).where(eq(users.id, id));
}

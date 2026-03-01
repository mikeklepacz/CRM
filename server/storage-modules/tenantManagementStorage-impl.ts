import {
  callHistory,
  clients,
  tenants,
  userTenants,
  users,
  type InsertTenant,
  type Tenant,
  type User,
} from "@shared/schema";
import { db } from "../db";
import { and, desc, eq, inArray, or, sql } from "drizzle-orm";

export async function listTenantsStorage(): Promise<Array<Tenant & { userCount: number }>> {
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

  return result.map((row) => ({
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

export async function getTenantByIdStorage(tenantId: string): Promise<Tenant | undefined> {
  const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId));
  return tenant;
}

export async function getTenantByIdOrSlugStorage(idOrSlug: string): Promise<Tenant | undefined> {
  const [tenant] = await db
    .select()
    .from(tenants)
    .where(or(eq(tenants.id, idOrSlug), eq(tenants.slug, idOrSlug)));
  return tenant;
}

export async function getAllTenantsStorage(): Promise<Tenant[]> {
  return await db.select().from(tenants);
}

export async function createTenantStorage(data: InsertTenant, slug: string): Promise<Tenant> {
  const [tenant] = await db
    .insert(tenants)
    .values({
      ...data,
      slug,
      status: data.status || "active",
    } as any)
    .returning();
  return tenant;
}

export async function updateTenantStorage(tenantId: string, updates: Partial<InsertTenant>): Promise<Tenant> {
  const [tenant] = await db
    .update(tenants)
    .set({
      ...updates,
      updatedAt: new Date(),
    } as any)
    .where(eq(tenants.id, tenantId))
    .returning();
  return tenant;
}

export async function getTenantStatsStorage(
  tenantId: string
): Promise<{ userCount: number; clientCount: number; callCount: number }> {
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

export async function listUsersAcrossTenantsStorage(): Promise<
  Array<User & { tenantMemberships: Array<{ tenantId: string; tenantName: string; roleInTenant: string }> }>
> {
  const allUsers = await db.select().from(users).orderBy(desc(users.createdAt));

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

  return allUsers.map((user) => ({
    ...user,
    tenantMemberships: membershipsByUser.get(user.id) || [],
  }));
}

export async function getUserTenantMembershipsStorage(userId: string): Promise<
  Array<{ tenantId: string; tenantName: string; tenantSlug: string; roleInTenant: string; isDefault: boolean }>
> {
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

  return memberships.map((m) => ({
    tenantId: m.tenantId,
    tenantName: m.tenantName,
    tenantSlug: m.tenantSlug,
    roleInTenant: m.roleInTenant,
    isDefault: m.isDefault ?? false,
  }));
}

export async function getUserTenantRoleStorage(userId: string, tenantId: string): Promise<string | null> {
  const [membership] = await db
    .select({ roleInTenant: userTenants.roleInTenant })
    .from(userTenants)
    .where(and(eq(userTenants.userId, userId), eq(userTenants.tenantId, tenantId)));
  return membership?.roleInTenant ?? null;
}

export async function addUserToTenantStorage(
  userId: string,
  tenantId: string,
  roleInTenant: string,
  isDefault?: boolean
): Promise<void> {
  await db.insert(userTenants).values({
    userId,
    tenantId,
    roleInTenant,
    isDefault: isDefault ?? false,
  });
}

export async function removeUserFromTenantStorage(userId: string, tenantId: string): Promise<void> {
  await db.delete(userTenants).where(and(eq(userTenants.userId, userId), eq(userTenants.tenantId, tenantId)));
}

export async function getPlatformMetricsStorage(): Promise<{
  totalTenants: number;
  totalUsers: number;
  totalClients: number;
  activeTenants: number;
}> {
  const [totalTenantsResult] = await db.select({ count: sql<number>`CAST(COUNT(*) AS INTEGER)` }).from(tenants);

  const [totalUsersResult] = await db.select({ count: sql<number>`CAST(COUNT(*) AS INTEGER)` }).from(users);

  const [totalClientsResult] = await db.select({ count: sql<number>`CAST(COUNT(*) AS INTEGER)` }).from(clients);

  const [activeTenantsResult] = await db
    .select({ count: sql<number>`CAST(COUNT(*) AS INTEGER)` })
    .from(tenants)
    .where(eq(tenants.status, "active"));

  return {
    totalTenants: totalTenantsResult?.count || 0,
    totalUsers: totalUsersResult?.count || 0,
    totalClients: totalClientsResult?.count || 0,
    activeTenants: activeTenantsResult?.count || 0,
  };
}

export async function listTenantUsersStorage(
  tenantId: string
): Promise<Array<User & { roleInTenant: string; joinedAt: Date | null }>> {
  const memberships = await db
    .select({
      userId: userTenants.userId,
      roleInTenant: userTenants.roleInTenant,
      joinedAt: userTenants.joinedAt,
    })
    .from(userTenants)
    .where(eq(userTenants.tenantId, tenantId));

  if (memberships.length === 0) return [];

  const userIds = memberships.map((m) => m.userId);
  const tenantUsers = await db.select().from(users).where(inArray(users.id, userIds));

  const membershipMap = new Map(memberships.map((m) => [m.userId, m]));
  return tenantUsers.map((user) => ({
    ...user,
    roleInTenant: membershipMap.get(user.id)?.roleInTenant || "agent",
    joinedAt: membershipMap.get(user.id)?.joinedAt || null,
  }));
}

export async function updateUserRoleInTenantStorage(
  userId: string,
  tenantId: string,
  newRole: string
): Promise<void> {
  await db
    .update(userTenants)
    .set({ roleInTenant: newRole })
    .where(and(eq(userTenants.userId, userId), eq(userTenants.tenantId, tenantId)));
}

export async function getTenantSettingsStorage(tenantId: string): Promise<Tenant["settings"]> {
  const [tenant] = await db.select({ settings: tenants.settings }).from(tenants).where(eq(tenants.id, tenantId));
  return tenant?.settings || {};
}

export async function updateTenantSettingsStorage(
  tenantId: string,
  settings: Partial<Tenant["settings"]>
): Promise<Tenant> {
  const existing = await getTenantSettingsStorage(tenantId);
  const merged = { ...existing, ...settings };
  const [updated] = await db
    .update(tenants)
    .set({ settings: merged, updatedAt: new Date() })
    .where(eq(tenants.id, tenantId))
    .returning();
  return updated;
}

import {
  tenantUserInvites,
  type TenantUserInvite,
} from "@shared/schema";
import { db } from "../db";
import { and, desc, eq } from "drizzle-orm";
import { addUserToTenantStorage } from "./tenantManagementStorage";

export async function createTenantInviteStorage(
  tenantId: string,
  email: string,
  role: string,
  inviteToken: string,
  invitedBy: string,
  expiresAt: Date
): Promise<TenantUserInvite> {
  const [invite] = await db
    .insert(tenantUserInvites)
    .values({
      tenantId,
      email: email.toLowerCase(),
      role,
      inviteToken,
      invitedBy,
      expiresAt,
      status: "pending",
    })
    .returning();
  return invite;
}

export async function listTenantInvitesStorage(tenantId: string): Promise<TenantUserInvite[]> {
  return await db
    .select()
    .from(tenantUserInvites)
    .where(eq(tenantUserInvites.tenantId, tenantId))
    .orderBy(desc(tenantUserInvites.createdAt));
}

export async function getTenantInviteByTokenStorage(token: string): Promise<TenantUserInvite | undefined> {
  const [invite] = await db.select().from(tenantUserInvites).where(eq(tenantUserInvites.inviteToken, token));
  return invite;
}

export async function cancelTenantInviteStorage(inviteId: string, tenantId: string): Promise<void> {
  await db
    .update(tenantUserInvites)
    .set({ status: "cancelled" })
    .where(and(eq(tenantUserInvites.id, inviteId), eq(tenantUserInvites.tenantId, tenantId)));
}

export async function acceptTenantInviteStorage(token: string, userId: string): Promise<void> {
  const invite = await getTenantInviteByTokenStorage(token);
  if (!invite || invite.status !== "pending") {
    throw new Error("Invalid or expired invite");
  }
  if (new Date() > invite.expiresAt) {
    await db.update(tenantUserInvites).set({ status: "expired" }).where(eq(tenantUserInvites.id, invite.id));
    throw new Error("Invite has expired");
  }

  await addUserToTenantStorage(userId, invite.tenantId, invite.role);

  await db
    .update(tenantUserInvites)
    .set({ status: "accepted", acceptedAt: new Date() })
    .where(eq(tenantUserInvites.id, invite.id));
}

import {
  emailAccounts,
  emailImages,
  type EmailAccount,
  type EmailImage,
  type InsertEmailAccount,
  type InsertEmailImage,
} from "@shared/schema";
import { db } from "../db";
import { and, desc, eq } from "drizzle-orm";

export async function listEmailAccountsStorage(tenantId: string): Promise<EmailAccount[]> {
  return await db.select()
    .from(emailAccounts)
    .where(eq(emailAccounts.tenantId, tenantId))
    .orderBy(desc(emailAccounts.createdAt));
}

export async function getEmailAccountStorage(id: string, tenantId: string): Promise<EmailAccount | undefined> {
  const [account] = await db.select()
    .from(emailAccounts)
    .where(and(eq(emailAccounts.id, id), eq(emailAccounts.tenantId, tenantId)));
  return account;
}

export async function getEmailAccountByEmailStorage(tenantId: string, email: string): Promise<EmailAccount | undefined> {
  const [account] = await db.select()
    .from(emailAccounts)
    .where(and(eq(emailAccounts.tenantId, tenantId), eq(emailAccounts.email, email)));
  return account;
}

export async function createEmailAccountStorage(data: InsertEmailAccount): Promise<EmailAccount> {
  const [created] = await db.insert(emailAccounts).values(data).returning();
  return created;
}

export async function updateEmailAccountStorage(id: string, tenantId: string, updates: Partial<InsertEmailAccount>): Promise<EmailAccount> {
  const [updated] = await db.update(emailAccounts)
    .set({ ...updates, updatedAt: new Date() })
    .where(and(eq(emailAccounts.id, id), eq(emailAccounts.tenantId, tenantId)))
    .returning();
  return updated;
}

export async function deleteEmailAccountStorage(id: string, tenantId: string): Promise<boolean> {
  const result = await db.delete(emailAccounts)
    .where(and(eq(emailAccounts.id, id), eq(emailAccounts.tenantId, tenantId)));
  return (result as any).rowCount > 0;
}

export async function incrementEmailAccountDailySendCountStorage(id: string, tenantId: string): Promise<EmailAccount> {
  const today = new Date().toISOString().split('T')[0];
  const account = await getEmailAccountStorage(id, tenantId);
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

export async function getAvailableEmailAccountStorage(tenantId: string, maxDailyLimit: number): Promise<EmailAccount | undefined> {
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

export async function getActiveEmailAccountsStorage(tenantId: string): Promise<EmailAccount[]> {
  return await db.select()
    .from(emailAccounts)
    .where(and(
      eq(emailAccounts.tenantId, tenantId),
      eq(emailAccounts.status, 'active')
    ))
    .orderBy(emailAccounts.email);
}

export async function listEmailImagesStorage(tenantId: string): Promise<EmailImage[]> {
  return await db.select().from(emailImages).where(eq(emailImages.tenantId, tenantId)).orderBy(desc(emailImages.createdAt));
}

export async function createEmailImageStorage(data: InsertEmailImage): Promise<EmailImage> {
  const [image] = await db.insert(emailImages).values(data).returning();
  return image;
}

export async function deleteEmailImageStorage(id: string, tenantId: string): Promise<boolean> {
  const result = await db.delete(emailImages).where(and(eq(emailImages.id, id), eq(emailImages.tenantId, tenantId))).returning();
  return result.length > 0;
}

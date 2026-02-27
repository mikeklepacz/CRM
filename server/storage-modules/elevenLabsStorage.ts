import {
  elevenLabsAgents,
  elevenLabsConfig,
  elevenLabsPhoneNumbers,
  type ElevenLabsAgent,
  type ElevenLabsPhoneNumber,
  type InsertElevenLabsAgent,
  type InsertElevenLabsPhoneNumber,
} from "@shared/schema";
import { db } from "../db";
import { and, eq, isNull, or } from "drizzle-orm";

type ElevenLabsConfigData = {
  apiKey: string;
  twilioNumber?: string;
  webhookSecret?: string;
  phoneNumberId?: string;
  useDirectElevenLabs?: boolean;
  projectId?: string | null;
};

type ElevenLabsConfigUpdate = {
  apiKey?: string;
  twilioNumber?: string;
  webhookSecret?: string;
  phoneNumberId?: string;
};

async function getElevenLabsConfigExactStorage(
  tenantId: string,
  projectId?: string | null
): Promise<{
  apiKey: string;
  twilioNumber?: string;
  webhookSecret?: string;
  phoneNumberId?: string;
  useDirectElevenLabs?: boolean;
} | undefined> {
  let config;
  if (projectId) {
    const [projectConfig] = await db
      .select()
      .from(elevenLabsConfig)
      .where(and(eq(elevenLabsConfig.tenantId, tenantId), eq(elevenLabsConfig.projectId, projectId)))
      .limit(1);
    config = projectConfig;
  } else {
    const [tenantConfig] = await db
      .select()
      .from(elevenLabsConfig)
      .where(and(eq(elevenLabsConfig.tenantId, tenantId), isNull(elevenLabsConfig.projectId)))
      .limit(1);
    config = tenantConfig;
  }
  if (!config) return undefined;
  return {
    apiKey: config.apiKey,
    twilioNumber: config.twilioNumber || undefined,
    webhookSecret: config.webhookSecret || undefined,
    phoneNumberId: config.phoneNumberId || undefined,
    useDirectElevenLabs: config.useDirectElevenLabs ?? false,
  };
}

export async function getElevenLabsConfigStorage(
  tenantId: string,
  projectId?: string | null
): Promise<ElevenLabsConfigData | undefined> {
  let config;

  if (projectId) {
    const [projectConfig] = await db
      .select()
      .from(elevenLabsConfig)
      .where(and(eq(elevenLabsConfig.tenantId, tenantId), eq(elevenLabsConfig.projectId, projectId)))
      .limit(1);
    config = projectConfig;
  }

  if (!config) {
    const [tenantConfig] = await db
      .select()
      .from(elevenLabsConfig)
      .where(and(eq(elevenLabsConfig.tenantId, tenantId), isNull(elevenLabsConfig.projectId)))
      .limit(1);
    config = tenantConfig;
  }

  if (!config) return undefined;
  return {
    apiKey: config.apiKey,
    twilioNumber: config.twilioNumber || undefined,
    webhookSecret: config.webhookSecret || undefined,
    phoneNumberId: config.phoneNumberId || undefined,
    useDirectElevenLabs: config.useDirectElevenLabs ?? false,
    projectId: config.projectId || null,
  };
}

export async function updateElevenLabsConfigStorage(
  tenantId: string,
  configData: ElevenLabsConfigUpdate,
  projectId?: string | null
): Promise<void> {
  const existing = await getElevenLabsConfigExactStorage(tenantId, projectId);

  let fallback: {
    apiKey: string;
    twilioNumber?: string;
    webhookSecret?: string;
    phoneNumberId?: string;
  } | undefined;
  if (!existing && projectId) {
    fallback = await getElevenLabsConfigExactStorage(tenantId, null);
  }

  const baseConfig = existing || fallback;
  const merged = {
    tenantId,
    projectId: projectId || null,
    apiKey: configData.apiKey !== undefined ? configData.apiKey : (baseConfig?.apiKey ?? ""),
    twilioNumber:
      configData.twilioNumber !== undefined ? configData.twilioNumber : (baseConfig?.twilioNumber ?? null),
    webhookSecret:
      configData.webhookSecret !== undefined
        ? configData.webhookSecret
        : (baseConfig?.webhookSecret ?? null),
    phoneNumberId:
      configData.phoneNumberId !== undefined ? configData.phoneNumberId : (baseConfig?.phoneNumberId ?? null),
  };

  if (projectId) {
    await db
      .delete(elevenLabsConfig)
      .where(and(eq(elevenLabsConfig.tenantId, tenantId), eq(elevenLabsConfig.projectId, projectId)));
  } else {
    await db
      .delete(elevenLabsConfig)
      .where(and(eq(elevenLabsConfig.tenantId, tenantId), isNull(elevenLabsConfig.projectId)));
  }
  await db.insert(elevenLabsConfig).values(merged);
}

export async function updateElevenLabsConfigDirectModeStorage(
  tenantId: string,
  useDirectElevenLabs: boolean,
  projectId?: string | null
): Promise<void> {
  if (projectId) {
    await db
      .update(elevenLabsConfig)
      .set({ useDirectElevenLabs, updatedAt: new Date() })
      .where(and(eq(elevenLabsConfig.tenantId, tenantId), eq(elevenLabsConfig.projectId, projectId)));
  } else {
    await db
      .update(elevenLabsConfig)
      .set({ useDirectElevenLabs, updatedAt: new Date() })
      .where(and(eq(elevenLabsConfig.tenantId, tenantId), isNull(elevenLabsConfig.projectId)));
  }
}

export async function getAllElevenLabsPhoneNumbersStorage(tenantId: string): Promise<ElevenLabsPhoneNumber[]> {
  return await db.select().from(elevenLabsPhoneNumbers).where(eq(elevenLabsPhoneNumbers.tenantId, tenantId));
}

export async function getElevenLabsPhoneNumbersStorage(tenantId: string): Promise<ElevenLabsPhoneNumber[]> {
  return await db.select().from(elevenLabsPhoneNumbers).where(eq(elevenLabsPhoneNumbers.tenantId, tenantId));
}

export async function getElevenLabsPhoneNumberStorage(
  phoneNumberId: string,
  tenantId: string
): Promise<ElevenLabsPhoneNumber | undefined> {
  const [phone] = await db.select().from(elevenLabsPhoneNumbers).where(
    and(eq(elevenLabsPhoneNumbers.phoneNumberId, phoneNumberId), eq(elevenLabsPhoneNumbers.tenantId, tenantId))
  );
  return phone;
}

export async function upsertElevenLabsPhoneNumberStorage(
  phoneData: InsertElevenLabsPhoneNumber
): Promise<ElevenLabsPhoneNumber> {
  const [existingForTenant] = await db
    .select()
    .from(elevenLabsPhoneNumbers)
    .where(
      and(
        eq(elevenLabsPhoneNumbers.phoneNumberId, phoneData.phoneNumberId),
        eq(elevenLabsPhoneNumbers.tenantId, phoneData.tenantId)
      )
    );

  if (existingForTenant) {
    const [updated] = await db
      .update(elevenLabsPhoneNumbers)
      .set({
        phoneNumber: phoneData.phoneNumber,
        label: phoneData.label,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(elevenLabsPhoneNumbers.phoneNumberId, phoneData.phoneNumberId),
          eq(elevenLabsPhoneNumbers.tenantId, phoneData.tenantId)
        )
      )
      .returning();
    return updated;
  } else {
    const [newPhone] = await db.insert(elevenLabsPhoneNumbers).values(phoneData).returning();
    return newPhone;
  }
}

export async function deleteElevenLabsPhoneNumberStorage(phoneNumberId: string, tenantId: string): Promise<void> {
  await db
    .delete(elevenLabsPhoneNumbers)
    .where(and(eq(elevenLabsPhoneNumbers.phoneNumberId, phoneNumberId), eq(elevenLabsPhoneNumbers.tenantId, tenantId)));
}

export async function getAllElevenLabsAgentsStorage(tenantId: string, projectId?: string): Promise<ElevenLabsAgent[]> {
  if (projectId) {
    return await db
      .select()
      .from(elevenLabsAgents)
      .where(
        and(
          eq(elevenLabsAgents.tenantId, tenantId),
          or(eq(elevenLabsAgents.projectId, projectId), isNull(elevenLabsAgents.projectId))
        )
      );
  }
  return await db.select().from(elevenLabsAgents).where(eq(elevenLabsAgents.tenantId, tenantId));
}

export async function getElevenLabsAgentsStorage(tenantId: string): Promise<ElevenLabsAgent[]> {
  return await db.select().from(elevenLabsAgents).where(eq(elevenLabsAgents.tenantId, tenantId));
}

export async function getElevenLabsAgentStorage(id: string, tenantId: string): Promise<ElevenLabsAgent | undefined> {
  const [agent] = await db
    .select()
    .from(elevenLabsAgents)
    .where(and(eq(elevenLabsAgents.id, id), eq(elevenLabsAgents.tenantId, tenantId)));
  return agent;
}

export async function getDefaultElevenLabsAgentStorage(tenantId: string): Promise<ElevenLabsAgent | undefined> {
  const [agent] = await db
    .select()
    .from(elevenLabsAgents)
    .where(and(eq(elevenLabsAgents.isDefault, true), eq(elevenLabsAgents.tenantId, tenantId)))
    .limit(1);
  return agent;
}

export async function createElevenLabsAgentStorage(agent: InsertElevenLabsAgent): Promise<ElevenLabsAgent> {
  const [newAgent] = await db.insert(elevenLabsAgents).values(agent).returning();
  return newAgent;
}

export async function updateElevenLabsAgentStorage(
  id: string,
  tenantId: string,
  updates: Partial<InsertElevenLabsAgent>
): Promise<ElevenLabsAgent> {
  const [updated] = await db
    .update(elevenLabsAgents)
    .set({ ...updates, updatedAt: new Date() })
    .where(and(eq(elevenLabsAgents.id, id), eq(elevenLabsAgents.tenantId, tenantId)))
    .returning();
  return updated;
}

export async function deleteElevenLabsAgentStorage(id: string, tenantId: string): Promise<void> {
  await db.delete(elevenLabsAgents).where(and(eq(elevenLabsAgents.id, id), eq(elevenLabsAgents.tenantId, tenantId)));
}

export async function setDefaultElevenLabsAgentStorage(id: string, tenantId: string): Promise<void> {
  await db.update(elevenLabsAgents).set({ isDefault: false }).where(eq(elevenLabsAgents.tenantId, tenantId));
  await db
    .update(elevenLabsAgents)
    .set({ isDefault: true })
    .where(and(eq(elevenLabsAgents.id, id), eq(elevenLabsAgents.tenantId, tenantId)));
}

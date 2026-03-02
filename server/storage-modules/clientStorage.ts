import {
  categories,
  clients,
  type Client,
  type InsertClient,
} from "@shared/schema";
import { db } from "../db";
import { and, eq, inArray, isNull, or, sql } from "drizzle-orm";

export async function getAllClientsStorage(tenantId: string): Promise<Client[]> {
  return await db.select().from(clients).where(eq(clients.tenantId, tenantId)).orderBy(clients.createdAt);
}

export async function getClientsByAgentStorage(agentId: string, tenantId: string): Promise<Client[]> {
  return await db
    .select()
    .from(clients)
    .where(and(eq(clients.assignedAgent, agentId), eq(clients.tenantId, tenantId)))
    .orderBy(clients.createdAt);
}

export async function getFilteredClientsStorage(
  tenantId: string,
  filters: {
    search?: string;
    nameFilter?: string;
    cityFilter?: string;
    states?: string[];
    cities?: string[];
    status?: string[];
    showMyStoresOnly?: boolean;
    category?: string;
    agentId?: string;
    projectId?: string;
  }
): Promise<Client[]> {
  let allowedCategoryNames: string[] | null = null;
  if (filters.projectId) {
    const projectCategories = await db
      .select({ name: categories.name })
      .from(categories)
      .where(
        and(eq(categories.tenantId, tenantId), or(eq(categories.projectId, filters.projectId), isNull(categories.projectId)))
      );
    allowedCategoryNames = projectCategories.map((c) => c.name);

    if (allowedCategoryNames.length === 0) {
      return [];
    }
  }

  let query: any = db.select().from(clients);
  const conditions: any[] = [eq(clients.tenantId, tenantId)];

  if (filters.agentId || filters.showMyStoresOnly) {
    const agentId = filters.agentId;
    if (agentId) {
      conditions.push(eq(clients.assignedAgent, agentId));
    }
  }

  if (allowedCategoryNames !== null) {
    conditions.push(inArray(clients.category, allowedCategoryNames));
  }

  if (filters.category) {
    conditions.push(eq(clients.category, filters.category));
  }

  if (filters.status && Array.isArray(filters.status) && filters.status.length > 0) {
    const statusConditions = filters.status.map(
      (status) => sql`${clients.data}->>'Status' = ${status} OR ${clients.data}->>'status' = ${status}`
    );
    conditions.push(sql`(${sql.join(statusConditions, sql` OR `)})`);
  }

  if (filters.states && filters.states.length > 0) {
    const stateConditions = filters.states.map(
      (state) => sql`${clients.data}->>'State' = ${state} OR ${clients.data}->>'state' = ${state}`
    );
    conditions.push(sql`(${sql.join(stateConditions, sql` OR `)})`);
  }

  if (filters.cities && filters.cities.length > 0) {
    const cityConditions = filters.cities.map(
      (city) => sql`${clients.data}->>'City' = ${city} OR ${clients.data}->>'city' = ${city}`
    );
    conditions.push(sql`(${sql.join(cityConditions, sql` OR `)})`);
  }

  if (filters.nameFilter && filters.nameFilter.trim()) {
    const nameTerm = `%${filters.nameFilter.toLowerCase()}%`;
    conditions.push(
      sql`(
          LOWER(${clients.data}->>'Name') LIKE ${nameTerm} OR
          LOWER(${clients.data}->>'name') LIKE ${nameTerm}
        )`
    );
  }

  if (filters.cityFilter && filters.cityFilter.trim()) {
    const cityTerm = `%${filters.cityFilter.toLowerCase()}%`;
    conditions.push(
      sql`(
          LOWER(${clients.data}->>'City') LIKE ${cityTerm} OR
          LOWER(${clients.data}->>'city') LIKE ${cityTerm}
        )`
    );
  }

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

  if (conditions.length > 0) {
    query = query.where(and(...conditions));
  }

  const results = await query.orderBy(clients.createdAt);

  return results;
}

export async function getClientStorage(id: string, tenantId: string): Promise<Client | undefined> {
  const [client] = await db.select().from(clients).where(and(eq(clients.id, id), eq(clients.tenantId, tenantId)));
  return client;
}

export async function createClientStorage(client: InsertClient): Promise<Client> {
  const [newClient] = await db.insert(clients).values(client).returning();
  return newClient;
}

export async function updateClientStorage(
  id: string,
  tenantId: string,
  updates: Partial<InsertClient>
): Promise<Client> {
  const [updated] = await db
    .update(clients)
    .set({ ...updates, updatedAt: new Date() })
    .where(and(eq(clients.id, id), eq(clients.tenantId, tenantId)))
    .returning();
  return updated;
}

export async function claimClientStorage(clientId: string, agentId: string): Promise<Client> {
  const [updated] = await db
    .update(clients)
    .set({
      assignedAgent: agentId,
      claimDate: new Date(),
      status: "claimed",
      updatedAt: new Date(),
    })
    .where(eq(clients.id, clientId))
    .returning();
  return updated;
}

export async function unclaimClientStorage(clientId: string): Promise<Client> {
  const [updated] = await db
    .update(clients)
    .set({
      assignedAgent: null,
      claimDate: null,
      status: "unassigned",
      updatedAt: new Date(),
    })
    .where(eq(clients.id, clientId))
    .returning();
  return updated;
}

export async function findClientByUniqueKeyStorage(key: string, value: string): Promise<Client | undefined> {
  const result = await db
    .select()
    .from(clients)
    .where(sql`${clients.data}->>${key} = ${value}`)
    .limit(1);
  return result[0];
}

export async function updateLastContactDateStorage(
  clientId: string,
  contactDate?: Date
): Promise<Client | undefined> {
  const newContactDate = contactDate || new Date();

  const [updated] = await db
    .update(clients)
    .set({
      lastContactDate: newContactDate,
      updatedAt: new Date(),
    })
    .where(
      and(eq(clients.id, clientId), or(isNull(clients.lastContactDate), sql`${clients.lastContactDate} < ${newContactDate}`))
    )
    .returning();

  return updated;
}

export async function getClientByUniqueIdentifierStorage(uniqueId: string): Promise<Client | undefined> {
  const [client] = await db.select().from(clients).where(eq(clients.uniqueIdentifier, uniqueId));
  return client;
}

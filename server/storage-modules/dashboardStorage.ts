import {
  clients,
  dashboardCards,
  orders,
  users,
} from "@shared/schema";
import { db } from "../db";
import { eq, sql } from "drizzle-orm";

export async function getDashboardCardsByRoleStorage(role: string): Promise<any[]> {
  const cards = await db
    .select()
    .from(dashboardCards)
    .where(sql`${dashboardCards.visibleToRoles} @> ARRAY[${role}]::text[]`);
  return cards;
}

export async function getDashboardStatsStorage(userId: string, role: string): Promise<any> {
  if (role === "admin") {
    const totalClients = await db.select().from(clients);
    const totalAgents = await db.select().from(users).where(eq(users.role, "agent"));
    const totalOrders = await db.select().from(orders);

    return {
      totalClients: totalClients.length,
      totalAgents: totalAgents.length,
      totalOrders: totalOrders.length,
      unassignedClients: totalClients.filter((c) => !c.assignedAgent).length,
    };
  } else if (role === "agent") {
    const agentClients = await db.select().from(clients).where(eq(clients.assignedAgent, userId));

    const agentOrders = await db
      .select()
      .from(orders)
      .leftJoin(clients, eq(orders.clientId, clients.id))
      .where(eq(clients.assignedAgent, userId));

    return {
      myClients: agentClients.length,
      myOrders: agentOrders.length,
      claimedClients: agentClients.filter((c) => c.status === "claimed").length,
    };
  }

  return {};
}

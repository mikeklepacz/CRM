import { and, eq, inArray } from "drizzle-orm";
import { commissions, userTenants, users } from "@shared/schema";
import { db } from "../../db";
import { storage } from "../../storage";

type CurrentUser = {
  id: string;
  roleInTenant?: string | null;
  role?: string | null;
  isSuperAdmin?: boolean | null;
  agentName?: string | null;
  email?: string | null;
};

export async function buildSalesDataReport(
  tenantId: string,
  startDate: string,
  endDate: string
): Promise<{ summary: any; agents: any[] }> {
  const start = new Date(startDate);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  const allOrders = await storage.getAllOrders(tenantId);
  const ordersInRange = allOrders.filter((order) => {
    const orderDate = new Date(order.orderDate);
    return orderDate >= start && orderDate <= end;
  });

  const allUsers = await storage.getAllUsers();
  const agentSales: Record<string, any> = {};

  for (const order of ordersInRange) {
    const agentName = order.salesAgentName || "Unassigned";
    if (!agentSales[agentName]) {
      const matchingUser = allUsers.find(
        (user) => user.agentName && user.agentName.toLowerCase().trim() === agentName.toLowerCase().trim()
      );

      agentSales[agentName] = {
        agentName,
        agentId: matchingUser?.id || null,
        firstName: matchingUser?.firstName || null,
        lastName: matchingUser?.lastName || null,
        email: matchingUser?.email || null,
        totalOrders: 0,
        totalSales: 0,
        totalCommission: 0,
        orders: [],
      };
    }

    const salesAmount = parseFloat(order.total || "0");
    const commissionAmount = parseFloat(order.commissionAmount || "0");
    agentSales[agentName].totalOrders++;
    agentSales[agentName].totalSales += salesAmount;
    agentSales[agentName].totalCommission += commissionAmount;
    agentSales[agentName].orders.push({
      id: order.id,
      orderNumber: order.orderNumber,
      orderDate: order.orderDate,
      billingCompany: order.billingCompany,
      billingEmail: order.billingEmail,
      total: salesAmount,
      commissionType: order.commissionType,
      commissionAmount,
      status: order.status,
    });
  }

  const agents = Object.values(agentSales)
    .filter((agent: any) => agent.agentName !== "Unassigned" && agent.totalOrders > 0)
    .sort((a: any, b: any) => b.totalSales - a.totalSales);

  return {
    summary: {
      totalAgents: agents.length,
      totalOrders: ordersInRange.length,
      totalRevenue: agents.reduce((sum: number, agent: any) => sum + agent.totalSales, 0),
      totalCommissionsPaid: agents.reduce((sum: number, agent: any) => sum + agent.totalCommission, 0),
      dateRange: {
        start: start.toISOString(),
        end: end.toISOString(),
      },
    },
    agents,
  };
}

export async function buildReferralCommissionsReport(tenantId: string, currentUser: CurrentUser): Promise<any[]> {
  const isUserAdmin =
    currentUser.roleInTenant === "org_admin" || currentUser.role === "admin" || !!currentUser.isSuperAdmin;

  const allCommissions = await db.query.commissions.findMany({
    where: and(eq(commissions.commissionKind, "referral"), eq(commissions.tenantId, tenantId)),
  });

  const tenantUserRecords = await db.select().from(userTenants).where(eq(userTenants.tenantId, tenantId));
  const tenantUserIds = tenantUserRecords.map((item) => item.userId);
  const allUsers =
    tenantUserIds.length > 0 ? await db.query.users.findMany({ where: inArray(users.id, tenantUserIds) }) : [];

  const referralSummary: Record<string, any> = {};
  for (const commission of allCommissions) {
    if (commission.commissionKind === "referral" && commission.agentId && commission.sourceAgentId) {
      const referringAgentId = commission.agentId;
      const sourceAgentId = commission.sourceAgentId;

      if (!isUserAdmin && referringAgentId !== currentUser.id) {
        continue;
      }

      if (!referralSummary[referringAgentId]) {
        const referringAgent = allUsers.find((user) => user.id === referringAgentId);
        referralSummary[referringAgentId] = {
          referringAgentId,
          referringAgentName: referringAgent?.agentName || referringAgent?.email || "Unknown",
          referredAgents: {},
          totalReferralCommission: 0,
        };
      }

      if (!referralSummary[referringAgentId].referredAgents[sourceAgentId]) {
        const sourceAgent = allUsers.find((user) => user.id === sourceAgentId);
        referralSummary[referringAgentId].referredAgents[sourceAgentId] = {
          agentId: sourceAgentId,
          agentName: sourceAgent?.agentName || sourceAgent?.email || "Unknown",
          totalEarnings: 0,
        };
      }

      const amount = parseFloat(commission.amount);
      referralSummary[referringAgentId].referredAgents[sourceAgentId].totalEarnings += amount;
      referralSummary[referringAgentId].totalReferralCommission += amount;
    }
  }

  return Object.values(referralSummary)
    .map((entry: any) => ({
      referringAgentId: entry.referringAgentId,
      referringAgentName: entry.referringAgentName,
      totalReferralCommission: entry.totalReferralCommission,
      referredAgents: Object.values(entry.referredAgents).sort((a: any, b: any) => b.totalEarnings - a.totalEarnings),
    }))
    .sort((a: any, b: any) => b.totalReferralCommission - a.totalReferralCommission);
}

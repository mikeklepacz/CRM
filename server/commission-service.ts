import { db } from "./db";
import { users, orders, commissions, type Commission } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import type { InsertCommission } from "@shared/schema";

interface CommissionCalculation {
  agentId: string;
  amount: number;
  rate: number;
  kind: 'primary' | 'referral';
  sourceAgentId?: string;
}

export async function applyCommissions(orderId: string): Promise<void> {
  const order = await db.query.orders.findFirst({
    where: eq(orders.id, orderId),
  });

  if (!order) {
    throw new Error(`Order ${orderId} not found`);
  }

  const agent = await db.query.users.findFirst({
    where: eq(users.agentName, order.salesAgentName || ''),
  });

  if (!agent) {
    console.log(`No agent found for order ${orderId} with agent name "${order.salesAgentName}"`);
    return;
  }

  const calculations: CommissionCalculation[] = [];

  const rate = calculateCommissionRate(order.commissionType, order.orderDate, agent);
  const primaryAmount = calculateCommissionAmount(order.total, rate, order.commissionType, order.commissionAmount);

  calculations.push({
    agentId: agent.id,
    amount: primaryAmount,
    rate,
    kind: 'primary',
  });

  if (agent.referredBy) {
    const referralAmount = primaryAmount * 0.10;
    calculations.push({
      agentId: agent.referredBy,
      amount: referralAmount,
      rate: 10.00,
      kind: 'referral',
      sourceAgentId: agent.id,
    });
  }

  const existingCommissions = await db.query.commissions.findMany({
    where: eq(commissions.orderId, orderId),
  });

  if (existingCommissions.length > 0) {
    await db.delete(commissions).where(eq(commissions.orderId, orderId));
  }

  for (const calc of calculations) {
    const commissionRecord: InsertCommission = {
      orderId,
      agentId: calc.agentId,
      commissionKind: calc.kind,
      sourceAgentId: calc.sourceAgentId || null,
      amount: calc.amount.toFixed(2),
      commissionRate: calc.rate.toFixed(2),
      notes: calc.kind === 'referral' 
        ? `10% referral bonus from agent ${calc.sourceAgentId}` 
        : `${calc.rate}% commission on order ${order.orderNumber}`,
    };

    await db.insert(commissions).values(commissionRecord);
  }
}

function calculateCommissionRate(
  commissionType: string | null,
  orderDate: Date,
  agent: { claimDate?: Date | null; id: string }
): number {
  if (commissionType === '25') return 25.00;
  if (commissionType === '10') return 10.00;
  if (commissionType === 'flat') return 0;
  
  return 25.00;
}

function calculateCommissionAmount(
  orderTotal: string,
  rate: number,
  commissionType: string | null,
  flatAmount: string | null
): number {
  const total = parseFloat(orderTotal);
  
  if (commissionType === 'flat' && flatAmount) {
    return parseFloat(flatAmount);
  }
  
  return total * (rate / 100);
}

export async function getAgentCommissions(
  agentId: string,
  options?: {
    startDate?: Date;
    endDate?: Date;
    commissionKind?: 'primary' | 'referral';
  }
) {
  let conditions = [eq(commissions.agentId, agentId)];
  
  if (options?.commissionKind) {
    conditions.push(eq(commissions.commissionKind, options.commissionKind));
  }

  return await db.query.commissions.findMany({
    where: and(...conditions),
    orderBy: [desc(commissions.calculatedOn)],
  });
}

export async function getCommissionSummary(agentId: string) {
  const allCommissions = await db.query.commissions.findMany({
    where: eq(commissions.agentId, agentId),
  });

  const primary = allCommissions
    .filter((c: Commission) => c.commissionKind === 'primary')
    .reduce((sum: number, c: Commission) => sum + parseFloat(c.amount), 0);

  const referral = allCommissions
    .filter((c: Commission) => c.commissionKind === 'referral')
    .reduce((sum: number, c: Commission) => sum + parseFloat(c.amount), 0);

  return {
    primaryCommissions: primary,
    referralCommissions: referral,
    totalCommissions: primary + referral,
    commissionCount: allCommissions.length,
  };
}

export async function getTeamCommissions(referrerId: string) {
  const referredAgents = await db.query.users.findMany({
    where: eq(users.referredBy, referrerId),
  });

  const teamData = await Promise.all(
    referredAgents.map(async (agent: any) => {
      const agentCommissions = await db.query.commissions.findMany({
        where: and(
          eq(commissions.agentId, agent.id),
          eq(commissions.commissionKind, 'primary')
        ),
      });

      const referralEarnings = await db.query.commissions.findMany({
        where: and(
          eq(commissions.agentId, referrerId),
          eq(commissions.sourceAgentId, agent.id),
          eq(commissions.commissionKind, 'referral')
        ),
      });

      const totalEarned = agentCommissions.reduce((sum: number, c: Commission) => sum + parseFloat(c.amount), 0);
      const referralBonus = referralEarnings.reduce((sum: number, c: Commission) => sum + parseFloat(c.amount), 0);

      return {
        agent: {
          id: agent.id,
          agentName: agent.agentName,
          email: agent.email,
          firstName: agent.firstName,
          lastName: agent.lastName,
        },
        totalEarned,
        referralBonus,
        orderCount: agentCommissions.length,
      };
    })
  );

  return teamData;
}

import { commissions } from "@shared/schema";
import { db } from "../../../db";
import { storage } from "../../../storage";

export async function recalcClientTotals(tenantId: string): Promise<number> {
  let clientsRecalculated = 0;

  try {
    const allClients = await storage.getAllClients(tenantId);
    const allOrders = await storage.getAllOrders(tenantId);
    const allCommissions = await db.select().from(commissions);

    const commissionsByOrder = new Map<string, number>();
    for (const commission of allCommissions) {
      const amount = parseFloat(commission.amount || '0');
      if (!isNaN(amount)) {
        commissionsByOrder.set(
          commission.orderId,
          (commissionsByOrder.get(commission.orderId) || 0) + amount,
        );
      }
    }

    const ordersByClient = new Map<string, typeof allOrders>();
    for (const order of allOrders) {
      if (!order.clientId) continue;
      if (!ordersByClient.has(order.clientId)) ordersByClient.set(order.clientId, []);
      ordersByClient.get(order.clientId)!.push(order);
    }

    for (const client of allClients) {
      const clientOrders = ordersByClient.get(client.id) || [];
      const newTotalSales = clientOrders.reduce((sum, o) => {
        const orderTotal = parseFloat(o.total || '0');
        return sum + (isNaN(orderTotal) ? 0 : orderTotal);
      }, 0);

      const newCommissionTotal = clientOrders.reduce((sum, o) => sum + (commissionsByOrder.get(o.id) || 0), 0);

      const oldTotalSales = parseFloat(client.totalSales || '0');
      const oldCommissionTotal = parseFloat(client.commissionTotal || '0');

      if (Math.abs(oldTotalSales - newTotalSales) > 0.001 || Math.abs(oldCommissionTotal - newCommissionTotal) > 0.001) {
        await storage.updateClient(client.id, client.tenantId, {
          totalSales: newTotalSales.toFixed(2),
          commissionTotal: newCommissionTotal.toFixed(2),
        });
        clientsRecalculated++;
      }
    }
  } catch (error: any) {
    console.error('Error recalculating client totals:', error);
  }

  return clientsRecalculated;
}

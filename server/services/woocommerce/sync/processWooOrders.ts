import { differenceInMonths } from "date-fns";
import { storage } from "../../../storage";

export async function processWooOrders(params: {
  wooOrders: any[];
  tenantId: string;
}): Promise<{ synced: number; matched: number }> {
  const { wooOrders, tenantId } = params;
  let synced = 0;
  let matched = 0;

  console.log(`Processing ${wooOrders.length} orders...`);

  for (const order of wooOrders) {
    const email = order.billing?.email;
    const company = order.billing?.company;
    const salesAgentMeta = order.meta_data?.find((m: any) => m.key === '_sales_agent');
    const salesAgentName = salesAgentMeta?.value || null;

    console.log(`Processing order ${order.id}:`, {
      email,
      company,
      salesAgentName,
      total: order.total,
      status: order.status,
      date: order.date_created
    });

    let client = null;
    if (email) {
      client = await storage.findClientByUniqueKey('Email', email) ||
               await storage.findClientByUniqueKey('email', email);
      console.log(`Client lookup by email '${email}':`, client ? 'FOUND' : 'NOT FOUND');
    }

    if (!client && company) {
      client = await storage.findClientByUniqueKey('Company', company) ||
               await storage.findClientByUniqueKey('company', company);
      console.log(`Client lookup by company '${company}':`, client ? 'FOUND' : 'NOT FOUND');
    }

    const existingOrder = await storage.getOrderById(order.id.toString(), tenantId);

    let isReOrder = false;
    if (!existingOrder && client) {
      const clientOrders = await storage.getOrdersByClient(client.id, client.tenantId);
      if (clientOrders.length > 0) {
        isReOrder = true;
        console.log(`Re-order detected for client ${client.id} (${clientOrders.length} previous orders)`);
      }
    }

    if (existingOrder) {
      await storage.updateOrder(order.id.toString(), existingOrder.tenantId, {
        clientId: client?.id || null,
        orderNumber: order.number || order.id.toString(),
        billingEmail: email,
        billingCompany: company,
        salesAgentName,
        total: order.total,
        status: order.status,
        orderDate: new Date(order.date_created),
      });
    } else {
      await storage.createOrder({
        id: order.id.toString(),
        clientId: client?.id || null,
        orderNumber: order.number || order.id.toString(),
        billingEmail: email,
        billingCompany: company,
        salesAgentName,
        total: order.total,
        status: order.status,
        orderDate: new Date(order.date_created),
        tenantId,
      });

      if (isReOrder && client && client.assignedAgent) {
        const clientName = (client.data as any)?.name || (client.data as any)?.company || 'Unknown Client';
        await (storage as any).createNotification({
          userId: client.assignedAgent,
          clientId: client.id,
          type: 're_order',
          priority: 'medium',
          title: 'Re-Order Alert',
          message: `${clientName} has placed a new order! Order #${order.number || order.id} for $${order.total}`,
          metadata: {
            orderId: order.id.toString(),
            orderNumber: order.number || order.id.toString(),
            orderTotal: order.total,
            orderDate: order.date_created
          }
        });
      }
    }

    synced++;

    if (client) {
      matched++;
      const orderDate = new Date(order.date_created);
      const orderTotal = parseFloat(order.total);
      const updates: any = {
        lastOrderDate: orderDate,
        totalSales: (parseFloat(client.totalSales || '0') + orderTotal).toString(),
      };

      if (!client.firstOrderDate || new Date(client.firstOrderDate) > orderDate) {
        updates.firstOrderDate = orderDate;
      }

      if (client.assignedAgent && client.claimDate) {
        const monthsSinceClaim = differenceInMonths(orderDate, new Date(client.claimDate));
        const rate = monthsSinceClaim < 6 ? 0.25 : 0.10;
        const commission = orderTotal * rate;
        updates.commissionTotal = (parseFloat(client.commissionTotal || '0') + commission).toString();
      }

      await storage.updateClient(client.id, client.tenantId, updates);
    }
  }

  return { synced, matched };
}

import type { Express } from "express";
import { differenceInMonths, format } from "date-fns";
import { eq, sql } from "drizzle-orm";
import { clients, orders } from "@shared/schema";
import { db } from "../../db";
import * as commissionService from "../../commission-service";
import * as googleSheets from "../../googleSheets";
import { storage } from "../../storage";

export function registerWooCommerceWebhookRoutes(app: Express): void {
  app.post('/api/woocommerce/webhook', async (req: any, res) => {
    try {
      const webhookData = req.body;
      const webhookTopic = req.headers['x-wc-webhook-topic'];

      console.log('WooCommerce webhook received:', {
        topic: webhookTopic,
        source: req.headers['x-wc-webhook-source'],
        orderId: webhookData.id
      });

      if (!webhookTopic || !webhookTopic.toString().startsWith('order.')) {
        return res.status(200).json({ message: 'Webhook received but not an order event' });
      }

      if (webhookData.status !== 'completed' && webhookData.status !== 'processing') {
        return res.status(200).json({ message: 'Order status not tracked' });
      }

      const order = webhookData;
      const email = order.billing?.email;
      const company = order.billing?.company;
      const salesAgentMeta = order.meta_data?.find((m: any) => m.key === '_sales_agent');
      const salesAgentName = salesAgentMeta?.value || null;

      let client = null;
      if (email || company) {
        const clientRecord = await db.query.clients.findFirst({
          where: email
            ? eq(clients.data, sql`jsonb_build_object('email', ${email})`)
            : eq(clients.data, sql`jsonb_build_object('company', ${company})`)
        });
        client = clientRecord || null;
      }

      if (!client && email) {
        client = await storage.findClientByUniqueKey('Email', email) || await storage.findClientByUniqueKey('email', email);
      }
      if (!client && company) {
        client = await storage.findClientByUniqueKey('Company', company) || await storage.findClientByUniqueKey('company', company);
      }

      const [existingOrder] = await db.select().from(orders).where(eq(orders.id, order.id.toString()));
      const tenantId = client?.tenantId || existingOrder?.tenantId;

      if (!tenantId && !existingOrder) {
        return res.status(200).json({ message: 'Order skipped - no matching client found' });
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
          tenantId: tenantId!,
        });
      }

      if (client) {
        await commissionService.applyCommissions(order.id.toString());
      }

      if (client) {
        const orderDate = new Date(order.date_created);
        const orderTotal = parseFloat(order.total);
        const updates: any = {
          lastOrderDate: orderDate,
          totalSales: (parseFloat(client.totalSales || '0') + orderTotal).toString(),
        };

        let commission = 0;
        let commissionType = '';
        if (!client.firstOrderDate || new Date(client.firstOrderDate) > orderDate) {
          updates.firstOrderDate = orderDate;
        }
        if (client.assignedAgent && client.claimDate) {
          const monthsSinceClaim = differenceInMonths(orderDate, new Date(client.claimDate));
          const rate = monthsSinceClaim < 6 ? 0.25 : 0.10;
          commission = orderTotal * rate;
          commissionType = monthsSinceClaim < 6 ? '25%' : '10%';
          updates.commissionTotal = (parseFloat(client.commissionTotal || '0') + commission).toString();
        }

        await storage.updateClient(client.id, client.tenantId, updates);

        if (client.assignedAgent && commission > 0) {
          try {
            const sheetsConfig = await (storage as any).getSheetsConfig();
            if (sheetsConfig?.spreadsheetId && sheetsConfig?.commissionTrackerSheetName) {
              const existingData = await googleSheets.readSheetData(
                sheetsConfig.spreadsheetId,
                `${sheetsConfig.commissionTrackerSheetName}!A:A`
              );
              const nextRow = (existingData?.length || 1) + 1;

              let orderStatus = 'Closed Won';
              if (order.status === 'processing') orderStatus = '4 – Follow-Up';
              else if (order.status === 'refunded' || order.status === 'cancelled') orderStatus = '6 – Closed Lost';

              const rowData = [
                (client as any).link || '',
                order.transaction_id || '',
                format(orderDate, 'MM/dd/yyyy'),
                client.assignedAgent,
                order.id.toString(),
                commissionType,
                commission.toFixed(2),
                orderStatus,
                '',
                '',
                `WooCommerce order #${order.number || order.id} - $${orderTotal.toFixed(2)}`,
                (client as any).pocName || '',
                (client as any).pocEmail || email || '',
                (client as any).pocPhone || ''
              ];

              await googleSheets.writeSheetData(
                sheetsConfig.spreadsheetId,
                `${sheetsConfig.commissionTrackerSheetName}!A${nextRow}:N${nextRow}`,
                [rowData]
              );
              await googleSheets.writeCommissionTrackerTimestamp(
                sheetsConfig.spreadsheetId,
                sheetsConfig.commissionTrackerSheetName,
                nextRow,
                'P'
              );
            }
          } catch (sheetsError: any) {
            console.error('[Webhook] Failed to write to Commission Tracker:', sheetsError.message);
          }
        }
      }

      res.status(200).json({ message: 'Webhook processed', matched: !!client });
    } catch (error: any) {
      console.error("Webhook processing error:", error);
      res.status(200).json({ message: 'Webhook received but processing failed' });
    }
  });
}

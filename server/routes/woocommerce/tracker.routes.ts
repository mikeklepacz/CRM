import type { Express } from "express";
import { differenceInMonths } from "date-fns";
import { normalizeLink } from "../../../shared/linkUtils";
import * as googleSheets from "../../googleSheets";
import { storage } from "../../storage";

export function registerWooCommerceTrackerRoutes(
  app: Express,
  deps: { isAdmin: any; isAuthenticatedCustom: any },
): void {
  app.post('/api/woocommerce/write-to-tracker', deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const { orders: orderRequests } = req.body;
      if (!Array.isArray(orderRequests) || orderRequests.length === 0) {
        return res.status(400).json({ message: "No orders provided" });
      }

      const trackerSheet = await storage.getGoogleSheetByPurpose('commissions', req.user.tenantId);
      if (!trackerSheet) {
        return res.status(400).json({ message: "Commission Tracker sheet not connected" });
      }

      const { spreadsheetId, sheetName } = trackerSheet;
      const headerData = await googleSheets.readSheetData(spreadsheetId, `${sheetName}!1:1`);
      if (headerData.length === 0) {
        return res.status(400).json({ message: "Commission Tracker sheet is empty" });
      }

      const headers = headerData[0].filter((h: string) => h && h.trim() !== '');
      const columnMap: Record<string, number> = {};
      headers.forEach((header: string, index: number) => {
        columnMap[header.toLowerCase().trim()] = index;
      });

      const requiredColumns = ['link', 'agent name', 'date', 'order number', 'total', 'amount'];
      const missingColumns = requiredColumns.filter(col => !(col in columnMap));
      if (missingColumns.length > 0) {
        return res.status(400).json({ message: `Missing required columns in Commission Tracker: ${missingColumns.join(', ')}` });
      }

      const allRows = await googleSheets.readSheetData(spreadsheetId, `${sheetName}!A:ZZ`);
      const existingRows = allRows.slice(1);

      let written = 0;
      const conflicts: any[] = [];
      const tenantId = req.user.tenantId;

      for (const orderReq of orderRequests) {
        const { orderId, commissionType, commissionAmount } = orderReq;
        const order = await storage.getOrderById(orderId, tenantId);
        if (!order) continue;

        const client = await storage.getClient(order.clientId, tenantId);
        if (!client) continue;

        const linkValue = client.data?.Link || client.data?.link || client.uniqueIdentifier;
        if (!linkValue || !order.salesAgentName) continue;

        const orderTotal = parseFloat(order.total);
        let amount: number;
        if (commissionType === 'flat' && commissionAmount) amount = parseFloat(commissionAmount);
        else if (commissionType === '25') amount = orderTotal * 0.25;
        else if (commissionType === '10') amount = orderTotal * 0.10;
        else {
          const firstOrderDate = client.firstOrderDate ? new Date(client.firstOrderDate) : new Date(order.orderDate);
          const monthsSinceFirst = differenceInMonths(new Date(order.orderDate), firstOrderDate);
          amount = orderTotal * (monthsSinceFirst < 6 ? 0.25 : 0.10);
        }

        const orderDate = new Date(order.orderDate);
        const formattedDate = `${orderDate.getMonth() + 1}/${orderDate.getDate()}/${orderDate.getFullYear()}`;

        const duplicateRow = existingRows.find(row => {
          const existingOrderNumber = row[columnMap['order number']];
          return existingOrderNumber && existingOrderNumber.toString() === order.orderNumber.toString();
        });
        if (duplicateRow) continue;

        const conflictingRow = existingRows.find(row => {
          const existingLink = row[columnMap['link']];
          const existingAgent = row[columnMap['agent name']];
          return normalizeLink(existingLink) === normalizeLink(linkValue) &&
            existingAgent &&
            existingAgent.toLowerCase().trim() !== order.salesAgentName.toLowerCase().trim();
        });

        if (conflictingRow) {
          conflicts.push({
            orderId: order.id,
            orderNumber: order.orderNumber,
            newAgent: order.salesAgentName,
            existingAgent: conflictingRow[columnMap['agent name']],
            link: linkValue,
          });
          continue;
        }

        const rowData = new Array(headers.length).fill('');
        rowData[columnMap['link']] = linkValue;
        rowData[columnMap['agent name']] = order.salesAgentName;
        rowData[columnMap['date']] = formattedDate;
        rowData[columnMap['order number']] = order.orderNumber;
        rowData[columnMap['total']] = orderTotal.toFixed(2);
        rowData[columnMap['amount']] = amount.toFixed(2);

        await googleSheets.appendSheetData(spreadsheetId, `${sheetName}`, [rowData]);
        written++;
      }

      res.json({
        message: `Successfully written ${written} orders to Commission Tracker`,
        written,
        conflicts: conflicts.length > 0 ? conflicts : undefined,
      });
    } catch (error: any) {
      console.error("Write to tracker error:", error);
      res.status(500).json({ message: error.message || "Failed to write to tracker", written: 0 });
    }
  });
}

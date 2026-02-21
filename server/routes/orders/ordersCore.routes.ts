import type { Express } from "express";
import * as commissionService from "../../commission-service";
import * as googleSheets from "../../googleSheets";
import { storage } from "../../storage";
import { columnIndexToLetter } from "../../services/woocommerce/sync/utils";
import { normalizeLink } from "../../../shared/linkUtils";

export function registerOrdersCoreRoutes(
  app: Express,
  deps: { isAdmin: any; isAuthenticatedCustom: any },
): void {
  // Get all orders
  app.get('/api/orders', deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const tenantId = req.user.tenantId;
      const orders = await storage.getAllOrders(tenantId);
      console.log('[GET /api/orders] All orders fetched:', orders.length);

      // Check Commission Tracker to see which orders have tracker rows
      const sheets = await storage.getAllActiveGoogleSheets((req.user as any).tenantId);
      console.log('[GET /api/orders] All sheets:', sheets.map(s => ({ purpose: s.sheetPurpose, name: s.spreadsheetName })));
      const trackerSheet = sheets.find(s => s.sheetPurpose === 'commissions');
      console.log('[GET /api/orders] Tracker sheet found:', trackerSheet ? trackerSheet.spreadsheetName : 'NONE');

      if (trackerSheet) {
        try {
          const trackerRange = `${trackerSheet.sheetName}!A:ZZ`;
          const trackerRows = await googleSheets.readSheetData(trackerSheet.spreadsheetId, trackerRange);
          console.log('[GET /api/orders] Tracker rows read:', trackerRows.length);

          if (trackerRows.length > 0) {
            const trackerHeaders = trackerRows[0];
            console.log('[GET /api/orders] Tracker headers:', trackerHeaders);
            const transactionIdIndex = trackerHeaders.findIndex(h => h.toLowerCase() === 'transaction id');
            const linkIndex = trackerHeaders.findIndex(h => h.toLowerCase() === 'link');
            console.log('[GET /api/orders] Transaction ID column index:', transactionIdIndex);
            console.log('[GET /api/orders] Link column index:', linkIndex);

            // Build set of order IDs that have tracker rows
            const ordersWithTrackerRows = new Set<string>();
            const orderToTrackerLinks = new Map<string, Set<string>>();
            for (let i = 1; i < trackerRows.length; i++) {
              const transactionId = trackerRows[i][transactionIdIndex] || '';
              const rawLink = linkIndex >= 0 ? trackerRows[i][linkIndex] || '' : '';
              const normalized = rawLink ? normalizeLink(rawLink) : '';
              if (transactionId) {
                ordersWithTrackerRows.add(transactionId);
                if (normalized) {
                  if (!orderToTrackerLinks.has(transactionId)) {
                    orderToTrackerLinks.set(transactionId, new Set<string>());
                  }
                  orderToTrackerLinks.get(transactionId)!.add(normalized);
                }
              }
            }
            console.log('[GET /api/orders] Orders with tracker rows:', Array.from(ordersWithTrackerRows));

            const tenantClients = await storage.getAllClients(tenantId);
            const clientsById = new Map<string, any>();
            const clientsByLink = new Map<string, any>();
            for (const client of tenantClients) {
              clientsById.set(client.id, client);
              const linkValue = client.data?.Link || client.data?.link || client.uniqueIdentifier || '';
              const normalized = linkValue ? normalizeLink(linkValue) : '';
              if (normalized && !clientsByLink.has(normalized)) {
                clientsByLink.set(normalized, client);
              }
            }

            // Add hasTrackerRows field to each order
            const ordersWithStatus = orders.map((order: any) => ({
              ...order,
              hasTrackerRows: ordersWithTrackerRows.has(order.id),
              clientId: (() => {
                if (order.clientId && clientsById.has(order.clientId)) {
                  return order.clientId;
                }
                const trackerLinks = orderToTrackerLinks.get(order.id);
                if (!trackerLinks || trackerLinks.size === 0) return null;
                for (const link of Array.from(trackerLinks)) {
                  const matchedClient = clientsByLink.get(link);
                  if (matchedClient?.id) return matchedClient.id;
                }
                return null;
              })(),
            }));

            return res.json(ordersWithStatus);
          }
        } catch (trackerError) {
          console.error('Error checking Commission Tracker:', trackerError);
          // Continue without tracker status if error
        }
      }

      // If no tracker sheet or error, return orders without hasTrackerRows field
      res.json(orders);
    } catch (error: any) {
      console.error("Error fetching orders:", error);
      res.status(500).json({ message: error.message || "Failed to fetch orders" });
    }
  });

  // Update order (for commission type and amount)
  app.patch('/api/orders/:orderId', deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const { orderId } = req.params;
      const tenantId = req.user.tenantId;
      const { commissionType, commissionAmount } = req.body;

      const updates: any = {};
      if (commissionType !== undefined) updates.commissionType = commissionType;
      if (commissionAmount !== undefined) updates.commissionAmount = commissionAmount;

      const updatedOrder = await storage.updateOrder(orderId, tenantId, updates);

      if (!updatedOrder) {
        return res.status(404).json({ message: "Order not found" });
      }

      res.json(updatedOrder);
    } catch (error: any) {
      console.error("Error updating order:", error);
      res.status(500).json({ message: error.message || "Failed to update order" });
    }
  });
  // Save commission settings for multiple orders (database + Google Sheets)
  app.post('/api/orders/save-commissions', deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const { orders: orderUpdates } = req.body;

      if (!orderUpdates || !Array.isArray(orderUpdates)) {
        return res.status(400).json({ message: "Orders array is required" });
      }

      // Step 1: Update database
      const tenantId = req.user.tenantId;
      let dbUpdated = 0;
      for (const update of orderUpdates) {
        const { orderId, commissionType, commissionAmount } = update;

        if (!orderId) continue;

        const updates: any = {};
        if (commissionType !== undefined) updates.commissionType = commissionType;
        if (commissionAmount !== undefined) updates.commissionAmount = commissionAmount;

        if (Object.keys(updates).length > 0) {
          await storage.updateOrder(orderId, tenantId, updates);
          dbUpdated++;
          console.log(`DB: Updated order ${orderId} with:`, updates);
        }
      }

      // Step 2: Write to Google Sheets Commission Tracker
      let sheetsWritten = 0;
      const trackerSheet = await storage.getGoogleSheetByPurpose('commissions', (req.user as any).tenantId);
      console.log('Tracker sheet found:', trackerSheet ? `${trackerSheet.spreadsheetName} / ${trackerSheet.sheetName}` : 'NONE');

      if (trackerSheet) {
        const { spreadsheetId, sheetName } = trackerSheet;

        // Read tracker headers
        const headerRange = `${sheetName}!1:1`;
        const headerData = await googleSheets.readSheetData(spreadsheetId, headerRange);

        if (headerData.length > 0) {
          const headers = headerData[0];
          const columnMap: Record<string, number> = {};
          headers.forEach((header: string, index: number) => {
            columnMap[header.toLowerCase().trim()] = index;
          });

          console.log('Headers:', headers);
          console.log('Column map:', columnMap);

          // Read all existing rows
          const allDataRange = `${sheetName}!A:ZZ`;
          const allRows = await googleSheets.readSheetData(spreadsheetId, allDataRange);
          const existingRows = allRows.slice(1);
          console.log(`Read ${existingRows.length} data rows from sheet`);

          for (const orderReq of orderUpdates) {
            const { orderId, commissionType, commissionAmount } = orderReq;
            console.log(`\n--- Processing order ${orderId} ---`);

            // Get order from database
            const order = await storage.getOrderById(orderId, tenantId);
            if (!order) {
              console.log(`Order ${orderId} not found in database`);
              continue;
            }
            console.log(`Order found: total=${order.total}`);

            // Find existing row(s) by Transaction ID in Commission Tracker
            const transactionIdIndex = columnMap['transaction id'];
            console.log(`Transaction ID column index: ${transactionIdIndex}`);
            if (transactionIdIndex === undefined || transactionIdIndex < 0) {
              console.log('ERROR: Transaction ID column not found in headers');
              continue;
            }

            const normalizedOrderId = String(orderId).trim();

            // Find all rows matching this order ID (could be multiple stores)
            const matchingRowIndices: number[] = [];
            for (let i = 0; i < existingRows.length; i++) {
              const rowTransactionId = String(existingRows[i][transactionIdIndex] ?? '').trim();
              if (rowTransactionId === normalizedOrderId) {
                matchingRowIndices.push(i + 2); // +2 for header and 1-indexed
                console.log(`Found match at row ${i + 2}: Transaction ID = ${rowTransactionId}`);
              }
            }

            console.log(`Found ${matchingRowIndices.length} matching rows for order ${orderId}`);
            if (matchingRowIndices.length === 0) {
              console.log('No matching rows found - skipping');
              continue;
            }

            // Calculate commission amount
            const orderTotal = parseFloat(order.total);
            let amount: number;

            if (commissionType === 'flat' && commissionAmount) {
              amount = parseFloat(commissionAmount);
            } else if (commissionType === '25') {
              amount = orderTotal * 0.25;
            } else if (commissionType === '10') {
              amount = orderTotal * 0.10;
            } else {
              // Auto: default to 25% (proper 6-month rule requires client data)
              amount = orderTotal * 0.25;
            }

            // Determine commission type label
            let commissionTypeLabel = 'Auto';
            if (commissionType === 'flat') commissionTypeLabel = 'Flat';
            else if (commissionType === '25') commissionTypeLabel = '25%';
            else if (commissionType === '10') commissionTypeLabel = '10%';

            // Update all matching rows
            console.log(`Calculated amount: $${amount.toFixed(2)}, type: ${commissionTypeLabel}`);

            for (const rowIndex of matchingRowIndices) {
              const updates: Array<{range: string, values: any[][]}> = [];

              if ('commission type' in columnMap) {
                const col = columnIndexToLetter(columnMap['commission type']);
                const range = `${sheetName}!${col}${rowIndex}`;
                updates.push({
                  range,
                  values: [[commissionTypeLabel]]
                });
                console.log(`Will update Commission Type: ${range} = ${commissionTypeLabel}`);
              } else {
                console.log('WARNING: "commission type" column not found');
              }

              if ('amount' in columnMap) {
                const col = columnIndexToLetter(columnMap['amount']);
                const range = `${sheetName}!${col}${rowIndex}`;
                updates.push({
                  range,
                  values: [[amount.toFixed(2)]]
                });
                console.log(`Will update Amount: ${range} = $${amount.toFixed(2)}`);
              } else {
                console.log('WARNING: "amount" column not found');
              }

              if ('total' in columnMap && !isNaN(orderTotal)) {
                const col = columnIndexToLetter(columnMap['total']);
                const range = `${sheetName}!${col}${rowIndex}`;
                updates.push({
                  range,
                  values: [[orderTotal.toFixed(2)]]
                });
                console.log(`Will update Total: ${range} = $${orderTotal.toFixed(2)}`);
              } else if (!('total' in columnMap)) {
                console.log('WARNING: "total" column not found');
              } else if (isNaN(orderTotal)) {
                console.log(`WARNING: orderTotal is not a valid number: ${orderTotal}`);
              }

              for (const update of updates) {
                console.log(`Writing to Google Sheets: ${update.range}`, update.values);
                await googleSheets.writeSheetData(spreadsheetId, update.range, update.values);
                console.log(`Successfully wrote: ${update.range}`);
              }

              sheetsWritten++;
            }
          }
        }
      }

      // Step 3: Recalculate commissions in SQL for all updated orders
      // This ensures the commissions table is accurate with new commission types/amounts
      let commissionsRecalculated = 0;
      for (const update of orderUpdates) {
        const { orderId } = update;
        if (!orderId) continue;

        try {
          await commissionService.applyCommissions(orderId);
          commissionsRecalculated++;
          console.log(`Recalculated commissions for order ${orderId}`);
        } catch (error: any) {
          console.error(`Failed to recalculate commissions for order ${orderId}:`, error);
        }
      }

      res.json({ 
        message: `Saved ${dbUpdated} commission settings to database` + 
                 (sheetsWritten > 0 ? `, wrote ${sheetsWritten} to Google Sheets` : '') +
                 `, and recalculated ${commissionsRecalculated} commission records`,
        dbUpdated,
        sheetsWritten,
        commissionsRecalculated
      });
    } catch (error: any) {
      console.error("Error saving commission settings:", error);
      res.status(500).json({ message: error.message || "Failed to save commission settings" });
    }
  });
}

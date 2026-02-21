import type { Express } from "express";
import { and, eq } from "drizzle-orm";
import { clients, orders, users } from "@shared/schema";
import { normalizeLink } from "../../../shared/linkUtils";
import { db } from "../../db";
import * as googleSheets from "../../googleSheets";
import { storage } from "../../storage";

export function registerOrderMatchRoutes(
  app: Express,
  deps: { isAdmin: any; isAuthenticatedCustom: any },
): void {
  // Manually match an order to multiple stores (Google Sheets-based multi-select)
  app.post('/api/orders/:orderId/match', deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const { orderId } = req.params;
      const { storeLinks, dba } = req.body; // Array of {link, name} objects and optional DBA

      if (!storeLinks || !Array.isArray(storeLinks) || storeLinks.length === 0) {
        return res.status(400).json({ message: "At least one store must be selected" });
      }

      const tenantId = req.user.tenantId;
      const order = await storage.getOrderById(orderId, tenantId);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      // Find Commission Tracker sheet (Store Database syncs from Tracker via Google Sheets)
      const sheets = await storage.getAllActiveGoogleSheets((req.user as any).tenantId);
      const trackerSheet = sheets.find(s => s.sheetPurpose === 'commissions');

      if (!trackerSheet) {
        return res.status(404).json({ message: 'Commission Tracker sheet not found' });
      }

      // Read tracker data to check if stores already have rows
      const trackerRange = `${trackerSheet.sheetName}!A:ZZ`;
      const trackerRows = await googleSheets.readSheetData(trackerSheet.spreadsheetId, trackerRange);

      if (trackerRows.length === 0) {
        return res.status(400).json({ message: 'Commission Tracker sheet is empty' });
      }

      const trackerHeaders = trackerRows[0];
      const linkIndex = trackerHeaders.findIndex(h => h.toLowerCase() === 'link');
      const orderIdIndex = trackerHeaders.findIndex(h => h.toLowerCase() === 'order id');
      const transactionIdIndex = trackerHeaders.findIndex(h => h.toLowerCase() === 'transaction id');
      const agentNameIndex = trackerHeaders.findIndex(h => h.toLowerCase() === 'agent name');
      const trackerDateIndex = trackerHeaders.findIndex(h => h.toLowerCase() === 'date');
      const trackerPocEmailIndex = trackerHeaders.findIndex(h => h.toLowerCase() === 'poc email');
      const statusIndex = trackerHeaders.findIndex(h => h.toLowerCase() === 'status');

      if (linkIndex === -1) {
        return res.status(400).json({ message: 'Commission Tracker must have a "Link" column' });
      }

      // Get agent name from order
      const agentName = order.salesAgentName || '';

      let rowsProcessed = 0;
      const results: Array<{link: string, name: string, action: string}> = [];

      // Process each selected store
      for (const store of storeLinks) {
        const { link: storeLink, name: storeName } = store;

        // Note: Store Database (DBA, Agent Name, Email) is now synced automatically from Commission Tracker via Google Sheets
        // We only write to Commission Tracker and let the sync handle the Store Database updates

        // Update or create row in Commission Tracker
        let existingTrackerRowIndex = -1;
        for (let i = 1; i < trackerRows.length; i++) {
          if (normalizeLink(trackerRows[i][linkIndex]) === normalizeLink(storeLink)) {
            existingTrackerRowIndex = i + 1; // +1 for 1-indexed Google Sheets
            break;
          }
        }

        if (existingTrackerRowIndex > 0) {
          // Update existing tracker row
          if (orderIdIndex !== -1) {
            const orderIdColumn = String.fromCharCode(65 + orderIdIndex);
            const updateRange = `${trackerSheet.sheetName}!${orderIdColumn}${existingTrackerRowIndex}`;
            await googleSheets.writeSheetData(trackerSheet.spreadsheetId, updateRange, [[order.orderNumber]]);
          }

          if (transactionIdIndex !== -1) {
            const txIdColumn = String.fromCharCode(65 + transactionIdIndex);
            const txRange = `${trackerSheet.sheetName}!${txIdColumn}${existingTrackerRowIndex}`;
            await googleSheets.writeSheetData(trackerSheet.spreadsheetId, txRange, [[order.id]]);
          }

          if (agentNameIndex !== -1 && agentName) {
            const agentColumn = String.fromCharCode(65 + agentNameIndex);
            const agentRange = `${trackerSheet.sheetName}!${agentColumn}${existingTrackerRowIndex}`;
            await googleSheets.writeSheetData(trackerSheet.spreadsheetId, agentRange, [[agentName]]);
          }

          if (trackerDateIndex !== -1 && order.orderDate) {
            const dateColumn = String.fromCharCode(65 + trackerDateIndex);
            const dateRange = `${trackerSheet.sheetName}!${dateColumn}${existingTrackerRowIndex}`;
            const formattedDate = new Date(order.orderDate).toLocaleDateString('en-US');
            await googleSheets.writeSheetData(trackerSheet.spreadsheetId, dateRange, [[formattedDate]]);
          }

          if (trackerPocEmailIndex !== -1 && order.billingEmail) {
            const emailColumn = String.fromCharCode(65 + trackerPocEmailIndex);
            const emailRange = `${trackerSheet.sheetName}!${emailColumn}${existingTrackerRowIndex}`;
            await googleSheets.writeSheetData(trackerSheet.spreadsheetId, emailRange, [[order.billingEmail]]);
          }

          if (statusIndex !== -1) {
            const statusColumn = String.fromCharCode(65 + statusIndex);
            const statusRange = `${trackerSheet.sheetName}!${statusColumn}${existingTrackerRowIndex}`;
            await googleSheets.writeSheetData(trackerSheet.spreadsheetId, statusRange, [['Closed Won']]);
          }

          rowsProcessed++;
          results.push({ link: storeLink, name: storeName, action: 'updated' });
        } else {
          // Create new row in Commission Tracker
          const newRow: any[] = new Array(trackerHeaders.length).fill('');

          // Set Link
          if (linkIndex !== -1) newRow[linkIndex] = storeLink;

          // Set Order ID
          if (orderIdIndex !== -1) newRow[orderIdIndex] = order.orderNumber;

          // Set Transaction ID
          if (transactionIdIndex !== -1) newRow[transactionIdIndex] = order.id;

          // Set Agent Name
          if (agentNameIndex !== -1 && agentName) newRow[agentNameIndex] = agentName;

          // Set Date
          if (trackerDateIndex !== -1 && order.orderDate) {
            const formattedDate = new Date(order.orderDate).toLocaleDateString('en-US');
            newRow[trackerDateIndex] = formattedDate;
          }

          // Set POC Email
          if (trackerPocEmailIndex !== -1 && order.billingEmail) {
            newRow[trackerPocEmailIndex] = order.billingEmail;
          }

          // Set Status
          if (statusIndex !== -1) {
            newRow[statusIndex] = 'Closed Won';
          }

          // Append new row to Commission Tracker
          const appendRange = `${trackerSheet.sheetName}!A:ZZ`;
          await googleSheets.appendSheetData(trackerSheet.spreadsheetId, appendRange, [newRow]);

          rowsProcessed++;
          results.push({ link: storeLink, name: storeName, action: 'created' });
        }
      }

      // Populate/update clients table with matched store data
      // This ensures clients table becomes the source of truth for reorders
      for (const store of storeLinks) {
        const { link: storeLink, name: storeName } = store;
        const normalizedLink = normalizeLink(storeLink);

        // Check if client already exists by unique identifier (link)
        const existingClient = await db.query.clients.findFirst({
          where: and(
            eq(clients.uniqueIdentifier, normalizedLink),
            eq(clients.tenantId, tenantId)
          ),
        });

        if (existingClient) {
          // Update existing client with order data
          const updates: any = {};

          // Set firstOrderDate if not already set
          if (!existingClient.firstOrderDate && order.orderDate) {
            updates.firstOrderDate = order.orderDate;
          }

          // Update lastOrderDate if this order is more recent
          if (!existingClient.lastOrderDate || new Date(order.orderDate) > new Date(existingClient.lastOrderDate)) {
            updates.lastOrderDate = order.orderDate;
          }

          // Set assigned agent if not already set
          if (!existingClient.assignedAgent && order.salesAgentName) {
            const assignedUser = await db.query.users.findFirst({
              where: eq(users.agentName, order.salesAgentName),
            });
            if (assignedUser) {
              updates.assignedAgent = assignedUser.id;
            }
          }

          if (Object.keys(updates).length > 0) {
            await db.update(clients)
              .set({ ...updates, updatedAt: new Date() })
              .where(eq(clients.id, existingClient.id));
          }
        } else {
          // Create new client record
          const assignedUser = order.salesAgentName 
            ? await db.query.users.findFirst({ where: eq(users.agentName, order.salesAgentName) })
            : null;

          await db.insert(clients).values({
            tenantId,
            uniqueIdentifier: normalizedLink,
            data: {
              storeName: storeName,
              link: storeLink,
              email: order.billingEmail || '',
              company: order.billingCompany || '',
            },
            assignedAgent: assignedUser?.id || null,
            firstOrderDate: order.orderDate,
            lastOrderDate: order.orderDate,
            status: 'active',
          });
        }
      }

      // Also link order to client in orders table
      if (storeLinks.length > 0) {
        const primaryStoreLink = normalizeLink(storeLinks[0].link);
        const primaryClient = await db.query.clients.findFirst({
          where: and(
            eq(clients.uniqueIdentifier, primaryStoreLink),
            eq(clients.tenantId, tenantId)
          ),
        });

        if (primaryClient) {
          await db.update(orders)
            .set({ clientId: primaryClient.id })
            .where(and(eq(orders.id, orderId), eq(orders.tenantId, tenantId)));
        }
      }

      // Success! All data is now in Google Sheets Commission Tracker AND clients table
      res.json({ 
        message: `Order ${order.orderNumber} matched to ${storeLinks.length} store(s)`,
        rowsProcessed,
        results,
        dba: dba || null
      });
    } catch (error: any) {
      console.error("Error matching order:", error);
      res.status(500).json({ message: error.message || "Failed to match order" });
    }
  });
}

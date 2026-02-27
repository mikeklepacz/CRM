import * as commissionService from "../../commission-service";
import * as googleSheets from "../../googleSheets";
import { storage } from "../../storage";
import { columnIndexToLetter } from "../../services/woocommerce/sync/utils";

export function buildOrdersCoreSaveCommissionsHandler() {
  return async (req: any, res: any) => {
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
          if (!orderId)
              continue;
          const updates: any = {};
          if (commissionType !== undefined)
              updates.commissionType = commissionType;
          if (commissionAmount !== undefined)
              updates.commissionAmount = commissionAmount;
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
                  }
                  else if (commissionType === '25') {
                      amount = orderTotal * 0.25;
                  }
                  else if (commissionType === '10') {
                      amount = orderTotal * 0.10;
                  }
                  else {
                      // Auto: default to 25% (proper 6-month rule requires client data)
                      amount = orderTotal * 0.25;
                  }
                  // Determine commission type label
                  let commissionTypeLabel = 'Auto';
                  if (commissionType === 'flat')
                      commissionTypeLabel = 'Flat';
                  else if (commissionType === '25')
                      commissionTypeLabel = '25%';
                  else if (commissionType === '10')
                      commissionTypeLabel = '10%';
                  // Update all matching rows
                  console.log(`Calculated amount: $${amount.toFixed(2)}, type: ${commissionTypeLabel}`);
                  for (const rowIndex of matchingRowIndices) {
                      const updates: Array<{
                          range: string;
                          values: any[][];
                      }> = [];
                      if ('commission type' in columnMap) {
                          const col = columnIndexToLetter(columnMap['commission type']);
                          const range = `${sheetName}!${col}${rowIndex}`;
                          updates.push({
                              range,
                              values: [[commissionTypeLabel]]
                          });
                          console.log(`Will update Commission Type: ${range} = ${commissionTypeLabel}`);
                      }
                      else {
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
                      }
                      else {
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
                      }
                      else if (!('total' in columnMap)) {
                          console.log('WARNING: "total" column not found');
                      }
                      else if (isNaN(orderTotal)) {
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
          if (!orderId)
              continue;
          try {
              await commissionService.applyCommissions(orderId);
              commissionsRecalculated++;
              console.log(`Recalculated commissions for order ${orderId}`);
          }
          catch (error: any) {
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
    }
    catch (error: any) {
      console.error("Error saving commission settings:", error);
      res.status(500).json({ message: error.message || "Failed to save commission settings" });
    }
  };
}

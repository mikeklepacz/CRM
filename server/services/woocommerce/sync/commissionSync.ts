import { eq } from "drizzle-orm";
import { commissions, users } from "@shared/schema";
import { db } from "../../../db";
import * as commissionService from "../../../commission-service";
import * as googleSheets from "../../../googleSheets";
import { storage } from "../../../storage";
import { columnIndexToLetter } from "./utils";

export async function syncCommissions(params: {
  tenantId: string;
  reqUser: any;
}): Promise<{ commissionsCalculated: number; agentTransfers: number; sheetsUpdated: number }> {
  const { tenantId, reqUser } = params;
  let commissionsCalculated = 0;
  let agentTransfers = 0;
  let sheetsUpdated = 0;

  let trackerSheet: any = null;
  let trackerHeaders: string[] = [];
  let trackerRows: any[][] = [];

  try {
    const sheets = await storage.getAllActiveGoogleSheets(reqUser.tenantId);
    trackerSheet = sheets.find(s => s.sheetPurpose === 'commissions');
    if (trackerSheet) {
      trackerRows = await googleSheets.readSheetData(trackerSheet.spreadsheetId, `${trackerSheet.sheetName}!A:ZZ`);
      if (trackerRows.length > 0) trackerHeaders = trackerRows[0];
    }
  } catch (sheetError: any) {
    console.error('Failed to load Commission Tracker sheet:', sheetError.message);
  }

  try {
    const allLocalOrders = await storage.getAllOrders(tenantId);

    for (const localOrder of allLocalOrders) {
      if (!localOrder.salesAgentName) continue;

      const existingCommissions = await db.query.commissions.findMany({ where: eq(commissions.orderId, localOrder.id) });
      let needsRecalculation = existingCommissions.length === 0;

      if (!needsRecalculation && existingCommissions.length > 0) {
        const primaryCommission = existingCommissions.find(c => c.commissionKind === 'primary');
        if (!primaryCommission) {
          needsRecalculation = true;
        } else {
          const commissionAgent = await db.query.users.findFirst({ where: eq(users.id, primaryCommission.agentId) });
          if (!commissionAgent) {
            needsRecalculation = true;
            agentTransfers++;
          } else if (commissionAgent.agentName?.toLowerCase().trim() !== localOrder.salesAgentName.toLowerCase().trim()) {
            needsRecalculation = true;
            agentTransfers++;
          }
        }
      }

      if (!needsRecalculation) continue;

      try {
        await commissionService.applyCommissions(localOrder.id);
        commissionsCalculated++;

        if (trackerSheet && trackerHeaders.length > 0) {
          const orderIdIndex = trackerHeaders.findIndex(h => h.toLowerCase() === 'order id');
          const agentNameIndex = trackerHeaders.findIndex(h => h.toLowerCase() === 'agent name');
          const totalIndex = trackerHeaders.findIndex(h => h.toLowerCase() === 'total');

          if (orderIdIndex !== -1 && agentNameIndex !== -1) {
            for (let i = 1; i < trackerRows.length; i++) {
              if (trackerRows[i][orderIdIndex] !== localOrder.orderNumber) continue;
              const rowNumber = i + 1;
              const updates: Array<{ range: string; values: any[][] }> = [];
              updates.push({
                range: `${trackerSheet.sheetName}!${columnIndexToLetter(agentNameIndex)}${rowNumber}`,
                values: [[localOrder.salesAgentName]],
              });

              if (totalIndex !== -1 && localOrder.total) {
                const orderTotal = parseFloat(localOrder.total);
                if (!isNaN(orderTotal)) {
                  updates.push({
                    range: `${trackerSheet.sheetName}!${columnIndexToLetter(totalIndex)}${rowNumber}`,
                    values: [[orderTotal.toFixed(2)]],
                  });
                }
              }

              for (const update of updates) {
                await googleSheets.writeSheetData(trackerSheet.spreadsheetId, update.range, update.values);
              }
              sheetsUpdated++;
              break;
            }
          }
        }
      } catch (commErr: any) {
        console.error(`✗ Failed to sync commission for order ${localOrder.id}:`, commErr.message);
      }
    }
  } catch (syncError: any) {
    console.error('Commission sync error:', syncError);
  }

  return { commissionsCalculated, agentTransfers, sheetsUpdated };
}

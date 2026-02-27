import * as googleSheets from "../../googleSheets";
import { storage } from "../../storage";
import { normalizeLink } from "../../../shared/linkUtils";

export async function handleOrdersCoreList(req: any, res: any): Promise<any> {
  try {
    const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
    const tenantId = req.user.tenantId;
    const orders = await storage.getAllOrders(tenantId);
    console.log("[GET /api/orders] All orders fetched:", orders.length);
    const sheets = await storage.getAllActiveGoogleSheets((req.user as any).tenantId);
    console.log("[GET /api/orders] All sheets:", sheets.map(s => ({ purpose: s.sheetPurpose, name: s.spreadsheetName })));
    const trackerSheet = sheets.find(s => s.sheetPurpose === "commissions");
    console.log("[GET /api/orders] Tracker sheet found:", trackerSheet ? trackerSheet.spreadsheetName : "NONE");
    if (trackerSheet) {
      try {
        const trackerRange = `${trackerSheet.sheetName}!A:ZZ`;
        const trackerRows = await googleSheets.readSheetData(trackerSheet.spreadsheetId, trackerRange);
        console.log("[GET /api/orders] Tracker rows read:", trackerRows.length);
        if (trackerRows.length > 0) {
          const trackerHeaders = trackerRows[0];
          console.log("[GET /api/orders] Tracker headers:", trackerHeaders);
          const transactionIdIndex = trackerHeaders.findIndex(h => h.toLowerCase() === "transaction id");
          const linkIndex = trackerHeaders.findIndex(h => h.toLowerCase() === "link");
          console.log("[GET /api/orders] Transaction ID column index:", transactionIdIndex);
          console.log("[GET /api/orders] Link column index:", linkIndex);
          const ordersWithTrackerRows = new Set<string>();
          const orderToTrackerLinks = new Map<string, Set<string>>();
          for (let i = 1; i < trackerRows.length; i++) {
            const transactionId = trackerRows[i][transactionIdIndex] || "";
            const rawLink = linkIndex >= 0 ? trackerRows[i][linkIndex] || "" : "";
            const normalized = rawLink ? normalizeLink(rawLink) : "";
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
          console.log("[GET /api/orders] Orders with tracker rows:", Array.from(ordersWithTrackerRows));
          const tenantClients = await storage.getAllClients(tenantId);
          const clientsById = new Map<string, any>();
          const clientsByLink = new Map<string, any>();
          for (const client of tenantClients) {
            clientsById.set(client.id, client);
            const linkValue = client.data?.Link || client.data?.link || client.uniqueIdentifier || "";
            const normalized = linkValue ? normalizeLink(linkValue) : "";
            if (normalized && !clientsByLink.has(normalized)) {
              clientsByLink.set(normalized, client);
            }
          }
          const ordersWithStatus = orders.map((order: any) => ({
            ...order,
            hasTrackerRows: ordersWithTrackerRows.has(order.id),
            clientId: (() => {
              if (order.clientId && clientsById.has(order.clientId)) {
                return order.clientId;
              }
              const trackerLinks = orderToTrackerLinks.get(order.id);
              if (!trackerLinks || trackerLinks.size === 0)
                return null;
              for (const link of Array.from(trackerLinks)) {
                const matchedClient = clientsByLink.get(link);
                if (matchedClient?.id)
                  return matchedClient.id;
              }
              return null;
            })(),
          }));
          return res.json(ordersWithStatus);
        }
      }
      catch (trackerError) {
        console.error("Error checking Commission Tracker:", trackerError);
      }
    }
    res.json(orders);
  }
  catch (error: any) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ message: error.message || "Failed to fetch orders" });
  }
}

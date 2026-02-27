import axios from "axios";
import { storage } from "../../storage";
import { autoMatchOrders } from "../../services/woocommerce/sync/autoMatchOrders";
import { cleanupTrackerRows } from "../../services/woocommerce/sync/cleanupTracker";
import { syncCommissions } from "../../services/woocommerce/sync/commissionSync";
import { deleteMissingOrders } from "../../services/woocommerce/sync/deleteMissingOrders";
import { processWooOrders } from "../../services/woocommerce/sync/processWooOrders";
import { recalcClientTotals } from "../../services/woocommerce/sync/recalcClientTotals";
import { syncTotals } from "../../services/woocommerce/sync/totalSync";

export async function handleWooCommerceSync(req: any, res: any): Promise<any> {
  let stage = "init";
  const requestId = `woo-sync-${Date.now()}`;
  try {
    stage = "resolve-user";
    const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
    const tenantId = req.user.tenantId;
    console.log(`[WooSync][${requestId}] start`, { userId, tenantId });

    stage = "load-integration";
    const integration = await storage.getUserIntegration(userId);
    const wooUrl = integration?.wooUrl;
    const consumerKey = integration?.wooConsumerKey;
    const consumerSecret = integration?.wooConsumerSecret;

    if (!wooUrl || !consumerKey || !consumerSecret) {
      console.error(`[WooSync][${requestId}] missing credentials`, { stage, hasUrl: !!wooUrl, hasKey: !!consumerKey, hasSecret: !!consumerSecret });
      return res.status(500).json({ message: "WooCommerce credentials not configured. Please configure in Settings." });
    }

    stage = "fetch-orders";
    const apiUrl = `${wooUrl}/wp-json/wc/v3/orders`;
    let allOrders: any[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const response = await axios.get(apiUrl, {
        auth: { username: consumerKey, password: consumerSecret },
        params: {
          per_page: 100,
          page,
          orderby: "date",
          order: "desc",
          status: "completed,processing",
        },
      });

      if (!Array.isArray(response.data) || response.data.length === 0) {
        hasMore = false;
      } else {
        allOrders = allOrders.concat(response.data);
        page++;
      }

      if (page > 1000) hasMore = false;
    }

    const wooOrders = allOrders;
    console.log(`[WooSync][${requestId}] fetched orders`, { count: wooOrders.length });
    if (!Array.isArray(wooOrders)) {
      return res.status(500).json({ message: "Invalid response from WooCommerce API", total: 0, synced: 0, matched: 0 });
    }

    if (wooOrders.length === 0) {
      return res.json({ message: "No orders found in WooCommerce", total: 0, synced: 0, matched: 0 });
    }

    stage = "process-orders";
    const { synced, matched } = await processWooOrders({ wooOrders, tenantId });
    stage = "delete-missing-orders";
    const deleted = await deleteMissingOrders({ wooOrders, tenantId, reqUser: req.user });
    stage = "auto-match-orders";
    const autoMatched = await autoMatchOrders({ wooOrders, reqUser: req.user });
    stage = "sync-commissions";
    const { commissionsCalculated } = await syncCommissions({ tenantId, reqUser: req.user });
    stage = "sync-totals";
    await syncTotals({ tenantId, reqUser: req.user });
    stage = "recalc-client-totals";
    const clientsRecalculated = await recalcClientTotals(tenantId);
    stage = "cleanup-tracker";
    await cleanupTrackerRows({ wooOrders, reqUser: req.user });

    stage = "update-last-synced";
    await storage.updateUserIntegration(userId, { wooLastSyncedAt: new Date() });
    stage = "done";
    console.log(`[WooSync][${requestId}] completed`, { synced, matched, deleted, autoMatched, commissionsCalculated, clientsRecalculated });

    res.json({
      message: `WooCommerce sync completed. ${deleted > 0 ? `Removed ${deleted} deleted/cancelled orders. ` : ""}${clientsRecalculated > 0 ? `Recalculated ${clientsRecalculated} client totals. ` : ""}${autoMatched > 0 ? `Auto-matched ${autoMatched} orders. ` : ""}${commissionsCalculated > 0 ? `Calculated ${commissionsCalculated} commissions.` : ""}`,
      synced,
      matched,
      autoMatched,
      commissionsCalculated,
      total: wooOrders.length,
    });
  } catch (error: any) {
    console.error(`[WooSync][${requestId}] error`, { stage, error });
    console.error(`[WooSync][${requestId}] error details`, {
      stage,
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
    res.status(500).json({
      message: error.response?.data?.message || error.message || "Sync failed",
      stage,
      requestId,
      total: 0,
      synced: 0,
      matched: 0
    });
  }
}

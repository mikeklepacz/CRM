import type { Express } from "express";
import axios from "axios";
import { storage } from "../../storage";
import { autoMatchOrders } from "../../services/woocommerce/sync/autoMatchOrders";
import { cleanupTrackerRows } from "../../services/woocommerce/sync/cleanupTracker";
import { syncCommissions } from "../../services/woocommerce/sync/commissionSync";
import { deleteMissingOrders } from "../../services/woocommerce/sync/deleteMissingOrders";
import { processWooOrders } from "../../services/woocommerce/sync/processWooOrders";
import { recalcClientTotals } from "../../services/woocommerce/sync/recalcClientTotals";
import { syncTotals } from "../../services/woocommerce/sync/totalSync";

export function registerWooCommerceSyncRoutes(
  app: Express,
  deps: { isAdmin: any; isAuthenticatedCustom: any },
): void {
  app.post('/api/woocommerce/sync', deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const tenantId = req.user.tenantId;

      const integration = await storage.getUserIntegration(userId);
      const wooUrl = integration?.wooUrl;
      const consumerKey = integration?.wooConsumerKey;
      const consumerSecret = integration?.wooConsumerSecret;

      if (!wooUrl || !consumerKey || !consumerSecret) {
        return res.status(500).json({ message: "WooCommerce credentials not configured. Please configure in Settings." });
      }

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
            orderby: 'date',
            order: 'desc',
            status: 'completed,processing',
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
      if (!Array.isArray(wooOrders)) {
        return res.status(500).json({ message: "Invalid response from WooCommerce API", total: 0, synced: 0, matched: 0 });
      }

      if (wooOrders.length === 0) {
        return res.json({ message: "No orders found in WooCommerce", total: 0, synced: 0, matched: 0 });
      }

      const { synced, matched } = await processWooOrders({ wooOrders, tenantId });
      const deleted = await deleteMissingOrders({ wooOrders, tenantId, reqUser: req.user });
      const autoMatched = await autoMatchOrders({ wooOrders, reqUser: req.user });
      const { commissionsCalculated } = await syncCommissions({ tenantId, reqUser: req.user });
      await syncTotals({ tenantId, reqUser: req.user });
      const clientsRecalculated = await recalcClientTotals(tenantId);
      await cleanupTrackerRows({ wooOrders, reqUser: req.user });

      await storage.updateUserIntegration(userId, { wooLastSyncedAt: new Date() });

      res.json({
        message: `WooCommerce sync completed. ${deleted > 0 ? `Removed ${deleted} deleted/cancelled orders. ` : ''}${clientsRecalculated > 0 ? `Recalculated ${clientsRecalculated} client totals. ` : ''}${autoMatched > 0 ? `Auto-matched ${autoMatched} orders. ` : ''}${commissionsCalculated > 0 ? `Calculated ${commissionsCalculated} commissions.` : ''}`,
        synced,
        matched,
        autoMatched,
        commissionsCalculated,
        total: wooOrders.length,
      });
    } catch (error: any) {
      console.error("WooCommerce sync error:", error);
      console.error("Error details:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      res.status(500).json({
        message: error.response?.data?.message || error.message || "Sync failed",
        total: 0,
        synced: 0,
        matched: 0
      });
    }
  });
}

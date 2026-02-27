import type { Express } from "express";
import type { OrdersCoreRouteDeps } from "./ordersCore.types";
import { storage } from "../../storage";

export function registerOrdersCorePatchRoute(app: Express, deps: OrdersCoreRouteDeps): void {
  // Update order (for commission type and amount)
  app.patch('/api/orders/:orderId', deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
      try {
          const { orderId } = req.params;
          const tenantId = req.user.tenantId;
          const { commissionType, commissionAmount } = req.body;
          const updates: any = {};
          if (commissionType !== undefined)
              updates.commissionType = commissionType;
          if (commissionAmount !== undefined)
              updates.commissionAmount = commissionAmount;
          const updatedOrder = await storage.updateOrder(orderId, tenantId, updates);
          if (!updatedOrder) {
              return res.status(404).json({ message: "Order not found" });
          }
          res.json(updatedOrder);
      }
      catch (error: any) {
          console.error("Error updating order:", error);
          res.status(500).json({ message: error.message || "Failed to update order" });
      }
  });
}

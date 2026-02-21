import type { Express } from "express";
import { z } from "zod";
import { storage } from "../../storage";

const wooCommerceSchema = z.object({
  url: z.string().url("Invalid URL"),
  consumerKey: z.string().min(1, "Consumer key is required"),
  consumerSecret: z.string().min(1, "Consumer secret is required"),
});

export function registerWooCommerceSettingsRoutes(
  app: Express,
  deps: { isAdmin: any; isAuthenticatedCustom: any },
): void {
  app.get('/api/woocommerce/settings', deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const integration = await storage.getUserIntegration(userId);
      res.json({
        url: integration?.wooUrl || "",
        consumerKey: integration?.wooConsumerKey || "",
        consumerSecret: integration?.wooConsumerSecret || "",
        lastSyncedAt: integration?.wooLastSyncedAt || null
      });
    } catch (error: any) {
      console.error("Error fetching WooCommerce settings:", error);
      res.status(500).json({ message: error.message || "Failed to fetch settings" });
    }
  });

  app.put('/api/woocommerce/settings', deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const validation = wooCommerceSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: validation.error.errors[0].message });
      }

      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const { url, consumerKey, consumerSecret } = validation.data;

      await storage.updateUserIntegration(userId, {
        wooUrl: url,
        wooConsumerKey: consumerKey,
        wooConsumerSecret: consumerSecret
      }, req.user.tenantId);

      res.json({ message: "WooCommerce settings updated successfully" });
    } catch (error: any) {
      console.error("Error updating WooCommerce settings:", error);
      res.status(500).json({ message: error.message || "Failed to update settings" });
    }
  });
}
